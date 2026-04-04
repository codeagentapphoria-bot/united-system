import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { getAccessTokenCookieName, getRefreshTokenCookieName } from '../utils/cookies';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    username?: string;
    role: string;
    type: 'admin' | 'resident' | 'dev';
  };
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET must be set in environment variables and be at least 32 characters long'
  );
}

// =============================================================================
// verifyToken
// Reads access token from cookie (primary) or Authorization header (fallback).
// If the access token is missing or expired but a valid refresh token exists,
// attempts automatic token rotation before returning 401.
// =============================================================================
export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const accessTokenCookieName = getAccessTokenCookieName();
    token = req.cookies[accessTokenCookieName];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // No access token — try to refresh using the refresh token cookie
    if (!token) {
      const refreshTokenCookieName = getRefreshTokenCookieName();
      const refreshToken = req.cookies[refreshTokenCookieName];

      if (refreshToken) {
        try {
          // Fast-path: dev tokens are not stored in DB
          let isDevToken = false;
          try {
            const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
              id: string;
              email?: string;
              role: string;
              type: 'admin' | 'resident' | 'dev';
            };

            if (decoded.type === 'dev') {
              isDevToken = true;
              const { generateToken, generateRefreshToken } = await import('../utils/jwt');
              const { setAccessTokenCookie, setRefreshTokenCookie } =
                await import('../utils/cookies');

              const newAccessToken = generateToken({
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                type: 'dev',
              });
              const newRefreshToken = generateRefreshToken({
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                type: 'dev',
              });

              setAccessTokenCookie(res, newAccessToken);
              setRefreshTokenCookie(res, newRefreshToken);
              token = newAccessToken;
            }
          } catch {
            // Not a dev token, proceed to DB-backed refresh
          }

          if (!isDevToken) {
            const { findRefreshToken } = await import('../services/refreshToken.service');
            const { getCurrentUser } = await import('../services/auth.service');
            const { generateToken, generateRefreshToken } = await import('../utils/jwt');
            const { setAccessTokenCookie, setRefreshTokenCookie } =
              await import('../utils/cookies');
            const { createRefreshToken, revokeRefreshToken } =
              await import('../services/refreshToken.service');
            const { createOrUpdateSession } = await import('../middleware/sessionTimeout');

            const dbToken = await findRefreshToken(refreshToken);
            if (dbToken) {
              const userId = dbToken.userId || dbToken.residentId;
              if (userId) {
                const userType = dbToken.userId ? 'admin' : 'resident';
                const user = await getCurrentUser(userId, userType);

                const tokenPayload =
                  userType === 'admin'
                    ? {
                        id: userId,
                        email: (user as any).email,
                        role: (user as any).role,
                        type: 'admin' as const,
                      }
                    : {
                        id: userId,
                        username: (user as any).username,
                        role: 'resident',
                        type: 'resident' as const,
                      };

                const newAccessToken = generateToken(tokenPayload);
                const newRefreshToken = generateRefreshToken(tokenPayload);

                await revokeRefreshToken(dbToken.id, 'Token rotated');

                const deviceMeta = {
                  deviceInfo: JSON.stringify({
                    userAgent: req.headers['user-agent'],
                    ipAddress: req.ip || req.socket.remoteAddress,
                  }),
                  ipAddress: req.ip || req.socket.remoteAddress,
                  userAgent: req.headers['user-agent'],
                };

                const newDbToken = await createRefreshToken({
                  userId: dbToken.userId || undefined,
                  residentId: dbToken.residentId || undefined,
                  token: newRefreshToken,
                  ...deviceMeta,
                });

                setAccessTokenCookie(res, newAccessToken);
                setRefreshTokenCookie(res, newRefreshToken);

                await createOrUpdateSession(
                  userId,
                  userType,
                  newDbToken.id,
                  req
                );

                token = newAccessToken;
              }
            }
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
    }

    if (!token) {
      res.status(401).json({ status: 'error', message: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email?: string;
      username?: string;
      role: string;
      type: 'admin' | 'resident' | 'dev';
    };

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

// =============================================================================
// verifyAdmin — requires admin portal token
// =============================================================================
export const verifyAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await verifyToken(req, res, () => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }
    if (req.user.type !== 'admin') {
      res.status(403).json({ status: 'error', message: 'Admin access required' });
      return;
    }
    next();
  });
};

// =============================================================================
// verifyDev — requires developer token
// =============================================================================
export const verifyDev = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await verifyToken(req, res, () => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }
    if (req.user.type !== 'dev') {
      res.status(403).json({ status: 'error', message: 'Developer access required' });
      return;
    }
    next();
  });
};

// =============================================================================
// verifyResident — requires portal resident token (replaces verifySubscriber)
// Also validates that the resident account still exists and is not blocked.
// =============================================================================
export const verifyResident = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await verifyToken(req, res, async () => {
      if (req.user?.type !== 'resident') {
        res.status(403).json({ status: 'error', message: 'Resident access required' });
        return;
      }

      if (req.user?.id) {
        const resident = await prisma.resident.findUnique({
          where: { id: req.user.id },
          select: { id: true, status: true },
        });

        if (!resident) {
          res.status(401).json({ status: 'error', message: 'Resident account not found' });
          return;
        }

        if (resident.status === 'inactive') {
          res.status(403).json({
            status: 'error',
            message: 'Account is inactive. Please contact an administrator.',
          });
          return;
        }

        if (resident.status === 'deceased' || resident.status === 'moved_out') {
          res.status(403).json({
            status: 'error',
            message: 'Account is no longer active.',
          });
          return;
        }
      }

      next();
    });
  } catch {
    res.status(401).json({ status: 'error', message: 'Authentication required' });
  }
};

// Keep the old name as an alias for backward compatibility during migration
export const verifySubscriber = verifyResident;

// =============================================================================
// optionalAuth — does not fail if no token is present
// =============================================================================
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const accessTokenCookieName = getAccessTokenCookieName();
    token = req.cookies[accessTokenCookieName];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email?: string;
        username?: string;
        role: string;
        type: 'admin' | 'resident' | 'dev';
      };
      req.user = decoded;
    }
    next();
  } catch {
    next();
  }
};

// =============================================================================
// requireRole — simple role string check
// =============================================================================
export const requireRole = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ status: 'error', message: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

// =============================================================================
// requirePermission — RBAC permission check (admin only)
// =============================================================================
export const requirePermission = (resource: string, action: 'read' | 'all') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || req.user.type !== 'admin') {
      res.status(403).json({ status: 'error', message: 'Admin access required' });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      });

      if (!user) {
        res.status(401).json({ status: 'error', message: 'User not found' });
        return;
      }

      const hasPermission = user.userRoles.some((userRole: any) =>
        userRole.role.rolePermissions.some(
          (rp: any) =>
            rp.permission.resource === resource &&
            (rp.permission.action === 'ALL' ||
              (action === 'read' && rp.permission.action === 'READ'))
        )
      );

      if (!hasPermission) {
        res.status(403).json({ status: 'error', message: 'Insufficient permissions' });
        return;
      }

      next();
    } catch {
      res.status(500).json({ status: 'error', message: 'Error checking permissions' });
    }
  };
};
