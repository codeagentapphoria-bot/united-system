import { body, param, query, ValidationChain } from 'express-validator';

export const createTaxProfileValidation: ValidationChain[] = [
  body('serviceId')
    .isUUID()
    .withMessage('Service ID must be a valid UUID')
    .notEmpty()
    .withMessage('Service ID is required'),
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('variant').optional().trim(),
  body('isActive').optional().isBoolean(),
];

export const updateTaxProfileValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid tax profile ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('variant').optional().trim(),
  body('isActive').optional().isBoolean(),
];

export const getTaxProfileValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid tax profile ID'),
];

export const deleteTaxProfileValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid tax profile ID'),
];

export const getTaxProfilesValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('serviceId').optional().isUUID().withMessage('Service ID must be a valid UUID'),
  query('isActive').optional().isBoolean(),
  query('search').optional().trim(),
];

export const getTaxProfileVersionsValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid tax profile ID'),
];

export const createTaxProfileVersionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid tax profile ID'),
  body('version')
    .optional()
    .trim()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('Version must be in semantic versioning format (e.g., 1.0.0)'),
  body('effectiveFrom')
    .isISO8601()
    .withMessage('Effective from date must be a valid ISO 8601 date')
    .notEmpty()
    .withMessage('Effective from date is required'),
  body('effectiveTo')
    .optional()
    .isISO8601()
    .withMessage('Effective to date must be a valid ISO 8601 date'),
  body('changeReason')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Change reason is required')
    .isLength({ min: 10 })
    .withMessage('Change reason must be at least 10 characters'),
  body('configuration')
    .isObject()
    .withMessage('Configuration must be an object')
    .notEmpty()
    .withMessage('Configuration is required'),
  body('configuration.inputs').isArray().withMessage('Configuration inputs must be an array'),
  body('configuration.derivedValues')
    .isArray()
    .withMessage('Configuration derivedValues must be an array'),
  body('configuration.finalTax')
    .isObject()
    .withMessage('Configuration finalTax must be an object')
    .notEmpty()
    .withMessage('Configuration finalTax is required'),
  body('configuration.finalTax.formula')
    .isString()
    .withMessage('Final tax formula must be a string')
    .notEmpty()
    .withMessage('Final tax formula is required'),
];

export const updateTaxProfileVersionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid tax profile version ID'),
  body('configuration').optional().isObject().withMessage('Configuration must be an object'),
  body('changeReason')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Change reason cannot be empty'),
  body('effectiveFrom')
    .optional()
    .isISO8601()
    .withMessage('Effective from date must be a valid ISO 8601 date'),
  body('effectiveTo')
    .optional()
    .custom((value) => {
      if (value === null) return true;
      if (typeof value === 'string') {
        const date = new Date(value);
        return !isNaN(date.getTime());
      }
      return false;
    })
    .withMessage('Effective to date must be a valid ISO 8601 date or null'),
];

export const activateTaxProfileVersionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid tax profile version ID'),
];

export const getTaxComputationValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
];

export const computeTaxValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
];
