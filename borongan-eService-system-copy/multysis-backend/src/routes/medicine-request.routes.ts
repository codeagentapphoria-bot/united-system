import { Router } from 'express';
import {
  getMedicineRequestsController,
  getMedicineRequestController,
  getMedicineRequestStatsController,
  updateMedicineRequestStatusController,
} from '../controllers/medicine-request.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  getMedicineRequestsValidation,
  getMedicineRequestValidation,
  updateMedicineRequestStatusValidation,
} from '../validations/medicine-request.schema';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

// Dashboard stats
router.get('/stats', getMedicineRequestStatsController);

// List all requests (paginated, filterable)
router.get('/', validate(getMedicineRequestsValidation), getMedicineRequestsController);

// Get single request
router.get('/:id', validate(getMedicineRequestValidation), getMedicineRequestController);

// Update request status
router.patch(
  '/:id/status',
  validate(updateMedicineRequestStatusValidation),
  updateMedicineRequestStatusController
);

export default router;
