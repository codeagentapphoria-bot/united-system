import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  applyForProgramController,
  cancelApplicationController,
  getApplicationAdminController,
  getMyApplicationsController,
  getProgramController,
  listApplicationsAdminController,
  listProgramsController,
  reviewApplicationAdminController,
} from '../controllers/portal-programs.controller';
import { verifyAdmin, verifyResident, optionalAuth } from '../middleware/auth';
import { uploadProgramApplicationFiles } from '../middleware/upload';
import { validate } from '../middleware/validation';

const router = Router();

// =============================================================================
// RESIDENT PORTAL — requires active resident session
// =============================================================================

// List all active programs — public for browsing; eligibility & applicationStatus
// are only computed when a resident session is present (optionalAuth).
router.get(
  '/programs',
  optionalAuth,
  validate([
    query('search').optional().trim().isLength({ max: 200 }),
    query('type')
      .optional()
      .isIn(['all', 'SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ]),
  listProgramsController
);

// Resident's own applications (must be before /:id to avoid 'my' being captured as id param)
router.get('/programs/my/applications', verifyResident, getMyApplicationsController);

// Get single program detail
router.get('/programs/:id', verifyResident, getProgramController);

// Apply for a program (multipart: submittedData JSON + optional file uploads)
router.post(
  '/programs/:id/apply',
  verifyResident,
  uploadProgramApplicationFiles,
  applyForProgramController
);

// Cancel a pending application
router.delete('/programs/my/applications/:appId', verifyResident, cancelApplicationController);

// =============================================================================
// ADMIN — program application management
// =============================================================================

// List all applications (filterable by status, programId, search)
router.get(
  '/program-applications',
  verifyAdmin,
  validate([
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'cancelled']),
    query('programId').optional().isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim().isLength({ max: 200 }),
  ]),
  listApplicationsAdminController
);

// Get a single application with resident detail
router.get(
  '/program-applications/:appId',
  verifyAdmin,
  validate([param('appId').isUUID()]),
  getApplicationAdminController
);

// Approve or reject an application
router.post(
  '/program-applications/:appId/review',
  verifyAdmin,
  validate([
    param('appId').isUUID(),
    body('action').isIn(['approve', 'reject']),
    body('adminNotes').optional().trim().isLength({ max: 1000 }),
  ]),
  reviewApplicationAdminController
);

export default router;
