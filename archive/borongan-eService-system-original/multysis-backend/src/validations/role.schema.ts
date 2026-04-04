import { body, param, ValidationChain } from 'express-validator';

export const createRoleValidation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Role name is required')
    .isLength({ min: 2 })
    .withMessage('Role name must be at least 2 characters'),
  body('description').optional().trim(),
];

export const updateRoleValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid role ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Role name must be at least 2 characters'),
  body('description').optional().trim(),
];

export const getRoleValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid role ID'),
];

export const assignPermissionsValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid role ID'),
  body('permissionIds')
    .isArray()
    .withMessage('permissionIds must be an array')
    .notEmpty()
    .withMessage('At least one permission is required'),
  body('permissionIds.*').isUUID().withMessage('Each permission ID must be a valid UUID'),
];
