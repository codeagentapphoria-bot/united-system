import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  submitCitizenRegistrationController,
  getRegistrationStatusController,
  getRegistrationRequestsController,
  getRegistrationRequestByIdController,
  reviewRegistrationRequestController,
  requestResubmissionController,
  markUnderReviewController,
  deleteRejectedRegistrationsController,
  deleteRejectedRegistrationController,
} from '../controllers/citizen-registration.controller';
import { verifyAdmin, type AuthRequest } from '../middleware/auth';
import { uploadCitizenFiles } from '../middleware/upload';
import { Request, Response } from 'express';

const router = Router();

// Strict rate limit for registration endpoint
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour per IP
  message: {
    status: 'error',
    message: 'Too many registration attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    console.warn(`⚠️ Registration rate limit exceeded - ip: ${req.ip}`);
    res.status(429).json({
      status: 'error',
      message: 'Too many registration attempts. Please try again later.',
    });
  },
});

// Lenient rate limit for authenticated endpoints
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    return authReq.user?.id || req.ip || 'anonymous';
  },
});

// Public endpoints (no authentication required)
router.post(
  '/register',
  registrationLimiter,
  uploadCitizenFiles.fields([
    { name: 'idDocument', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  submitCitizenRegistrationController
);

router.get('/register/status/:phone', getRegistrationStatusController);

// Admin endpoints (authentication required)
router.get(
  '/registration-requests',
  authenticatedLimiter,
  verifyAdmin,
  getRegistrationRequestsController
);

router.get(
  '/registration-requests/:id',
  authenticatedLimiter,
  verifyAdmin,
  getRegistrationRequestByIdController
);

router.post(
  '/registration-requests/:id/review',
  authenticatedLimiter,
  verifyAdmin,
  reviewRegistrationRequestController
);

router.post(
  '/registration-requests/:id/request-docs',
  authenticatedLimiter,
  verifyAdmin,
  requestResubmissionController
);

router.patch(
  '/registration-requests/:id/under-review',
  authenticatedLimiter,
  verifyAdmin,
  markUnderReviewController
);

// Delete rejected registrations older than X days (cron job / manual admin trigger)
router.delete(
  '/registration-requests/rejected',
  authenticatedLimiter,
  verifyAdmin,
  deleteRejectedRegistrationsController
);

// Delete a specific rejected registration (manual admin action)
router.delete(
  '/registration-requests/rejected/:citizenId',
  authenticatedLimiter,
  verifyAdmin,
  deleteRejectedRegistrationController
);

export default router;
