import { body, param, query, ValidationChain } from 'express-validator';

export const createAddressValidation: ValidationChain[] = [
  body('region').trim().isLength({ min: 1 }).withMessage('Region is required'),
  body('province').trim().isLength({ min: 1 }).withMessage('Province is required'),
  body('municipality').trim().isLength({ min: 1 }).withMessage('Municipality is required'),
  body('barangay').trim().isLength({ min: 1 }).withMessage('Barangay is required'),
  body('postalCode')
    .trim()
    .isLength({ min: 4, max: 4 })
    .withMessage('Postal code must be exactly 4 digits')
    .matches(/^\d{4}$/)
    .withMessage('Postal code must contain only digits'),
  body('streetAddress').optional().trim(),
  body('isActive').optional().isBoolean(),
];

export const updateAddressValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid address ID'),
  body('region').optional().trim().isLength({ min: 1 }).withMessage('Region cannot be empty'),
  body('province').optional().trim().isLength({ min: 1 }).withMessage('Province cannot be empty'),
  body('municipality')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Municipality cannot be empty'),
  body('barangay').optional().trim().isLength({ min: 1 }).withMessage('Barangay cannot be empty'),
  body('postalCode')
    .optional()
    .trim()
    .isLength({ min: 4, max: 4 })
    .withMessage('Postal code must be exactly 4 digits')
    .matches(/^\d{4}$/)
    .withMessage('Postal code must contain only digits'),
  body('streetAddress').optional().trim(),
  body('isActive').optional().isBoolean(),
];

export const getAddressesValidation: ValidationChain[] = [
  query('search').optional().trim(),
  query('region').optional().trim(),
  query('province').optional().trim(),
  query('municipality').optional().trim(),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const getAddressValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid address ID'),
];

export const activateAddressValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid address ID'),
];

export const deactivateAddressValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid address ID'),
];
