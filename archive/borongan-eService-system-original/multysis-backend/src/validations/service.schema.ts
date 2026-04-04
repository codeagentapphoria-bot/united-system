import { body, param, query, ValidationChain } from 'express-validator';

export const createServiceValidation: ValidationChain[] = [
  body('code')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Service code is required')
    .matches(/^[A-Z_]+$/)
    .withMessage('Service code must be uppercase letters and underscores only'),
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Service name is required')
    .isLength({ min: 2 })
    .withMessage('Service name must be at least 2 characters'),
  body('description').optional().trim(),
  body('category').optional().trim(),
  body('icon').optional().trim(),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('isActive').optional().isBoolean(),
  body('requiresPayment').optional().isBoolean(),
  body('defaultAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Default amount must be a non-negative number'),
  body('paymentStatuses').optional().isArray().withMessage('Payment statuses must be an array'),
  body('paymentStatuses.*')
    .optional()
    .isString()
    .withMessage('Each payment status must be a string'),
  body('formFields')
    .optional()
    .custom((value) => {
      if (typeof value !== 'object' || value === null) {
        throw new Error('Form fields must be an object');
      }
      return true;
    }),
  body('displayInSidebar').optional().isBoolean(),
  body('displayInSubscriberTabs').optional().isBoolean(),
  body('requiresAppointment').optional().isBoolean(),
  body('appointmentDuration')
    .optional({ values: 'null' })
    .custom((value, { req }) => {
      // If requiresAppointment is false, appointmentDuration can be null/undefined
      if (req.body.requiresAppointment === false) {
        return true; // Allow null/undefined when appointment is not required
      }
      // If requiresAppointment is true, appointmentDuration must be a positive integer
      if (req.body.requiresAppointment === true) {
        if (value === null || value === undefined) {
          throw new Error('Appointment duration is required when appointment is required');
        }
        if (!Number.isInteger(value) || value < 1) {
          throw new Error('Appointment duration must be a positive integer (minutes)');
        }
      }
      return true;
    }),
];

export const updateServiceValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid service ID'),
  body('code')
    .optional()
    .trim()
    .matches(/^[A-Z_]+$/)
    .withMessage('Service code must be uppercase letters and underscores only'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Service name must be at least 2 characters'),
  body('description').optional().trim(),
  body('category').optional().trim(),
  body('icon').optional().trim(),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('isActive').optional().isBoolean(),
  body('requiresPayment').optional().isBoolean(),
  body('defaultAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Default amount must be a non-negative number'),
  body('paymentStatuses').optional().isArray().withMessage('Payment statuses must be an array'),
  body('paymentStatuses.*')
    .optional()
    .isString()
    .withMessage('Each payment status must be a string'),
  body('formFields')
    .optional()
    .custom((value) => {
      if (typeof value !== 'object' || value === null) {
        throw new Error('Form fields must be an object');
      }
      return true;
    }),
  body('displayInSidebar').optional().isBoolean(),
  body('displayInSubscriberTabs').optional().isBoolean(),
  body('requiresAppointment').optional().isBoolean(),
  body('appointmentDuration')
    .optional({ values: 'null' })
    .custom((value, { req }) => {
      // If requiresAppointment is false, appointmentDuration can be null/undefined
      if (req.body.requiresAppointment === false) {
        return true; // Allow null/undefined when appointment is not required
      }
      // If requiresAppointment is true, appointmentDuration must be a positive integer
      if (req.body.requiresAppointment === true) {
        if (value === null || value === undefined) {
          throw new Error('Appointment duration is required when appointment is required');
        }
        if (!Number.isInteger(value) || value < 1) {
          throw new Error('Appointment duration must be a positive integer (minutes)');
        }
      }
      return true;
    }),
];

export const getServicesValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const getServiceValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid service ID'),
];

export const activateServiceValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid service ID'),
];

export const deactivateServiceValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid service ID'),
];
