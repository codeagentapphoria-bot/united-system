import { body, param, ValidationChain } from 'express-validator';

export const createUserValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .notEmpty()
    .withMessage('Email is required'),
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
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('role').optional().trim(),
  body('roleIds').optional().isArray().withMessage('roleIds must be an array'),
  body('roleIds.*').optional().isUUID().withMessage('Each role ID must be a valid UUID'),
];

export const updateUserValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('role').optional().trim(),
  body('roleIds').optional().isArray().withMessage('roleIds must be an array'),
  body('roleIds.*').optional().isUUID().withMessage('Each role ID must be a valid UUID'),
];

export const changePasswordValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid user ID'),
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

export const getUserValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid user ID'),
];
