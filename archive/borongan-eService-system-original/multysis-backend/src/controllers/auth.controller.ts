import { Request, Response } from 'express';
import { logFailedLogin, logSuccessfulLogin } from '../middleware/audit';
import { AuthRequest } from '../middleware/auth';
import { createOrUpdateSession } from '../middleware/sessionTimeout';
import { addDevLog } from '../services/dev.service';
import {
  adminLogin,
  getCurrentUser,
  portalLogin,
  portalSignup,
  verifyPortalCredentials,
  verifyPortalOtp,
} from '../services/auth.service';
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
  unlinkGoogleAccount,
  loginWithSupabaseGoogle,
} from '../services/oauth.service';

/**
 * Extract device information from request
 */
const getDeviceInfo = (
  req: Request
): { deviceInfo?: string; ipAddress?: string; userAgent?: string } => {
  const ipAddress =
    req.ip || req.socket.remoteAddress || (req.headers['x-forwarded-for'] as string) || undefined;
  const userAgent = req.headers['user-agent'] || undefined;

  // Create device info JSON string
  const deviceInfo = JSON.stringify({
    userAgent,
    ipAddress,
    platform: req.headers['sec-ch-ua-platform'] || undefined,
  });

  return {
    deviceInfo,
    ipAddress,
    userAgent,
  };
};

export const adminLoginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const deviceInfo = getDeviceInfo(req);

    const result = await adminLogin({
      email,
      password,
      ...deviceInfo,
    });

    // Set HTTP-only cookies
    setAccessTokenCookie(res, result.token);
    setRefreshTokenCookie(res, result.refreshToken);

    // Create or update session
    // Note: We need to get the refresh token ID from the database
    // For now, we'll create the session after storing the refresh token
    // The refresh token service returns the token ID, but we need to get it
    // For simplicity, we'll find the most recent refresh token for this user
    const { findRefreshToken } = await import('../services/refreshToken.service');
    const dbRefreshToken = await findRefreshToken(result.refreshToken);
    if (dbRefreshToken) {
      await createOrUpdateSession(result.user.id, 'admin', dbRefreshToken.id, req);
    }

    // Log successful login
    logSuccessfulLogin(result.user.id, 'admin', req);
    addDevLog('info', 'Admin login successful', {
      userId: result.user.id,
      email: result.user.email,
      ip: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
    });

    // Return user data (tokens are in cookies)
    res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
      },
    });
  } catch (error: any) {
    // Log failed login attempt
    logFailedLogin(req.body.email || 'unknown', req, error.message || 'Invalid credentials');
    addDevLog('error', 'Admin login failed', {
      email: req.body.email || 'unknown',
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      error: error.message || 'Invalid credentials',
    });

    res.status(401).json({
      status: 'error',
      message: error.message || 'Login failed',
    });
  }
};

export const verifyPortalCredentialsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { phoneNumber, password } = req.body;

    const result = await verifyPortalCredentials({
      phoneNumber,
      password,
    });

    // Return success response
    res.status(200).json({
      status: 'success',
      message: result.otpRequired ? 'OTP sent successfully' : 'Credentials verified successfully',
      data: {
        subscriber: result.subscriber,
        otpRequired: result.otpRequired,
      },
    });
  } catch (error: any) {
    // Log failed login attempt
    logFailedLogin(req.body.phoneNumber || 'unknown', req, error.message || 'Invalid credentials');
    addDevLog('error', 'Portal credentials verification failed', {
      phoneNumber: req.body.phoneNumber || 'unknown',
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      error: error.message || 'Invalid credentials',
    });

    res.status(401).json({
      status: 'error',
      message: error.message || 'Verification failed',
    });
  }
};

