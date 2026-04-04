import { body, param, ValidationChain } from 'express-validator';

export const createPermissionValidation: ValidationChain[] = [
  body('resource').trim().isLength({ min: 1 }).withMessage('Resource is required'),
  body('action').isIn(['read', 'all']).withMessage('Action must be either "read" or "all"'),
];

export const updatePermissionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid permission ID'),
  body('resource').optional().trim().isLength({ min: 1 }).withMessage('Resource cannot be empty'),
  body('action')
    .optional()
    .isIn(['read', 'all'])
    .withMessage('Action must be either "read" or "all"'),
];

export const getPermissionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid permission ID'),
];
