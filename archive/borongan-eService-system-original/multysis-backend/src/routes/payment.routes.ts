import { Router } from 'express';
import {
  recordPaymentController,
  getPaymentsByTransactionController,
  getBalanceController,
  getPaymentController,
} from '../controllers/payment.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { recordPaymentValidation, getPaymentsValidation } from '../validations/payment.schema';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

router.post('/', validate(recordPaymentValidation), recordPaymentController);

router.get(
  '/transaction/:transactionId',
  validate(getPaymentsValidation),
  getPaymentsByTransactionController
);

router.get('/transaction/:transactionId/balance', getBalanceController);

router.get('/:id', getPaymentController);

export default router;