export const verifyPortalOtpController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, otp } = req.body;
    const deviceInfo = getDeviceInfo(req);

    const result = await verifyPortalOtp({
      phoneNumber,
      otp,
      ...deviceInfo,
    });

    // Set HTTP-only cookies
    setAccessTokenCookie(res, result.token);
    setRefreshTokenCookie(res, result.refreshToken);

    // Create or update session
    const { findRefreshToken } = await import('../services/refreshToken.service');
    const dbRefreshToken = await findRefreshToken(result.refreshToken);
    if (dbRefreshToken) {
      await createOrUpdateSession(result.subscriber.id, 'subscriber', dbRefreshToken.id, req);
    }

    // Log successful login
    logSuccessfulLogin(result.subscriber.id, 'subscriber', req);
    addDevLog('info', 'Portal OTP login successful', {
      subscriberId: result.subscriber.id,
      phoneNumber: result.subscriber.phoneNumber,
      ip: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
    });

    // Return subscriber data (tokens are in cookies)
    res.status(200).json({
      status: 'success',
      data: {
        subscriber: result.subscriber,
      },
    });
  } catch (error: any) {
    // Log failed login attempt
    logFailedLogin(
      req.body.phoneNumber || 'unknown',
      req,
      error.message || 'OTP verification failed'
    );
    addDevLog('error', 'Portal OTP verification failed', {
      phoneNumber: req.body.phoneNumber || 'unknown',
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      error: error.message || 'OTP verification failed',
    });

    res.status(401).json({
      status: 'error',
      message: error.message || 'OTP verification failed',
    });
  }
};

export const portalLoginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phoneNumber, password } = req.body;
    const deviceInfo = getDeviceInfo(req);

    const result = await portalLogin({
      phoneNumber,
      password,
      ...deviceInfo,
    });

    // Set HTTP-only cookies
    setAccessTokenCookie(res, result.token);
    setRefreshTokenCookie(res, result.refreshToken);

    // Create or update session
    const { findRefreshToken } = await import('../services/refreshToken.service');
    const dbRefreshToken = await findRefreshToken(result.refreshToken);
    if (dbRefreshToken) {
      await createOrUpdateSession(result.subscriber.id, 'subscriber', dbRefreshToken.id, req);
    }

    // Log successful login
    logSuccessfulLogin(result.subscriber.id, 'subscriber', req);
    addDevLog('info', 'Portal login successful', {
      subscriberId: result.subscriber.id,
      phoneNumber: result.subscriber.phoneNumber,
      ip: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
    });

    // Return subscriber data (tokens are in cookies)
    res.status(200).json({
      status: 'success',
      data: {
        subscriber: result.subscriber,
      },
    });
  } catch (error: any) {
    // Log failed login attempt
    logFailedLogin(req.body.phoneNumber || 'unknown', req, error.message || 'Invalid credentials');
    addDevLog('error', 'Portal login failed', {
      phoneNumber: req.body.phoneNumber || 'unknown',
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      error: error.message || 'Invalid credentials',
    });

    res.status(401).json({
      status: 'error',
      message: error.message || 'Login failed',
    });
  }
};

export const portalSignupController = async (req: Request, res: Response): Promise<void> => {
  try {
    const deviceInfo = getDeviceInfo(req);
    const result = await portalSignup({
      ...req.body,
      ...deviceInfo,
    });

    // Set HTTP-only cookies
    setAccessTokenCookie(res, result.token);
    setRefreshTokenCookie(res, result.refreshToken);

    // Create or update session
    const { findRefreshToken } = await import('../services/refreshToken.service');
    const dbRefreshToken = await findRefreshToken(result.refreshToken);
    if (dbRefreshToken) {
      await createOrUpdateSession(result.subscriber.id, 'subscriber', dbRefreshToken.id, req);
    }

    // Return subscriber data (tokens are in cookies)
    res.status(201).json({
      status: 'success',
      data: {
        subscriber: result.subscriber,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Signup failed',
    });
  }
};

export const logoutController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Revoke all refresh tokens for this user
    if (req.user) {
      if (req.user.type === 'admin') {
        await revokeAllUserTokens(req.user.id, undefined, 'User logout');
      } else {
        await revokeAllUserTokens(undefined, req.user.id, 'User logout');
      }

      // Log logout event
      addDevLog('info', 'User logged out', {
        userId: req.user.id,
        userType: req.user.type,
        email: req.user.email,
        phoneNumber: req.user.phoneNumber,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    }

    // Clear cookies
    clearAuthCookies(res);

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    // Even if revocation fails, clear cookies
    clearAuthCookies(res);

    // Log logout error
    if (req.user) {
      addDevLog('warn', 'Logout completed with errors', {
        userId: req.user.id,
        userType: req.user.type,
        error: error.message,
        ip: req.ip || req.socket.remoteAddress,
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  }
};

export const getCurrentUserController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Not authenticated',
      });
      return;
    }

    const user = await getCurrentUser(req.user.id, req.user.type);
    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'User not found',
    });
  }
};

