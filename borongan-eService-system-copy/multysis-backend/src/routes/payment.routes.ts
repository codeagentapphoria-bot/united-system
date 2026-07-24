import { Router } from 'express';
import {
  recordPaymentController,
  getPaymentsByTransactionController,
  getBalanceController,
  getPaymentController,
} from '../controllers/payment.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  recordPaymentValidation,
  getPaymentsValidation,
  getBalanceValidation,
  getPaymentValidation,
} from '../validations/payment.schema';
import {
  requirePaymentServiceAccess,
  requireTransactionServiceAccess,
} from '../services/service-access.service';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

router.post(
  '/',
  validate(recordPaymentValidation),
  requireTransactionServiceAccess('transactionId'),
  recordPaymentController
);

router.get(
  '/transaction/:transactionId',
  validate(getPaymentsValidation),
  requireTransactionServiceAccess('transactionId'),
  getPaymentsByTransactionController
);

router.get(
  '/transaction/:transactionId/balance',
  validate(getBalanceValidation),
  requireTransactionServiceAccess('transactionId'),
  getBalanceController
);

router.get('/:id', validate(getPaymentValidation), requirePaymentServiceAccess('id'), getPaymentController);

export default router;
