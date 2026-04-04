/**
 * auth.controller.ts
 *
 * Authentication endpoints:
 *   Admin portal:  POST /admin/login
 *   Resident portal:
 *     POST /portal/login          (username + password)
 *     GET  /portal/google         (initiate OAuth redirect)
 *     GET  /portal/google/callback (OAuth callback)
 *     POST /portal/google/supabase (Supabase-initiated OAuth)
 *     POST /portal/google/link    (link Google to existing account)
 *     DELETE /portal/google/unlink
 *   Common:
 *     POST /logout
 *     GET  /me
 *     POST /refresh
 *     GET  /socket-token
 */

import { Request, Response } from 'express';
import { logFailedLogin, logSuccessfulLogin } from '../middleware/audit';
import { AuthRequest } from '../middleware/auth';
import { createOrUpdateSession, deleteUserSessions } from '../middleware/sessionTimeout';
import { addDevLog } from '../services/dev.service';
import { adminLogin, getCurrentUser, portalLogin } from '../services/auth.service';
import {
  createRefreshToken,
  findRefreshToken,
  revokeAllUserTokens,
  revokeRefreshToken,
} from '../services/refreshToken.service';
import {
  clearAuthCookies,
  getRefreshTokenCookieName,
  setAccessTokenCookie,
  setRefreshTokenCookie,
} from '../utils/cookies';
import type { TokenPayload } from '../utils/jwt';
import { generateRefreshToken, generateToken } from '../utils/jwt';
import {
  getGoogleAuthUrl,
  googlePortalLogin,
  linkGoogleAccount,
  loginWithSupabaseGoogle,
  unlinkGoogleAccount,
} from '../services/oauth.service';

// =============================================================================
// HELPERS
// =============================================================================

const getDeviceInfo = (req: Request) => {
  const ipAddress =
    req.ip || req.socket.remoteAddress || (req.headers['x-forwarded-for'] as string) || undefined;
  const userAgent = req.headers['user-agent'] || undefined;
  const deviceInfo = JSON.stringify({
    userAgent,
    ipAddress,
    platform: req.headers['sec-ch-ua-platform'] || undefined,
  });
  return { deviceInfo, ipAddress, userAgent };
};

const PORTAL_URL = process.env.PORTAL_URL || 'http://localhost:5174';

// =============================================================================
// ADMIN LOGIN  (email + password)
// =============================================================================

export const adminLoginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const device = getDeviceInfo(req);

    const result = await adminLogin({ email, password, ...device });

    setAccessTokenCookie(res, result.token);
    setRefreshTokenCookie(res, result.refreshToken);

    const dbToken = await findRefreshToken(result.refreshToken);
    if (dbToken) {
      await createOrUpdateSession(result.user.id, 'admin', dbToken.id, req);
    }

    logSuccessfulLogin(result.user.id, 'admin', req);
    addDevLog('info', 'Admin login successful', {
      userId: result.user.id,
      email: result.user.email,
      ip: device.ipAddress,
    });

    res.status(200).json({ status: 'success', data: { user: result.user } });
  } catch (error: any) {
    logFailedLogin(req.body?.email || 'unknown', req, error.message || 'Invalid credentials');
    res.status(401).json({ status: 'error', message: error.message || 'Invalid credentials' });
  }
};

// =============================================================================
// PORTAL LOGIN  (username + password)
// =============================================================================

export const portalLoginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const device = getDeviceInfo(req);

    const result = await portalLogin({ username, password, ...device });

    setAccessTokenCookie(res, result.token);
    setRefreshTokenCookie(res, result.refreshToken);

    const dbToken = await findRefreshToken(result.refreshToken);
    if (dbToken) {
      await createOrUpdateSession(result.resident.id as string, 'resident', dbToken.id, req);
    }

    logSuccessfulLogin(result.resident.id as string, 'resident', req);
    addDevLog('info', 'Portal login successful', {
      residentId: result.resident.id,
      username: result.resident.username,
      ip: device.ipAddress,
    });

    res.status(200).json({ status: 'success', data: { resident: result.resident } });
  } catch (error: any) {
    logFailedLogin(req.body?.username || 'unknown', req, error.message || 'Invalid credentials');
    res.status(401).json({ status: 'error', message: error.message || 'Invalid credentials' });
  }
};

// =============================================================================
// GOOGLE OAUTH — initiate redirect
// =============================================================================

export const googleLoginInitiateController = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const url = getGoogleAuthUrl();
    res.redirect(url);
  } catch (error: any) {
    res.redirect(`${PORTAL_URL}/portal/login?google_error=failed`);
  }
};

// =============================================================================
// GOOGLE OAUTH — callback (backend redirect flow)
// =============================================================================

