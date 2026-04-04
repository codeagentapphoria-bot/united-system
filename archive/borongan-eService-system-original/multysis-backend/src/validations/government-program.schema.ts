import { body, param, query, ValidationChain } from 'express-validator';

export const createGovernmentProgramValidation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Program name is required')
    .isLength({ min: 2 })
    .withMessage('Program name must be at least 2 characters'),
  body('description').optional().trim(),
  body('type')
    .isIn(['SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL'])
    .withMessage('Type must be one of: SENIOR_CITIZEN, PWD, STUDENT, SOLO_PARENT, ALL'),
  body('isActive').optional().isBoolean(),
];

export const updateGovernmentProgramValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid government program ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Program name must be at least 2 characters'),
  body('description').optional().trim(),
  body('type')
    .optional()
    .isIn(['SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL'])
    .withMessage('Type must be one of: SENIOR_CITIZEN, PWD, STUDENT, SOLO_PARENT, ALL'),
  body('isActive').optional().isBoolean(),
];

export const getGovernmentProgramsValidation: ValidationChain[] = [
  query('search').optional().trim(),
  query('type')
    .optional()
    .isIn(['SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL'])
    .withMessage('Type must be one of: SENIOR_CITIZEN, PWD, STUDENT, SOLO_PARENT, ALL'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const getGovernmentProgramValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid government program ID'),
];

export const activateGovernmentProgramValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid government program ID'),
];

export const deactivateGovernmentProgramValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid government program ID'),
];
