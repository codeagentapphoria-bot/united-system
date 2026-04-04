import { body, param, query, ValidationChain } from 'express-validator';

export const createTransactionValidation: ValidationChain[] = [
  // residentId is optional — absent means guest submission (applicantName required instead)
  body('residentId').optional().isString().notEmpty(),
  body('serviceId').isString().notEmpty().withMessage('Service ID is required'),
  // Guest applicant fields (required when residentId is absent)
  body('applicantName').optional().trim(),
  body('applicantContact').optional().trim(),
  body('applicantEmail').optional().isEmail().withMessage('Invalid applicant email'),
  body('applicantAddress').optional().trim(),
  body('paymentAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Payment amount must be a positive number'),
  body('isLocalResident')
    .optional()
    .isBoolean()
    .withMessage('isLocalResident must be a boolean'),
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
  param('residentId').isUUID().withMessage('Invalid resident ID'),
  query('serviceId').optional().isString().notEmpty(),
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
