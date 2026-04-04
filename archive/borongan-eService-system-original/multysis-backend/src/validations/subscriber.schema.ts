import { body, param, query, ValidationChain } from 'express-validator';

const phoneRegex = /^(\+639|09)\d{9}$/;

export const createSubscriberValidation: ValidationChain[] = [
  body('firstName')
    .optional()
    .trim()
    .custom((value, { req }) => {
      // If linked to citizen, firstName is optional (will use citizen's data)
      if (req.body.isCitizen === 'true' && req.body.citizenId) {
        return true;
      }
      // Otherwise, firstName is required
      if (!value || value.trim().length === 0) {
        throw new Error('First name is required');
      }
      if (value.trim().length < 2) {
        throw new Error('First name must be at least 2 characters');
      }
      return true;
    }),
  body('middleName').optional().trim(),
  body('lastName')
    .optional()
    .trim()
    .custom((value, { req }) => {
      // If linked to citizen, lastName is optional (will use citizen's data)
      if (req.body.isCitizen === 'true' && req.body.citizenId) {
        return true;
      }
      // Otherwise, lastName is required
      if (!value || value.trim().length === 0) {
        throw new Error('Last name is required');
      }
      if (value.trim().length < 2) {
        throw new Error('Last name must be at least 2 characters');
      }
      return true;
    }),
  body('extensionName').optional().trim(),
  body('phoneNumber')
    .optional()
    .custom((value, { req }) => {
      // If linked to citizen, phoneNumber is optional (will use citizen's phone if available)
      if (req.body.isCitizen === 'true' && req.body.citizenId) {
        // If provided, validate format
        if (value && value.trim().length > 0) {
          if (!phoneRegex.test(value)) {
            throw new Error('Invalid Philippine phone number format (e.g., 09XXXXXXXXX)');
          }
        }
        return true;
      }
      // Otherwise, phoneNumber is required
      if (!value || value.trim().length === 0) {
        throw new Error('Phone number is required');
      }
      if (!phoneRegex.test(value)) {
        throw new Error('Invalid Philippine phone number format (e.g., 09XXXXXXXXX)');
      }
      return true;
    }),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .notEmpty()
    .withMessage('Password is required'),
  body('region').optional().trim(),
  body('province').optional().trim(),
  body('municipality').optional().trim(),
  body('motherFirstName').optional().trim(),
  body('motherMiddleName').optional().trim(),
  body('motherLastName').optional().trim(),
  body('citizenId').optional().isUUID().withMessage('Invalid citizen ID'),
  body('isCitizen').optional().isBoolean().withMessage('isCitizen must be a boolean'),
];

export const updateSubscriberValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid subscriber ID'),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),
  body('middleName').optional().trim(),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters'),
  body('extensionName').optional().trim(),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .custom((value) => {
      if (value && value !== '') {
        // Only validate email format if value is provided and not empty
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error('Invalid email address');
        }
      }
      return true;
    }),
  body('phoneNumber')
    .optional()
    .matches(phoneRegex)
    .withMessage('Invalid Philippine phone number format'),
  body('civilStatus').optional().trim(),
  body('sex').optional().trim(),
  body('birthdate').optional().isISO8601().withMessage('Invalid date format'),
  body('residentAddress').optional().trim(),
  body('addressRegion').optional().trim(),
  body('addressProvince').optional().trim(),
  body('addressMunicipality').optional().trim(),
  body('addressBarangay').optional().trim(),
  body('addressPostalCode').optional().trim(),
  body('addressStreetAddress').optional().trim(),
  body('region').optional().trim(),
  body('province').optional().trim(),
  body('municipality').optional().trim(),
  body('motherFirstName').optional().trim(),
  body('motherMiddleName').optional().trim(),
  body('motherLastName').optional().trim(),
];

export const changePasswordValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid subscriber ID'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .notEmpty()
    .withMessage('Password is required'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords don't match");
      }
      return true;
    })
    .notEmpty()
    .withMessage('Confirm password is required'),
];

export const getSubscribersValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('residencyFilter')
    .optional()
    .isIn(['all', 'resident', 'non-resident'])
    .withMessage('Invalid residency filter'),
];

export const getSubscriberValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid subscriber ID'),
];

export const activateSubscriberValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid subscriber ID'),
];

export const deactivateSubscriberValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid subscriber ID'),
];

export const blockSubscriberValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid subscriber ID'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks must be less than 500 characters'),
];