export const refreshTokenController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Read refresh token from cookie
    const refreshTokenCookieName = getRefreshTokenCookieName();
    const refreshToken = req.cookies[refreshTokenCookieName];

    if (!refreshToken) {
      res.status(401).json({
        status: 'error',
        message: 'No refresh token provided',
      });
      return;
    }

    // Find and validate refresh token from database
    const dbToken = await findRefreshToken(refreshToken);
    if (!dbToken) {
      clearAuthCookies(res);
      res.status(401).json({
        status: 'error',
        message: 'Invalid or expired refresh token',
      });
      return;
    }

    // Determine user type and get user ID
    const userId = dbToken.userId || dbToken.subscriberId;
    if (!userId) {
      clearAuthCookies(res);
      res.status(401).json({
        status: 'error',
        message: 'Invalid token data',
      });
      return;
    }

    // Get user data to generate new tokens
    const user = await getCurrentUser(userId, dbToken.userId ? 'admin' : 'subscriber');

    // Generate new access token
    const tokenPayload: TokenPayload = dbToken.userId
      ? {
          id: userId,
          email: (user as any).email,
          role: (user as any).role,
          type: 'admin',
        }
      : {
          id: userId,
          phoneNumber: (user as any).phoneNumber,
          role: 'subscriber',
          type: 'subscriber',
        };

    const newAccessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    // Revoke old refresh token (rotation)
    await revokeRefreshToken(dbToken.id, 'Token rotated');

    // Store new refresh token in database
    const deviceInfo = getDeviceInfo(req);
    await createRefreshToken({
      userId: dbToken.userId || undefined,
      subscriberId: dbToken.subscriberId || undefined,
      token: newRefreshToken,
      ...deviceInfo,
    });

    // Set new cookies
    setAccessTokenCookie(res, newAccessToken);
    setRefreshTokenCookie(res, newRefreshToken);

    // Create or update session with new refresh token
    const newDbRefreshToken = await findRefreshToken(newRefreshToken);
    if (newDbRefreshToken) {
      await createOrUpdateSession(
        userId,
        dbToken.userId ? 'admin' : 'subscriber',
        newDbRefreshToken.id,
        req
      );
    }

    // Log successful token refresh
    addDevLog('info', 'Token refreshed successfully', {
      userId,
      userType: dbToken.userId ? 'admin' : 'subscriber',
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    // Return minimal response (tokens are in cookies)
    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
    });
  } catch (error: any) {
    // Log token refresh failure
    addDevLog('error', 'Token refresh failed', {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      error: error.message || 'Token refresh failed',
    });

    clearAuthCookies(res);
    res.status(401).json({
      status: 'error',
      message: error.message || 'Token refresh failed',
    });
  }
};

/**
 * Get Socket.io authentication token
 * Returns the current access token for Socket.io connection
 */
export const getSocketTokenController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    // Regenerate token from req.user (which was set by verifyToken middleware)
    // This ensures we always have a valid token, even if cookies weren't available
    const { generateToken } = await import('../utils/jwt');

    const tokenPayload = {
      id: req.user.id,
      email: req.user.email,
      phoneNumber: req.user.phoneNumber,
      role: req.user.role,
      type: req.user.type,
    };

    const token = generateToken(tokenPayload);

    // Return token for Socket.io authentication
    res.status(200).json({
      status: 'success',
      data: {
        token,
      },
    });
  } catch (error: any) {
    res.status(401).json({
      status: 'error',
      message: error.message || 'Failed to get socket token',
    });
  }
};

/**
 * Initiate Google OAuth flow for portal
 * Redirects to Google's OAuth consent screen
 */
export const googleLoginInitiateController = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUrl = getGoogleAuthUrl();
    
    // Log the OAuth initiation
    addDevLog('info', 'Google OAuth initiated for portal', {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    });

    // Redirect to Google
    res.redirect(authUrl);
  } catch (error: any) {
    addDevLog('error', 'Google OAuth initiation failed', {
      ip: req.ip || req.socket.remoteAddress,
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to initiate Google login',
    });
  }
};

/**
 * Handle Google OAuth callback for portal
 * Returns error if Google account is not registered to any subscriber
 */
