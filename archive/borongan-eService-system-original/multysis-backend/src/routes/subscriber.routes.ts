import { Router } from 'express';
import {
  activateSubscriberController,
  blockSubscriberController,
  changePasswordController,
  createSubscriberController,
  deactivateSubscriberController,
  getSubscriberController,
  getSubscribersController,
  getSubscriberTransactionsController,
  searchCitizensController,
  updateSubscriberController,
} from '../controllers/subscriber.controller';
import { verifyAdmin, verifyToken } from '../middleware/auth';
import { uploadProfilePicture } from '../middleware/upload';
import { validate } from '../middleware/validation';
import {
  activateSubscriberValidation,
  blockSubscriberValidation,
  changePasswordValidation,
  createSubscriberValidation,
  deactivateSubscriberValidation,
  getSubscribersValidation,
  getSubscriberValidation,
  updateSubscriberValidation,
} from '../validations/subscriber.schema';

const router = Router();

// Get all subscribers with pagination and filters (admin only)
router.get('/', verifyAdmin, validate(getSubscribersValidation), getSubscribersController);

// Search citizens for linking (admin only)
router.get('/search/citizens', verifyAdmin, searchCitizensController);

// Get subscriber transactions (admin only)
router.get(
  '/:id/transactions',
  verifyAdmin,
  validate(getSubscriberValidation),
  getSubscriberTransactionsController
);

// Activate subscriber (admin only)
router.patch(
  '/:id/activate',
  verifyAdmin,
  validate(activateSubscriberValidation),
  activateSubscriberController
);

// Deactivate subscriber (admin only)
router.patch(
  '/:id/deactivate',
  verifyAdmin,
  validate(deactivateSubscriberValidation),
  deactivateSubscriberController
);

// Block subscriber (admin only)
router.patch(
  '/:id/block',
  verifyAdmin,
  validate(blockSubscriberValidation),
  blockSubscriberController
);

// Change subscriber password (admin only)
router.patch(
  '/:id/password',
  verifyAdmin,
  validate(changePasswordValidation),
  changePasswordController
);

// Create subscriber (admin only)
router.post(
  '/',
  verifyAdmin,
  uploadProfilePicture.single('profilePicture'),
  validate(createSubscriberValidation),
  createSubscriberController
);

// Update subscriber - allow subscribers to update their own profile
// Must come before router.use(verifyAdmin) if we had one, but we're using individual middleware
router.put(
  '/:id',
  verifyToken, // Use verifyToken to allow both admin and subscriber access
  uploadProfilePicture.single('profilePicture'),
  validate(updateSubscriberValidation),
  updateSubscriberController
);

// Get single subscriber - allow subscribers to access their own profile (must be last)
// Note: This route must come after all other /:id routes to avoid conflicts
router.get(
  '/:id',
  verifyToken, // Use verifyToken to allow both admin and subscriber access
  validate(getSubscriberValidation),
  getSubscriberController
);

export default router;
