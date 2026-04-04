import { body, param, query, ValidationChain } from 'express-validator';

export const createFAQValidation: ValidationChain[] = [
  body('question')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Question is required')
    .isLength({ min: 3 })
    .withMessage('Question must be at least 3 characters'),
  body('answer')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Answer is required')
    .isLength({ min: 3 })
    .withMessage('Answer must be at least 3 characters'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('isActive').optional().isBoolean(),
];

export const updateFAQValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid FAQ ID'),
  body('question')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Question cannot be empty')
    .isLength({ min: 3 })
    .withMessage('Question must be at least 3 characters'),
  body('answer')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Answer cannot be empty')
    .isLength({ min: 3 })
    .withMessage('Answer must be at least 3 characters'),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('isActive').optional().isBoolean(),
];

export const getFAQsValidation: ValidationChain[] = [
  query('search').optional().trim(),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const getActiveFAQsValidation: ValidationChain[] = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const getPaginatedFAQsValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
];

export const getFAQValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid FAQ ID'),
];

export const activateFAQValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid FAQ ID'),
];

export const deactivateFAQValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid FAQ ID'),
];
