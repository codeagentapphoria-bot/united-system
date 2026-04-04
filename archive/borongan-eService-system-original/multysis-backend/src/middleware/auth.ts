import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { getAccessTokenCookieName, getRefreshTokenCookieName } from '../utils/cookies';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    phoneNumber?: string;
    role: string;
    type: 'admin' | 'subscriber' | 'dev';
  };
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET must be set in environment variables and be at least 32 characters long'
  );
}

// Verify JWT token
// Reads from cookie first (primary), falls back to Authorization header (for migration)
// If access token is missing/expired but refresh token exists, attempts automatic refresh
export const verifyToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Try to get token from cookie first (primary method)
    const accessTokenCookieName = getAccessTokenCookieName();
    token = req.cookies[accessTokenCookieName];

    // Fallback to Authorization header (for migration/compatibility)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    // If no access token, try to refresh using refresh token
    if (!token) {
      const refreshTokenCookieName = getRefreshTokenCookieName();
      const refreshToken = req.cookies[refreshTokenCookieName];

      if (refreshToken) {
        // Attempt to refresh the token
        try {
          // FIRST: Quickly check if it's a dev token (fast JWT check, no DB lookup)
          // This optimization only affects dev routes and doesn't slow down admin/subscriber auth
          let isDevToken = false;
          try {
            const decoded = jwt.verify(refreshToken, JWT_SECRET) as {
              id: string;
              email?: string;
              role: string;
              type: 'admin' | 'subscriber' | 'dev';
            };

            // If it's a dev token, handle it immediately (no DB lookup needed)
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

              // Set new cookies (dev tokens aren't stored in DB, so no rotation needed)
              setAccessTokenCookie(res, newAccessToken);
              setRefreshTokenCookie(res, newRefreshToken);

              // Use the new access token
              token = newAccessToken;
            }
          } catch (jwtError) {
            // Not a valid JWT or not a dev token, continue to normal DB lookup
            // This is expected for admin/subscriber tokens
          }

          // If not a dev token, do the normal DB lookup for admin/subscriber tokens
          // This path is unchanged and won't affect existing admin/subscriber authentication
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
              const userId = dbToken.userId || dbToken.subscriberId;
              if (userId) {
                const user = await getCurrentUser(userId, dbToken.userId ? 'admin' : 'subscriber');

                const tokenPayload = dbToken.userId
                  ? {
                      id: userId,
                      email: (user as any).email,
                      role: (user as any).role,
                      type: 'admin' as const,
                    }
                  : {
                      id: userId,
                      phoneNumber: (user as any).phoneNumber,
                      role: 'subscriber',
                      type: 'subscriber' as const,
                    };

                const newAccessToken = generateToken(tokenPayload);
                const newRefreshToken = generateRefreshToken(tokenPayload);

                // Rotate refresh token
                await revokeRefreshToken(dbToken.id, 'Token rotated');

                const deviceInfo = {
                  deviceInfo: JSON.stringify({
                    userAgent: req.headers['user-agent'],
                    ipAddress: req.ip || req.socket.remoteAddress,
                  }),
                  ipAddress: req.ip || req.socket.remoteAddress,
                  userAgent: req.headers['user-agent'],
                };

                const newDbToken = await createRefreshToken({
                  userId: dbToken.userId || undefined,
                  subscriberId: dbToken.subscriberId || undefined,
                  token: newRefreshToken,
                  ...deviceInfo,
                });

                // Set new cookies
                setAccessTokenCookie(res, newAccessToken);
                setRefreshTokenCookie(res, newRefreshToken);

                // Update session
                await createOrUpdateSession(
                  userId,
                  dbToken.userId ? 'admin' : 'subscriber',
                  newDbToken.id,
                  req
                );

                // Use the new access token
                token = newAccessToken;
              }
            }
          }
        } catch (refreshError) {
          // Refresh failed, continue to return 401
          console.error('Token refresh failed:', refreshError);
        }
      }
    }

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: 'No token provided',
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email?: string;
      phoneNumber?: string;
      role: string;
      type: 'admin' | 'subscriber' | 'dev';
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }
};

// Verify admin authentication
export const verifyAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // First verify token - if it fails, verifyToken will send the response
  await verifyToken(req, res, () => {
    // Token is valid, now check if user is admin
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.type !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'Admin access required',
      });
      return;
    }

    next();
  });
};

// Verify dev authentication
export const verifyDev = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // First verify token - if it fails, verifyToken will send the response
  await verifyToken(req, res, () => {
    // Token is valid, now check if user is dev
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (req.user.type !== 'dev') {
      res.status(403).json({
        status: 'error',
        message: 'Developer access required',
      });
      return;
    }

    next();
  });
};

// Verify subscriber authentication
export const verifySubscriber = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await verifyToken(req, res, async () => {
      if (req.user?.type !== 'subscriber') {
        res.status(403).json({
          status: 'error',
          message: 'Subscriber access required',
        });
        return;
      }

      // Verify subscriber account is still active
      if (req.user?.id) {
        const subscriberGateway = await (prisma as any).subscriber.findUnique({
          where: { id: req.user.id },
          include: {
            citizen: true,
            nonCitizen: true,
          },
        });

        if (!subscriberGateway) {
          res.status(401).json({
            status: 'error',
            message: 'Subscriber not found',
          });
          return;
        }

        // Check status based on subscriber type
        if (subscriberGateway.type === 'SUBSCRIBER' && subscriberGateway.nonCitizen) {
          const status = subscriberGateway.nonCitizen.status;

          // Only allow ACTIVE subscribers to make requests
          if (status !== 'ACTIVE') {
            if (status === 'BLOCKED') {
              res.status(403).json({
                status: 'error',
                message: 'Account is blocked',
              });
              return;
            } else if (status === 'PENDING') {
              res.status(403).json({
                status: 'error',
                message: 'Account is pending activation. Please contact an administrator.',
              });
              return;
            } else if (status === 'EXPIRED') {
              res.status(403).json({
                status: 'error',
                message: 'Account subscription has expired',
              });
              return;
            } else {
              res.status(403).json({
                status: 'error',
                message: 'Account is not active. Please contact an administrator.',
              });
              return;
            }
          }
        }
        // CITIZEN type subscribers are always allowed (they don't have the same status restrictions)
      }

      next();
    });
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: 'Authentication required',
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Try to get token from cookie first
    const accessTokenCookieName = getAccessTokenCookieName();
    token = req.cookies[accessTokenCookieName];

    // Fallback to Authorization header
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
        phoneNumber?: string;
        role: string;
        type: 'admin' | 'subscriber' | 'dev';
      };
      req.user = decoded;
    }
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based access control
export const requireRole = (...roles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

// Permission-based access control
export const requirePermission = (resource: string, action: 'read' | 'all') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || req.user.type !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'Admin access required',
      });
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
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        res.status(401).json({
          status: 'error',
          message: 'User not found',
        });
        return;
      }

      // Check if user has permission
      const hasPermission = user.userRoles.some(
        (userRole: {
          role: { rolePermissions: Array<{ permission: { resource: string; action: string } }> };
        }) =>
          userRole.role.rolePermissions.some(
            (rp: { permission: { resource: string; action: string } }) =>
              rp.permission.resource === resource &&
              (rp.permission.action === 'ALL' ||
                (action === 'read' && rp.permission.action === 'READ'))
          )
      );

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: 'Insufficient permissions',
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Error checking permissions',
      });
    }
  };
};
