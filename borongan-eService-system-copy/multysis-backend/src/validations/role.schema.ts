import { body, param, ValidationChain } from 'express-validator';

export const createRoleValidation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Role name is required')
    .isLength({ min: 2 })
    .withMessage('Role name must be at least 2 characters'),
  body('description').optional().trim(),
  body('system')
    .trim()
    .isLength({ min: 1 })
    .withMessage('System is required'),
  body('redirectPageId').optional().isUUID().withMessage('redirectPageId must be a valid UUID'),
];

export const updateRoleValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid role ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Role name must be at least 2 characters'),
  body('description').optional().trim(),
  body('redirectPageId').optional().isUUID().withMessage('redirectPageId must be a valid UUID'),
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

export const setRolePagesValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid role ID'),
  body('pageIds')
    .isArray()
    .withMessage('pageIds must be an array'),
  body('pageIds.*')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Each page ID must be a non-empty string'),
];
