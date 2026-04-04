import { body, param, ValidationChain } from 'express-validator';

export const reassessTaxValidation: ValidationChain[] = [
  param('transactionId').isUUID().withMessage('Invalid transaction ID'),
  body('reason')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Reassessment reason is required')
    .isLength({ min: 10 })
    .withMessage('Reassessment reason must be at least 10 characters'),
];

export const getReassessmentHistoryValidation: ValidationChain[] = [
  param('transactionId').isUUID().withMessage('Invalid transaction ID'),
];

export const getReassessmentComparisonValidation: ValidationChain[] = [
  param('computationId').isUUID().withMessage('Invalid computation ID'),
];
