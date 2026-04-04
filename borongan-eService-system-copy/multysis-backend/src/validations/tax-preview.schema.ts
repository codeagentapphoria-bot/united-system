import { body, ValidationChain } from 'express-validator';

export const previewTaxValidation: ValidationChain[] = [
  body('serviceId').isUUID().withMessage('Service ID must be a valid UUID'),
  body('serviceData').optional().isObject().withMessage('Service data must be an object'),
  body('applicationDate')
    .optional()
    .isISO8601()
    .withMessage('Application date must be a valid ISO 8601 date'),
];
