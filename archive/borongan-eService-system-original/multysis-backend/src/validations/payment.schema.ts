import { body, param, ValidationChain } from 'express-validator';

export const recordPaymentValidation: ValidationChain[] = [
  body('transactionId')
    .isUUID()
    .withMessage('Transaction ID must be a valid UUID')
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('taxComputationId')
    .isUUID()
    .withMessage('Tax computation ID must be a valid UUID')
    .notEmpty()
    .withMessage('Tax computation ID is required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be a positive number')
    .notEmpty()
    .withMessage('Payment amount is required'),
  body('paymentMethod')
    .isIn(['CASH', 'CHECK', 'ONLINE', 'BANK_TRANSFER', 'GCASH', 'PAYMAYA', 'OTHER'])
    .withMessage(
      'Payment method must be one of: CASH, CHECK, ONLINE, BANK_TRANSFER, GCASH, PAYMAYA, OTHER'
    )
    .notEmpty()
    .withMessage('Payment method is required'),
  body('paymentDate')
    .optional()
    .isISO8601()
    .withMessage('Payment date must be a valid ISO 8601 date'),
  body('referenceNumber')
    .optional()
    .trim()
    .isString()
    .withMessage('Reference number must be a string'),
  body('notes').optional().trim().isString().withMessage('Notes must be a string'),
];

export const getPaymentsValidation: ValidationChain[] = [
  param('transactionId').isUUID().withMessage('Invalid transaction ID'),
];

export const getBalanceValidation: ValidationChain[] = [
  param('transactionId').isUUID().withMessage('Invalid transaction ID'),
];

export const getPaymentValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid payment ID'),
];
