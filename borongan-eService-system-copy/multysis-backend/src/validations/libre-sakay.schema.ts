import { param, query, body, ValidationChain } from 'express-validator';

export const getBusesValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

export const getBusByIdValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid bus ID'),
];

export const createBusValidation: ValidationChain[] = [
  body('plate_number').notEmpty().trim().withMessage('Plate number is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('model').optional().isString().trim(),
  body('route_id').optional().isUUID().withMessage('Invalid route ID'),
];

export const updateBusValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid bus ID'),
  body('plate_number').optional().notEmpty().trim(),
  body('capacity').optional().isInt({ min: 1 }),
  body('model').optional().isString().trim(),
  body('route_id').optional(),
  body('is_active').optional().isBoolean(),
];

export const deleteBusValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid bus ID'),
];

export const assignDriverValidation: ValidationChain[] = [
  param('busId').notEmpty().withMessage('Invalid bus ID'),
  body('driver_id').notEmpty().withMessage('Invalid driver ID'),
];

export const getRoutesValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

export const createRouteValidation: ValidationChain[] = [
  body('name').notEmpty().trim().withMessage('Route name is required'),
  body('description').optional().trim(),
];

export const updateRouteValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid route ID'),
  body('name').optional().notEmpty().trim(),
  body('description').optional().trim(),
  body('is_active').optional().isBoolean(),
];

export const getDriversValidation: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

export const createDriverValidation: ValidationChain[] = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('full_name').notEmpty().trim().withMessage('Full name is required'),
  body('phone').notEmpty().trim().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const updateDriverValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid driver ID'),
  body('full_name').optional().notEmpty().trim(),
  body('phone').optional().trim(),
  body('is_active').optional().isBoolean(),
];

export const createStopValidation: ValidationChain[] = [
  body('name').notEmpty().trim().withMessage('Stop name is required'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

export const updateStopValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid stop ID'),
  body('name').optional().notEmpty().trim(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }),
  body('longitude').optional().isFloat({ min: -180, max: 180 }),
];

export const assignStopToRouteValidation: ValidationChain[] = [
  param('routeId').notEmpty().withMessage('Invalid route ID'),
  body('stop_id').notEmpty().withMessage('Invalid stop ID'),
];

export const reorderStopsValidation: ValidationChain[] = [
  param('routeId').notEmpty().withMessage('Invalid route ID'),
  body('stop_ids').isArray({ min: 1 }).withMessage('stop_ids must be a non-empty array'),
];

export const replaceStopInRouteValidation: ValidationChain[] = [
  param('routeId').notEmpty().withMessage('Invalid route ID'),
  body('old_stop_id').notEmpty().withMessage('old_stop_id is required'),
  body('new_stop_id').notEmpty().withMessage('new_stop_id is required'),
];

export const reviewRideLogValidation: ValidationChain[] = [
  param('id').notEmpty().withMessage('Invalid ride log ID'),
];
