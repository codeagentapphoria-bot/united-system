import { Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import {
  devLoginController,
  getDatabaseInfoController,
  getSystemInfoController,
  getSystemLogsController,
} from '../controllers/dev.controller';
import { verifyToken, type AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { addDevLog } from '../services/dev.service';

const router = Router();

// Strict rate limit for dev login endpoint
const devAuthLimiter = rateLimit({
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
    console.warn(
      `⚠️ Dev auth rate limit exceeded - ip: ${req.ip} on ${req.method} ${req.originalUrl}`
    );
    // Log to dev dashboard
    addDevLog('warn', 'Dev auth rate limit exceeded', {
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

// Lenient rate limit for authenticated dev endpoints
const devAuthenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
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
      `⚠️ Dev endpoint rate limit exceeded - ${userInfo} on ${req.method} ${req.originalUrl}`
    );

    // Log to dev dashboard
    addDevLog('warn', 'Dev endpoint rate limit exceeded', {
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

// Dev login (public, strict rate limit)
router.post(
  '/login',
  devAuthLimiter,
  validate([
    body('email').isEmail().withMessage('Invalid email address'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  devLoginController
);

// Protected dev routes (require authentication, lenient rate limit)
router.get('/logs', devAuthenticatedLimiter, verifyToken, getSystemLogsController);
router.get('/database', devAuthenticatedLimiter, verifyToken, getDatabaseInfoController);
router.get('/system', devAuthenticatedLimiter, verifyToken, getSystemInfoController);

export default router;
