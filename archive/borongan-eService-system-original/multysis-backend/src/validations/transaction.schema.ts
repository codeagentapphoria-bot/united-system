import { body, param, query, ValidationChain } from 'express-validator';

export const createTransactionValidation: ValidationChain[] = [
  body('subscriberId').isUUID().withMessage('Invalid subscriber ID'),
  body('serviceId').isUUID().withMessage('Invalid service ID'),
  body('paymentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number'),
  body('isResidentOfBorongan')
    .optional()
    .isBoolean()
    .withMessage('isResidentOfBorongan must be a boolean'),
  body('permitType').optional().trim(),
  body('validIdToPresent').optional().trim(),
  body('remarks').optional().trim(),
  body('serviceData')
    .optional()
    .custom((value) => {
      if (typeof value !== 'object' || value === null) {
        throw new Error('Service data must be an object');
      }
      return true;
    }),
  body('preferredAppointmentDate')
    .optional()
    .isISO8601()
    .withMessage('Preferred appointment date must be a valid ISO 8601 date'),
];

export const updateTransactionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
  body('paymentStatus')
    .optional()
    .isIn([
      'PENDING',
      'APPROVED',
      'FOR_PRINTING',
      'FOR_PICK_UP',
      'RELEASED',
      'ASSESSED',
      'FOR_PAYMENT',
      'PAID',
      'ACKNOWLEDGED',
      'COMPLIED',
      'FOR_HEARING',
      'SETTLED',
      'ISSUED',
      'UNPAID',
      'WAIVED',
      'FOR_INSPECTION',
      'FOR_RELEASE',
      'REJECTED',
    ])
    .withMessage('Invalid payment status'),
  body('paymentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number'),
  body('status').optional().trim(),
  body('isPosted').optional().isBoolean().withMessage('isPosted must be a boolean'),
  body('remarks').optional().trim(),
];

export const getTransactionsValidation: ValidationChain[] = [
  param('subscriberId').isUUID().withMessage('Invalid subscriber ID'),
  query('serviceId').optional().isUUID().withMessage('Invalid service ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const getTransactionValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
];

export const requestTransactionUpdateValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('serviceData').custom((value) => {
    if (typeof value !== 'object' || value === null) {
      throw new Error('Service data must be an object');
    }
    return true;
  }),
  body('preferredAppointmentDate')
    .optional()
    .isISO8601()
    .withMessage('Preferred appointment date must be a valid ISO 8601 date'),
];

export const adminRequestTransactionUpdateValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
];

export const reviewTransactionUpdateValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid transaction ID'),
  body('approved').isBoolean().withMessage('Approved must be a boolean'),
];

export const getAppointmentsValidation: ValidationChain[] = [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
];
