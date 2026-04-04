import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { addDevLog } from '../services/dev.service';
import {
  adminLoginController,
  getCurrentUserController,
  getSocketTokenController,
  logoutController,
  portalLoginController,
  portalSignupController,
  refreshTokenController,
  verifyPortalCredentialsController,
  verifyPortalOtpController,
  googleLoginInitiateController,
  googleCallbackController,
  linkGoogleAccountController,
  unlinkGoogleAccountController,
  supabaseGoogleLoginController,
} from '../controllers/auth.controller';
import { verifyToken, type AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  adminLoginValidation,
  portalLoginValidation,
  portalSignupValidation,
  verifyCredentialsValidation,
  verifyOtpValidation,
} from '../validations/auth.schema';

const router = Router();

// Strict rate limit for authentication endpoints (login/signup only)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP for auth endpoints (user not authenticated yet)
    return req.ip || 'unknown';
  },
  skip: (_req) => process.env.NODE_ENV !== 'production',
  handler: (req: Request, res: Response) => {
    console.warn(`⚠️ Auth rate limit exceeded - ip: ${req.ip} on ${req.method} ${req.originalUrl}`);
    // Log to dev dashboard
    addDevLog('warn', 'Auth rate limit exceeded', {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      path: req.originalUrl,
      method: req.method,
    });
    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts, please try again later',
    });
  },
});

// Lenient rate limit for authenticated endpoints (me, refresh, logout)
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window (allows frequent page refreshes)
  message: {
    status: 'error',
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    const authReq = req as AuthRequest;
    return authReq.user?.id || req.ip || 'anonymous';
  },
  skip: (_req) => process.env.NODE_ENV !== 'production',
  handler: (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const userInfo = authReq.user ? `user: ${authReq.user.id}` : `ip: ${req.ip}`;

    console.warn(
      `⚠️ Auth endpoint rate limit exceeded - ${userInfo} on ${req.method} ${req.originalUrl}`
    );

    // Log to dev dashboard
    addDevLog('warn', 'Auth endpoint rate limit exceeded', {
      userId: authReq.user?.id,
      userType: authReq.user?.type,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      path: req.originalUrl,
      method: req.method,
    });

    res.status(429).json({
      status: 'error',
      message: 'Too many requests, please try again later',
    });
  },
});

// Admin authentication (strict rate limit)
router.post('/admin/login', authLimiter, validate(adminLoginValidation), adminLoginController);

// Portal authentication (strict rate limit)
router.post('/portal/login', authLimiter, validate(portalLoginValidation), portalLoginController);
router.post(
  '/portal/signup',
  authLimiter,
  validate(portalSignupValidation),
  portalSignupController
);

// Portal 2FA authentication (strict rate limit)
router.post(
  '/portal/verify-credentials',
  authLimiter,
  validate(verifyCredentialsValidation),
  verifyPortalCredentialsController
);
router.post(
  '/portal/verify-otp',
  authLimiter,
  validate(verifyOtpValidation),
  verifyPortalOtpController
);

// Google OAuth for portal (strict rate limit)
router.get('/portal/google', authLimiter, googleLoginInitiateController);
router.get('/portal/google/callback', authLimiter, googleCallbackController);

// Supabase Auth Google OAuth (for frontend Supabase Auth flow)
router.post('/portal/google/supabase', authLimiter, supabaseGoogleLoginController);

// Google account management (require authentication)
router.post('/portal/google/link', authenticatedLimiter, verifyToken, linkGoogleAccountController);
router.delete('/portal/google/unlink', authenticatedLimiter, verifyToken, unlinkGoogleAccountController);

// Common routes (require authentication, lenient rate limit)
router.post('/logout', authenticatedLimiter, verifyToken, logoutController);
router.get('/me', authenticatedLimiter, verifyToken, getCurrentUserController);
router.post('/refresh', authenticatedLimiter, verifyToken, refreshTokenController);
router.get('/socket-token', authenticatedLimiter, verifyToken, getSocketTokenController);

export default router;
