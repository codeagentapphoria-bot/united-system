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

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

router.post('/:transactionId', validate(reassessTaxValidation), reassessTaxController);

router.get(
  '/:transactionId/history',
  validate(getReassessmentHistoryValidation),
  getReassessmentHistoryController
);

router.get('/comparison/:computationId', getReassessmentComparisonController);

export default router;