export const googleCallbackController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      addDevLog('warn', 'Google OAuth error', {
        error,
        error_description,
        ip: req.ip || req.socket.remoteAddress,
      });

      // Redirect to login page with error
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/login?google_error=${encodeURIComponent(error_description as string || error as string)}`);
      return;
    }

    if (!code) {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/login?google_error=No authorization code received`);
      return;
    }

    const deviceInfo = getDeviceInfo(req);

    // Attempt Google login
    const result = await googlePortalLogin(
      code as string,
      deviceInfo.deviceInfo,
      deviceInfo.ipAddress,
      deviceInfo.userAgent
    );

    if (!result.success) {
      // Log failed Google login
      addDevLog('warn', 'Google OAuth login failed', {
        error: result.error,
        errorCode: result.errorCode,
        ip: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
      });

      // Redirect to login page with error
      const errorMessage = result.errorCode === 'NOT_REGISTERED' 
        ? 'not_registered'
        : 'login_failed';
      
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/login?google_error=${errorMessage}`);
      return;
    }

    // Log successful Google login
    logSuccessfulLogin(result.subscriber!.id, 'subscriber', req);
    addDevLog('info', 'Google OAuth login successful', {
      subscriberId: result.subscriber!.id,
      ip: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
    });

    // Set HTTP-only cookies
    if (result.token) setAccessTokenCookie(res, result.token);
    if (result.refreshToken) setRefreshTokenCookie(res, result.refreshToken);

    // Create or update session
    const dbRefreshToken = await findRefreshToken(result.refreshToken!);
    if (dbRefreshToken) {
      await createOrUpdateSession(result.subscriber!.id, 'subscriber', dbRefreshToken.id, req);
    }

    // Redirect to portal home (successful login)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal?google_login=success`);
  } catch (error: any) {
    addDevLog('error', 'Google OAuth callback error', {
      ip: req.ip || req.socket.remoteAddress,
      error: error.message,
    });

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/portal/login?google_error=Authentication failed`);
  }
};

/**
 * Link Google account to existing authenticated subscriber
 */
export const linkGoogleAccountController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'subscriber') {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const { code } = req.body;

    if (!code) {
      res.status(400).json({
        status: 'error',
        message: 'Authorization code is required',
      });
      return;
    }

    const result = await linkGoogleAccount(req.user.id, code);

    if (!result.success) {
      res.status(400).json({
        status: 'error',
        message: result.error || 'Failed to link Google account',
      });
      return;
    }

    addDevLog('info', 'Google account linked', {
      subscriberId: req.user.id,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.status(200).json({
      status: 'success',
      message: 'Google account linked successfully',
    });
  } catch (error: any) {
    addDevLog('error', 'Link Google account error', {
      subscriberId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to link Google account',
    });
  }
};

/**
 * Unlink Google account from authenticated subscriber
 */
export const unlinkGoogleAccountController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'subscriber') {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required',
      });
      return;
    }

    const result = await unlinkGoogleAccount(req.user.id);

    if (!result.success) {
      res.status(400).json({
        status: 'error',
        message: result.error || 'Failed to unlink Google account',
      });
      return;
    }

    addDevLog('info', 'Google account unlinked', {
      subscriberId: req.user.id,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.status(200).json({
      status: 'success',
      message: 'Google account unlinked successfully',
    });
  } catch (error: any) {
    addDevLog('error', 'Unlink Google account error', {
      subscriberId: req.user?.id,
      error: error.message,
    });

    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to unlink Google account',
    });
  }
};

/**
 * Login via Supabase Auth Google OAuth
 * Called by frontend after successful Google auth via Supabase
 */
export const supabaseGoogleLoginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { googleId, googleEmail } = req.body;

    if (!googleId || !googleEmail) {
      res.status(400).json({
        status: 'error',
        message: 'Google ID and email are required',
      });
      return;
    }

    const result = await loginWithSupabaseGoogle(googleId, googleEmail);

    if (!result.success) {
      if (result.errorCode === 'not_registered') {
        res.status(404).json({
          status: 'error',
          error: 'not_registered',
          message: 'This Google account is not registered',
        });
        return;
      }

      res.status(400).json({
        status: 'error',
        message: result.error || 'Failed to login with Google',
      });
      return;
    }

    // Set access token as HTTP-only cookie
    setAccessTokenCookie(res, result.accessToken!);

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(res, result.refreshToken!);

    // Create session
    const dbRefreshToken = await findRefreshToken(result.refreshToken!);
    if (dbRefreshToken) {
      await createOrUpdateSession(result.subscriber!.id, 'subscriber', dbRefreshToken.id, req);
    }

    addDevLog('info', 'Supabase Google login successful', {
      subscriberId: result.subscriber!.id,
      googleId,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      subscriber: result.subscriber,
    });
  } catch (error: any) {
    addDevLog('error', 'Supabase Google login error', {
      error: error.message,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to login with Google',
    });
  }
};
