import { Router } from 'express';
import {
  approveExemptionController,
  createExemptionRequestController,
  getExemptionsByTransactionController,
  getExemptionController,
  rejectExemptionController,
  getPendingExemptionsController,
} from '../controllers/exemption.controller';
import { verifyAdmin, verifySubscriber, verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  approveExemptionValidation,
  createExemptionRequestValidation,
  getExemptionsValidation,
  rejectExemptionValidation,
} from '../validations/exemption.schema';
import {
  requireExemptionServiceAccess,
  requireTransactionServiceAccess,
} from '../services/service-access.service';

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
  verifyToken,
  validate(getExemptionsValidation),
  requireTransactionServiceAccess('transactionId'),
  getExemptionsByTransactionController
);

// Admin routes
router.use(verifyAdmin);

router.get('/pending', getPendingExemptionsController);

router.get('/:id', requireExemptionServiceAccess('id'), getExemptionController);

router.patch(
  '/:id/approve',
  validate(approveExemptionValidation),
  requireExemptionServiceAccess('id'),
  approveExemptionController
);

router.patch(
  '/:id/reject',
  validate(rejectExemptionValidation),
  requireExemptionServiceAccess('id'),
  rejectExemptionController
);

export default router;
