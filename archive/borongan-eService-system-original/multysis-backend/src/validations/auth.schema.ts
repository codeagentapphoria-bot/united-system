import { body, ValidationChain } from 'express-validator';

const phoneRegex = /^(\+639|09)\d{9}$/;

export const adminLoginValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .notEmpty()
    .withMessage('Email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .notEmpty()
    .withMessage('Password is required'),
];

export const portalLoginValidation: ValidationChain[] = [
  body('phoneNumber')
    .matches(phoneRegex)
    .withMessage('Invalid Philippine phone number format (e.g., 09XXXXXXXXX)')
    .notEmpty()
    .withMessage('Phone number is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .notEmpty()
    .withMessage('Password is required'),
];

export const verifyCredentialsValidation: ValidationChain[] = [
  body('phoneNumber')
    .matches(phoneRegex)
    .withMessage('Invalid Philippine phone number format (e.g., 09XXXXXXXXX)')
    .notEmpty()
    .withMessage('Phone number is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .notEmpty()
    .withMessage('Password is required'),
];

export const verifyOtpValidation: ValidationChain[] = [
  body('phoneNumber')
    .matches(phoneRegex)
    .withMessage('Invalid Philippine phone number format (e.g., 09XXXXXXXXX)')
    .notEmpty()
    .withMessage('Phone number is required'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be 6 numeric digits')
    .notEmpty()
    .withMessage('OTP is required'),
];

export const portalSignupValidation: ValidationChain[] = [
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required')
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),
  body('middleName').optional().trim(),
  body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required')
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters'),
  body('phoneNumber')
    .matches(phoneRegex)
    .withMessage('Invalid Philippine phone number format (e.g., 09XXXXXXXXX)')
    .notEmpty()
    .withMessage('Phone number is required'),
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