export const googleCallbackController = async (req: Request, res: Response): Promise<void> => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${PORTAL_URL}/portal/login?google_error=access_denied`) as any;
  }

  const device = getDeviceInfo(req);
  const result = await googlePortalLogin(
    code as string,
    device.deviceInfo,
    device.ipAddress,
    device.userAgent
  );

  if (!result.success || !result.token || !result.refreshToken) {
    const errorCode = result.errorCode || 'failed';
    return res.redirect(`${PORTAL_URL}/portal/login?google_error=${errorCode}`) as any;
  }

  setAccessTokenCookie(res, result.token);
  setRefreshTokenCookie(res, result.refreshToken);

  res.redirect(`${PORTAL_URL}/portal?google_login=success`);
};

// =============================================================================
// GOOGLE OAUTH — Supabase-initiated (frontend sends googleId + googleEmail)
// =============================================================================

export const supabaseGoogleLoginController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { googleId, googleEmail } = req.body;
    const device = getDeviceInfo(req);

    const result = await loginWithSupabaseGoogle(
      googleId,
      googleEmail,
      device.deviceInfo,
      device.ipAddress,
      device.userAgent
    );

    if (!result.success || !result.token || !result.refreshToken) {
      const status = result.errorCode === 'NOT_REGISTERED' ? 404 : 401;
      res.status(status).json({ status: 'error', error: result.errorCode, message: result.error });
      return;
    }

    setAccessTokenCookie(res, result.token);
    setRefreshTokenCookie(res, result.refreshToken);

    const dbToken = await findRefreshToken(result.refreshToken);
    if (dbToken && result.resident) {
      await createOrUpdateSession(
        (result.resident as any).id,
        'resident',
        dbToken.id,
        req
      );
    }

    res.status(200).json({ status: 'success', data: { resident: result.resident } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Google login failed' });
  }
};

// =============================================================================
// LINK GOOGLE ACCOUNT  (authenticated resident)
// =============================================================================

export const linkGoogleAccountController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.body;
    const residentId = req.user?.id;

    if (!residentId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const result = await linkGoogleAccount(residentId, code);
    if (!result.success) {
      res.status(400).json({ status: 'error', message: result.error });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Google account linked successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to link Google account' });
  }
};

// =============================================================================
// UNLINK GOOGLE ACCOUNT  (authenticated resident)
// =============================================================================

export const unlinkGoogleAccountController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const residentId = req.user?.id;

    if (!residentId) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const result = await unlinkGoogleAccount(residentId);
    if (!result.success) {
      res.status(400).json({ status: 'error', message: result.error });
      return;
    }

    res.status(200).json({ status: 'success', message: 'Google account unlinked successfully' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to unlink Google account' });
  }
};

// =============================================================================
// LOGOUT  (revoke all tokens + clear cookies)
// =============================================================================

export const logoutController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (user?.id) {
      if (user.type === 'admin') {
        await revokeAllUserTokens(user.id, undefined, 'User logout');
        await deleteUserSessions(user.id, undefined);
      } else if (user.type === 'resident') {
        await revokeAllUserTokens(undefined, user.id, 'User logout');
        await deleteUserSessions(undefined, user.id);
      }
    }

    clearAuthCookies(res);
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error: any) {
    clearAuthCookies(res);
    res.status(200).json({ status: 'success', message: 'Logged out' });
  }
};

// =============================================================================
// GET CURRENT USER  (/me)
// =============================================================================

export const getCurrentUserController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    const user = await getCurrentUser(req.user.id, req.user.type);
    const key = req.user.type === 'admin' ? 'user' : 'resident';
    res.status(200).json({ status: 'success', data: { [key]: user } });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message });
  }
};

// =============================================================================
// REFRESH TOKEN  (rotate tokens)
// =============================================================================

export const refreshTokenController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const refreshTokenCookieName = getRefreshTokenCookieName();
    const refreshTokenValue = req.cookies[refreshTokenCookieName];

    if (!refreshTokenValue) {
      res.status(401).json({ status: 'error', message: 'No refresh token provided' });
      return;
    }

    const dbToken = await findRefreshToken(refreshTokenValue);
    if (!dbToken) {
      res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
      return;
    }

    const userId = dbToken.userId || dbToken.residentId;
    if (!userId) {
      res.status(401).json({ status: 'error', message: 'Invalid refresh token' });
      return;
    }

    const userType = dbToken.userId ? 'admin' : 'resident';
    const user = await getCurrentUser(userId, userType);
    const device = getDeviceInfo(req);

    const tokenPayload: TokenPayload =
      userType === 'admin'
        ? { id: userId, email: (user as any).email, role: (user as any).role, type: 'admin' }
        : {
            id: userId,
            username: (user as any).username,
            role: 'resident',
            type: 'resident',
          };

    const newAccessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await revokeRefreshToken(dbToken.id, 'Token rotated');

    const newDbToken = await createRefreshToken({
      userId: dbToken.userId || undefined,
      residentId: dbToken.residentId || undefined,
      token: newRefreshToken,
      ...device,
    });

    setAccessTokenCookie(res, newAccessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    await createOrUpdateSession(userId, userType, newDbToken.id, req);

    const key = userType === 'admin' ? 'user' : 'resident';
    res.status(200).json({ status: 'success', data: { [key]: user } });
  } catch (error: any) {
    res.status(401).json({ status: 'error', message: 'Token refresh failed' });
  }
};

// =============================================================================
// SOCKET TOKEN  (short-lived token for Socket.io auth)
// =============================================================================

export const getSocketTokenController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    // Generate a very short-lived token for socket auth (5 minutes)
    const socketToken = generateToken({
      id: req.user.id,
      role: req.user.role,
      type: req.user.type,
    });

    res.status(200).json({ status: 'success', data: { token: socketToken } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Failed to generate socket token' });
  }
};
