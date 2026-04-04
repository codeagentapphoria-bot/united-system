import { body, param, query } from 'express-validator';

export const createSocialAmeliorationSettingValidation = [
  body('type')
    .trim()
    .isIn(['PENSION_TYPE', 'DISABILITY_TYPE', 'GRADE_LEVEL', 'SOLO_PARENT_CATEGORY'])
    .withMessage(
      'Type must be one of: PENSION_TYPE, DISABILITY_TYPE, GRADE_LEVEL, SOLO_PARENT_CATEGORY'
    ),
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const updateSocialAmeliorationSettingValidation = [
  param('id').isUUID().withMessage('Invalid ID format'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const getSocialAmeliorationSettingsValidation = [
  query('type')
    .optional()
    .isIn(['PENSION_TYPE', 'DISABILITY_TYPE', 'GRADE_LEVEL', 'SOLO_PARENT_CATEGORY'])
    .withMessage(
      'Type must be one of: PENSION_TYPE, DISABILITY_TYPE, GRADE_LEVEL, SOLO_PARENT_CATEGORY'
    ),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('search').optional().trim(),
];

export const getSocialAmeliorationSettingValidation = [
  param('id').isUUID().withMessage('Invalid ID format'),
];

export const deleteSocialAmeliorationSettingValidation = [
  param('id').isUUID().withMessage('Invalid ID format'),
];

export const activateSocialAmeliorationSettingValidation = [
  param('id').isUUID().withMessage('Invalid ID format'),
];

export const deactivateSocialAmeliorationSettingValidation = [
  param('id').isUUID().withMessage('Invalid ID format'),
];
