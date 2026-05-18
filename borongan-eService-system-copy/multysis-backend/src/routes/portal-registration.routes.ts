/**
 * portal-registration.routes.ts
 *
 * Routes for resident self-registration and the BIMS admin review workflow.
 * Replaces: citizen-registration.routes.ts
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAdmin } from '../middleware/auth';
import {
  deleteRejectedController,
  getRegistrationRequestController,
  getRegistrationStatusController,
  listRegistrationRequestsController,
  markUnderReviewController,
  resubmitHandler,
  requestResubmissionController,
  reviewRegistrationController,
  submitRegistrationController,
} from '../controllers/portal-registration.controller';

const router = Router();

// Rate limit: 3 registration submissions per hour per IP
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { status: 'error', message: 'Too many registration attempts, please try again later' },
  skip: () => process.env.NODE_ENV !== 'production',
});

// =============================================================================
// PUBLIC (no auth required)
// =============================================================================

// Submit registration
router.post('/register', registrationLimiter, submitRegistrationController);

// Check registration status by username
router.get('/status/:username', getRegistrationStatusController);

// Resident re-uploads documents after resubmission request
router.post('/resubmit', resubmitHandler);

// =============================================================================
// BIMS ADMIN (verifyAdmin — eservice_users admin token)
// =============================================================================

// List all registration requests
router.get('/requests', verifyAdmin, listRegistrationRequestsController);

// Get single registration request
router.get('/requests/:id', verifyAdmin, getRegistrationRequestController);

// Mark under review
router.patch('/requests/:id/under-review', verifyAdmin, markUnderReviewController);

// Approve or reject
router.post('/requests/:id/review', verifyAdmin, reviewRegistrationController);

// Request resubmission
router.post('/requests/:id/request-docs', verifyAdmin, requestResubmissionController);

// Delete old rejected registrations
router.delete('/requests/rejected', verifyAdmin, deleteRejectedController);

export default router;
