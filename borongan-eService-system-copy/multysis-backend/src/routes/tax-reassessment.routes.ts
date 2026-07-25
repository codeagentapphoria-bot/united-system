import { Router } from 'express';
import {
  reassessTaxController,
  getReassessmentHistoryController,
  getReassessmentComparisonController,
} from '../controllers/tax-reassessment.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  reassessTaxValidation,
  getReassessmentHistoryValidation,
} from '../validations/tax-reassessment.schema';
import {
  requireTaxComputationServiceAccess,
  requireTransactionServiceAccess,
} from '../services/service-access.service';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

router.post(
  '/:transactionId',
  validate(reassessTaxValidation),
  requireTransactionServiceAccess('transactionId'),
  reassessTaxController
);

router.get(
  '/:transactionId/history',
  validate(getReassessmentHistoryValidation),
  requireTransactionServiceAccess('transactionId'),
  getReassessmentHistoryController
);

router.get(
  '/comparison/:computationId',
  requireTaxComputationServiceAccess('computationId'),
  getReassessmentComparisonController
);

export default router;
