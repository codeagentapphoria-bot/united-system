import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { addDevLog } from '../services/dev.service';
import {
  adminLoginController,
  getCurrentUserController,
  getSocketTokenController,
  googleCallbackController,
  googleLoginInitiateController,
  linkGoogleAccountController,
  logoutController,
  portalLoginController,
  refreshTokenController,
  supabaseGoogleLoginController,
  unlinkGoogleAccountController,
} from '../controllers/auth.controller';
import { verifyToken, type AuthRequest } from '../middleware/auth';

const router = Router();

// Strict rate limit for unauthenticated auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  skip: () => process.env.NODE_ENV !== 'production',
  handler: (req: Request, res: Response) => {
    addDevLog('warn', 'Auth rate limit exceeded', {
      ip: req.ip,
      path: req.originalUrl,
    });
    res.status(429).json({ status: 'error', message: 'Too many login attempts, please try again later' });
  },
});

// Lenient rate limit for authenticated token management endpoints
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { status: 'error', message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    return authReq.user?.id || req.ip || 'anonymous';
  },
  skip: () => process.env.NODE_ENV !== 'production',
});

// =============================================================================
// Admin auth
// =============================================================================
router.post('/admin/login', authLimiter, adminLoginController);

// =============================================================================
// Portal resident auth  (username + password)
// =============================================================================
router.post('/portal/login', authLimiter, portalLoginController);

// =============================================================================
// Google OAuth (portal)
// =============================================================================
router.get('/portal/google', authLimiter, googleLoginInitiateController);
router.get('/portal/google/callback', authLimiter, googleCallbackController);
router.post('/portal/google/supabase', authLimiter, supabaseGoogleLoginController);

// Google account linking (requires auth)
router.post('/portal/google/link', authenticatedLimiter, verifyToken, linkGoogleAccountController);
router.delete('/portal/google/unlink', authenticatedLimiter, verifyToken, unlinkGoogleAccountController);

// =============================================================================
// Common authenticated routes
// =============================================================================
router.post('/logout', authenticatedLimiter, verifyToken, logoutController);
router.get('/me', authenticatedLimiter, verifyToken, getCurrentUserController);
router.post('/refresh', authenticatedLimiter, verifyToken, refreshTokenController);
router.get('/socket-token', authenticatedLimiter, verifyToken, getSocketTokenController);

export default router;
