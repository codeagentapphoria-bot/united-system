import { param, query, body, ValidationChain } from 'express-validator';

const validStatuses = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DONE',
] as const;

export const getMedicineRequestsValidation: ValidationChain[] = [
  query('status')
    .optional()
    .isIn(validStatuses)
    .withMessage(`status must be one of: ${validStatuses.join(', ')}`),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

export const getMedicineRequestValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid medicine request ID'),
];

export const updateMedicineRequestStatusValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid medicine request ID'),
  body('status')
    .isIn(validStatuses)
    .withMessage(`status must be one of: ${validStatuses.join(', ')}`),
  body('note').optional().trim(),
];
