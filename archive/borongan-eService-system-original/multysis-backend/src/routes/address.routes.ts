import { Router } from 'express';
import {
  activateAddressController,
  createAddressController,
  deactivateAddressController,
  deleteAddressController,
  getAddressController,
  getAddressesController,
  updateAddressController,
} from '../controllers/address.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  activateAddressValidation,
  createAddressValidation,
  deactivateAddressValidation,
  getAddressValidation,
  getAddressesValidation,
  updateAddressValidation,
} from '../validations/address.schema';

const router = Router();

// GET routes are accessible to everyone (read-only, public geographic data)
// Get all addresses with filters
router.get('/', validate(getAddressesValidation), getAddressesController);

// Get single address
router.get('/:id', validate(getAddressValidation), getAddressController);

// All other routes (POST, PUT, PATCH, DELETE) require admin authentication
router.use(verifyAdmin);

// Create address
router.post('/', validate(createAddressValidation), createAddressController);

// Update address
router.put('/:id', validate(updateAddressValidation), updateAddressController);

// Activate address
router.patch('/:id/activate', validate(activateAddressValidation), activateAddressController);

// Deactivate address
router.patch('/:id/deactivate', validate(deactivateAddressValidation), deactivateAddressController);

// Delete address
router.delete('/:id', validate(getAddressValidation), deleteAddressController);

export default router;
