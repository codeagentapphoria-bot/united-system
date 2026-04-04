import { body, param, ValidationChain } from 'express-validator';

export const createExemptionRequestValidation: ValidationChain[] = [
  body('transactionId')
    .isUUID()
    .withMessage('Transaction ID must be a valid UUID')
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('exemptionType')
    .isIn(['SENIOR_CITIZEN', 'PWD', 'SOLO_PARENT', 'OTHER'])
    .withMessage('Exemption type must be one of: SENIOR_CITIZEN, PWD, SOLO_PARENT, OTHER')
    .notEmpty()
    .withMessage('Exemption type is required'),
  body('requestReason')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Request reason is required')
    .isLength({ min: 10 })
    .withMessage('Request reason must be at least 10 characters'),
  body('supportingDocuments')
    .optional()
    .isArray()
    .withMessage('Supporting documents must be an array'),
  body('supportingDocuments.*')
    .optional()
    .isString()
    .withMessage('Each supporting document must be a string (file path)'),
];

export const approveExemptionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid exemption ID'),
  body('exemptionAmount')
    .isFloat({ min: 0 })
    .withMessage('Exemption amount must be a positive number')
    .notEmpty()
    .withMessage('Exemption amount is required'),
];

export const rejectExemptionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid exemption ID'),
  body('rejectionReason')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Rejection reason is required')
    .isLength({ min: 10 })
    .withMessage('Rejection reason must be at least 10 characters'),
];

export const getExemptionsValidation: ValidationChain[] = [
  param('transactionId').isUUID().withMessage('Invalid transaction ID'),
];

export const getExemptionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid exemption ID'),
];
