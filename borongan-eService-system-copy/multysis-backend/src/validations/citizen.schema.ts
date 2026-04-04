import { body, param, query, ValidationChain } from 'express-validator';

const phoneRegex = /^(\+639|09)\d{9}$/;

export const createCitizenValidation: ValidationChain[] = [
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
  body('extensionName').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('phoneNumber')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Phone number is required')
    .matches(phoneRegex)
    .withMessage('Invalid Philippine phone number format'),
  body('citizenPicture').optional().trim(),
  body('birthDate').isISO8601().withMessage('Invalid birth date format'),
  body('civilStatus').trim().isLength({ min: 1 }).withMessage('Civil status is required'),
  body('sex').trim().isLength({ min: 1 }).withMessage('Sex is required'),
  body('username')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Username is required')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('pin')
    .matches(/^\d{4}$/)
    .withMessage('PIN must be exactly 4 digits'),
  body('region').trim().isLength({ min: 1 }).withMessage('Region is required'),
  body('province').trim().isLength({ min: 1 }).withMessage('Province is required'),
  body('municipality').trim().isLength({ min: 1 }).withMessage('Municipality is required'),
  body('spouseName').optional().trim(),
  body('emergencyContactPerson')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Emergency contact person is required'),
  body('emergencyContactNumber')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Emergency contact number is required')
    .matches(phoneRegex)
    .withMessage('Invalid Philippine phone number format'),
  body('addressRegion').trim().isLength({ min: 1 }).withMessage('Address region is required'),
  body('addressProvince').trim().isLength({ min: 1 }).withMessage('Address province is required'),
  body('addressMunicipality')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Address municipality is required'),
  body('addressBarangay').trim().isLength({ min: 1 }).withMessage('Address barangay is required'),
  body('addressPostalCode').trim().isLength({ min: 1 }).withMessage('Postal code is required'),
  body('addressStreetAddress').optional().trim(),
  body('address').optional().trim(),
  body('idType').trim().isLength({ min: 1 }).withMessage('ID type is required'),
  body('isResident').optional().isBoolean(),
  body('isVoter').optional().isBoolean(),
  body('proofOfResidency').optional().trim(),
  body('proofOfIdentification').optional().trim(),
  body('isEmployed').optional().isBoolean(),
  body('citizenship').optional().trim(),
  body('acrNo').optional().trim(),
  body('profession').optional().trim(),
  body('height').optional().trim(),
  body('weight').optional().trim(),
];

export const updateCitizenValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid citizen ID'),
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
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('phoneNumber')
    .optional()
    .matches(phoneRegex)
    .withMessage('Invalid Philippine phone number format'),
  body('citizenPicture').optional().trim(),
  body('birthDate').optional().isISO8601().withMessage('Invalid birth date format'),
  body('civilStatus').optional().trim(),
  body('sex').optional().trim(),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('pin')
    .optional()
    .matches(/^\d{4}$/)
    .withMessage('PIN must be exactly 4 digits'),
  body('region').optional().trim(),
  body('province').optional().trim(),
  body('municipality').optional().trim(),
  body('spouseName').optional().trim(),
  body('emergencyContactPerson').optional().trim(),
  body('emergencyContactNumber')
    .optional()
    .matches(phoneRegex)
    .withMessage('Invalid Philippine phone number format'),
  body('addressRegion').optional().trim(),
  body('addressProvince').optional().trim(),
  body('addressMunicipality').optional().trim(),
  body('addressBarangay').optional().trim(),
  body('addressPostalCode').optional().trim(),
  body('addressStreetAddress').optional().trim(),
  body('address').optional().trim(),
  body('idType').optional().trim(),
  body('isResident').optional().isBoolean(),
  body('isVoter').optional().isBoolean(),
  body('proofOfResidency').optional().trim(),
  body('proofOfIdentification').optional().trim(),
  body('isEmployed').optional().isBoolean(),
  body('citizenship').optional().trim(),
  body('acrNo').optional().trim(),
  body('profession').optional().trim(),
  body('height').optional().trim(),
  body('weight').optional().trim(),
];

export const getCitizensValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('status')
    .optional()
    .isIn(['PENDING', 'ACTIVE', 'INACTIVE', 'REJECTED'])
    .withMessage('Invalid status filter'),
];

export const getCitizenValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid citizen ID'),
];

export const approveCitizenValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid citizen ID'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks must be less than 500 characters'),
];

export const rejectCitizenValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid citizen ID'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks must be less than 500 characters'),
];

export const removeCitizenValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid citizen ID'),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks must be less than 500 characters'),
];

export const activateCitizenValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid citizen ID'),
];

export const deactivateCitizenValidation: ValidationChain[] = [
  param('id').isUUID().withMessage('Invalid citizen ID'),
];
