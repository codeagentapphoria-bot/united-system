import { body, param, query, ValidationChain } from 'express-validator';

const beneficiaryStatusValues = ['ACTIVE', 'INACTIVE', 'PENDING'];

const uuidMessage = 'Invalid identifier';

const paginationValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

const filterValidation: ValidationChain[] = [
  query('search').optional().trim(),
  query('status').optional().isIn(beneficiaryStatusValues).withMessage('Invalid status filter'),
  query('programId').optional().isUUID().withMessage('Invalid program filter'),
];

const governmentProgramsValidation = (field: string): ValidationChain[] => [
  body(field).optional().isArray().withMessage('Programs must be an array'),
  body(`${field}.*`).optional().isUUID().withMessage('Program IDs must be valid UUIDs'),
];

export const listSeniorBeneficiariesValidation: ValidationChain[] = [
  ...paginationValidation,
  ...filterValidation,
];

export const listPWDBeneficiariesValidation: ValidationChain[] = [
  ...paginationValidation,
  ...filterValidation,
];

export const listStudentBeneficiariesValidation: ValidationChain[] = [
  ...paginationValidation,
  ...filterValidation,
];

export const listSoloParentBeneficiariesValidation: ValidationChain[] = [
  ...paginationValidation,
  ...filterValidation,
];

export const createSeniorBeneficiaryValidation: ValidationChain[] = [
  body('residentId').isUUID().withMessage('Resident ID is required'),
  body('pensionTypes').isArray({ min: 1 }).withMessage('At least one pension type is required'),
  body('pensionTypes.*').isString().notEmpty().withMessage('Pension type IDs must be non-empty strings'),
  ...governmentProgramsValidation('governmentPrograms'),
];

export const updateSeniorBeneficiaryValidation: ValidationChain[] = [
  param('id').isUUID().withMessage(uuidMessage),
  body('pensionTypes')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one pension type is required'),
  body('pensionTypes.*').optional().isString().notEmpty().withMessage('Pension type IDs must be non-empty strings'),
  body('status').optional().isIn(beneficiaryStatusValues).withMessage('Invalid status'),
  body('remarks').optional().isString(),
  ...governmentProgramsValidation('governmentPrograms'),
];

export const createPWDBeneficiaryValidation: ValidationChain[] = [
  body('residentId').isUUID().withMessage('Resident ID is required'),
  body('disabilityType').isString().notEmpty().withMessage('Disability type ID is required'),
  body('disabilityLevel').isString().trim().notEmpty().withMessage('Disability level is required'),
  body('monetaryAllowance').optional().isBoolean(),
  body('assistedDevice').optional().isBoolean(),
  body('donorDevice').optional().isString(),
  ...governmentProgramsValidation('governmentPrograms'),
];

export const updatePWDBeneficiaryValidation: ValidationChain[] = [
  param('id').isUUID().withMessage(uuidMessage),
  body('disabilityType').optional().isString().notEmpty(),
  body('disabilityLevel').optional().isString().trim().notEmpty(),
  body('monetaryAllowance').optional().isBoolean(),
  body('assistedDevice').optional().isBoolean(),
  body('donorDevice').optional().isString(),
  body('status').optional().isIn(beneficiaryStatusValues),
  body('remarks').optional().isString(),
  ...governmentProgramsValidation('governmentPrograms'),
];

export const createStudentBeneficiaryValidation: ValidationChain[] = [
  body('residentId').isUUID().withMessage('Resident ID is required'),
  body('gradeLevel').isString().notEmpty().withMessage('Grade level ID is required'),
  ...governmentProgramsValidation('programs'),
];

export const updateStudentBeneficiaryValidation: ValidationChain[] = [
  param('id').isUUID().withMessage(uuidMessage),
  body('gradeLevel').optional().isString().notEmpty(),
  body('status').optional().isIn(beneficiaryStatusValues),
  body('remarks').optional().isString(),
  ...governmentProgramsValidation('programs'),
];

export const createSoloParentBeneficiaryValidation: ValidationChain[] = [
  body('residentId').isUUID().withMessage('Resident ID is required'),
  body('category').isString().notEmpty().withMessage('Category ID is required'),
  ...governmentProgramsValidation('assistancePrograms'),
];

export const updateSoloParentBeneficiaryValidation: ValidationChain[] = [
  param('id').isUUID().withMessage(uuidMessage),
  body('category').optional().isString().notEmpty(),
  body('status').optional().isIn(beneficiaryStatusValues),
  body('remarks').optional().isString(),
  ...governmentProgramsValidation('assistancePrograms'),
];

export const beneficiaryIdValidation: ValidationChain[] = [
  param('id').isUUID().withMessage(uuidMessage),
];

export const updateBeneficiaryStatusValidation: ValidationChain[] = [
  ...beneficiaryIdValidation,
  body('status').isIn(beneficiaryStatusValues).withMessage('Invalid status'),
];

export const statsValidation: ValidationChain[] = [
  query('range').optional().isIn(['daily', 'monthly', 'yearly']).withMessage('Invalid range'),
];
