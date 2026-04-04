import { Router } from 'express';
import {
  activateCitizenController,
  approveCitizenController,
  checkUsernameAvailabilityController,
  createCitizenController,
  deactivateCitizenController,
  getCitizenController,
  getCitizensController,
  rejectCitizenController,
  removeCitizenController,
  updateCitizenController,
} from '../controllers/citizen.controller';
import { verifyAdmin } from '../middleware/auth';
import { uploadCitizenFiles } from '../middleware/upload';
import { validate } from '../middleware/validation';
import {
  activateCitizenValidation,
  approveCitizenValidation,
  createCitizenValidation,
  deactivateCitizenValidation,
  getCitizensValidation,
  getCitizenValidation,
  rejectCitizenValidation,
  removeCitizenValidation,
  updateCitizenValidation,
} from '../validations/citizen.schema';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

// Get all citizens with pagination and filters
router.get('/', validate(getCitizensValidation), getCitizensController);

// Check username availability
router.get('/check-username', checkUsernameAvailabilityController);

// Get single citizen
router.get('/:id', validate(getCitizenValidation), getCitizenController);

// Create citizen
router.post(
  '/',
  uploadCitizenFiles.fields([
    { name: 'citizenPicture', maxCount: 1 },
    { name: 'proofOfResidency', maxCount: 1 },
    { name: 'proofOfIdentification', maxCount: 1 },
  ]),
  validate(createCitizenValidation),
  createCitizenController
);

// Update citizen
router.put(
  '/:id',
  uploadCitizenFiles.fields([
    { name: 'citizenPicture', maxCount: 1 },
    { name: 'proofOfResidency', maxCount: 1 },
    { name: 'proofOfIdentification', maxCount: 1 },
  ]),
  validate(updateCitizenValidation),
  updateCitizenController
);

// Approve citizen
router.patch('/:id/approve', validate(approveCitizenValidation), approveCitizenController);

// Reject citizen
router.patch('/:id/reject', validate(rejectCitizenValidation), rejectCitizenController);

// Remove citizen
router.patch('/:id/remove', validate(removeCitizenValidation), removeCitizenController);

// Activate citizen
router.patch('/:id/activate', validate(activateCitizenValidation), activateCitizenController);

// Deactivate citizen
router.patch('/:id/deactivate', validate(deactivateCitizenValidation), deactivateCitizenController);

export default router;
