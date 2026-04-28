import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { addDevLog } from '../services/dev.service';
import {
  adminLoginController,
  changeOwnPasswordController,
  getCurrentUserController,
  getIdCardInfoController,
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
import { verifyResident, verifyToken, type AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { portalLoginValidation } from '../validations/auth.schema';

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
    res
      .status(429)
      .json({ status: 'error', message: 'Too many login attempts, please try again later' });
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

// Per-credential rate limit — layered on top of the IP-keyed authLimiter to blunt
// distributed credential-stuffing (rotating IPs, single target credential). IP limit
// runs first so an attacker from one IP burns IP budget before touching credential budget.
// Missing credentials land in a shared bucket to deny empty-body probing.
const credentialKey = (field: 'credential' | 'email') => (req: Request): string => {
  const raw = (req.body && (req.body as Record<string, unknown>)[field]) as unknown;
  if (typeof raw !== 'string' || !raw.trim()) return 'missing-credential';
  return `${field}:${raw.trim().toLowerCase()}`;
};

const makeCredentialLimiter = (field: 'credential' | 'email') =>
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour — single-credential abuse is slow by nature
    max: 4, // Stricter limit — credential-based abuse is the primary threat vector
    message: {
      status: 'error',
      message: 'Too many login attempts for this account, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: credentialKey(field),
    skip: () => process.env.NODE_ENV !== 'production',
    handler: (req: Request, res: Response) => {
      addDevLog('warn', 'Per-credential rate limit exceeded', {
        field,
        ip: req.ip,
        path: req.originalUrl,
      });
      res.status(429).json({
        status: 'error',
        message: 'Too many login attempts for this account, please try again later',
      });
    },
  });

const portalCredentialLimiter = makeCredentialLimiter('credential');
const adminCredentialLimiter = makeCredentialLimiter('email');

// =============================================================================
// Admin auth
// =============================================================================
router.post('/admin/login', authLimiter, adminCredentialLimiter, adminLoginController);

// =============================================================================
// Portal resident auth  (username + password)
// =============================================================================
router.post('/portal/login', authLimiter, portalCredentialLimiter, validate(portalLoginValidation), portalLoginController);

// =============================================================================
// Google OAuth (portal)
// =============================================================================
router.get('/portal/google', authLimiter, googleLoginInitiateController);
router.get('/portal/google/callback', authLimiter, googleCallbackController);
router.post('/portal/google/supabase', authLimiter, supabaseGoogleLoginController);

// Google account linking (requires auth)
router.post('/portal/google/link', authenticatedLimiter, verifyToken, linkGoogleAccountController);
router.delete(
  '/portal/google/unlink',
  authenticatedLimiter,
  verifyToken,
  unlinkGoogleAccountController
);

// =============================================================================
// Common authenticated routes
// =============================================================================
router.post('/logout', authenticatedLimiter, verifyToken, logoutController);
router.get('/me', authenticatedLimiter, verifyToken, getCurrentUserController);
router.patch('/me/password', authenticatedLimiter, verifyToken, changeOwnPasswordController);
router.get('/id-card-info', authenticatedLimiter, verifyResident, getIdCardInfoController);
router.post('/refresh', authenticatedLimiter, verifyToken, refreshTokenController);
router.get('/socket-token', authenticatedLimiter, verifyToken, getSocketTokenController);

export default router;
