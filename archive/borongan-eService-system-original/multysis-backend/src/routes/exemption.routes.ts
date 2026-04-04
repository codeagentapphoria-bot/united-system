import { Router } from 'express';
import {
  approveExemptionController,
  createExemptionRequestController,
  getExemptionsByTransactionController,
  getExemptionController,
  rejectExemptionController,
  getPendingExemptionsController,
} from '../controllers/exemption.controller';
import { verifyAdmin, verifySubscriber } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  approveExemptionValidation,
  createExemptionRequestValidation,
  getExemptionsValidation,
  rejectExemptionValidation,
} from '../validations/exemption.schema';

const router = Router();

// Subscriber routes
router.post(
  '/',
  verifySubscriber,
  validate(createExemptionRequestValidation),
  createExemptionRequestController
);

// Public route (accessible to both subscribers and admins)
router.get(
  '/transaction/:transactionId',
  validate(getExemptionsValidation),
  getExemptionsByTransactionController
);

// Admin routes
router.use(verifyAdmin);

router.get('/pending', getPendingExemptionsController);

router.get('/:id', getExemptionController);

router.patch('/:id/approve', validate(approveExemptionValidation), approveExemptionController);

router.patch('/:id/reject', validate(rejectExemptionValidation), rejectExemptionController);

export default router;
