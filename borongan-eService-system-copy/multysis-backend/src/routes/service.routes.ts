import { Router } from 'express';
import {
  activateServiceController,
  createServiceController,
  deactivateServiceController,
  deleteServiceController,
  getActiveServicesController,
  getAppointmentAvailabilityController,
  getCategoriesController,
  getServiceByCodeController,
  getServiceController,
  getServicesController,
  updateServiceController,
} from '../controllers/service.controller';
import { verifyAdmin, verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  requirePagePathAccess,
  requireServiceCodeAccess,
  requireServiceIdAccess,
} from '../services/service-access.service';
import {
  activateServiceValidation,
  createServiceValidation,
  deactivateServiceValidation,
  getServicesValidation,
  getServiceValidation,
  updateServiceValidation,
} from '../validations/service.schema';

const router = Router();
const SERVICE_MANAGEMENT_PAGE = '/admin/general-settings/smart-city-services';

// Get active services (for sidebar/tabs) - Public endpoint, no auth required
router.get('/active', getActiveServicesController);

// Get all categories - Public endpoint, no auth required
router.get('/categories', getCategoriesController);

// Get service by code - must come before /:id and before verifyAdmin
// This is used by the dynamic service pages, so it needs admin auth
router.get('/code/:code', verifyAdmin, requireServiceCodeAccess('code'), getServiceByCodeController);

// Get appointment availability - allow authenticated users (must come before /:id)
router.get(
  '/:id/appointments/availability',
  verifyToken,
  requireServiceIdAccess('id'),
  getAppointmentAvailabilityController
);

// Get single service - allow both admin and subscriber access (for viewing transaction details)
// Must come before router.use(verifyAdmin)
router.get(
  '/:id',
  verifyToken, // Use verifyToken to allow both admin and subscriber access
  validate(getServiceValidation),
  requireServiceIdAccess('id'),
  getServiceController
);

// All other routes require admin authentication
router.use(verifyAdmin);

// Get all services with pagination and filters
router.get('/', requirePagePathAccess(SERVICE_MANAGEMENT_PAGE), validate(getServicesValidation), getServicesController);

// Create service
router.post('/', requirePagePathAccess(SERVICE_MANAGEMENT_PAGE), validate(createServiceValidation), createServiceController);

// Update service
router.put('/:id', requirePagePathAccess(SERVICE_MANAGEMENT_PAGE), validate(updateServiceValidation), updateServiceController);

// Activate service
router.patch('/:id/activate', requirePagePathAccess(SERVICE_MANAGEMENT_PAGE), validate(activateServiceValidation), activateServiceController);

// Deactivate service
router.patch('/:id/deactivate', requirePagePathAccess(SERVICE_MANAGEMENT_PAGE), validate(deactivateServiceValidation), deactivateServiceController);

// Delete service
router.delete('/:id', requirePagePathAccess(SERVICE_MANAGEMENT_PAGE), validate(getServiceValidation), deleteServiceController);

export default router;
