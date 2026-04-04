import { Router } from 'express';
import {
  activateTaxProfileVersionController,
  createTaxProfileController,
  createTaxProfileVersionController,
  deleteTaxProfileController,
  getTaxProfileController,
  getTaxProfileVersionsController,
  getTaxProfilesController,
  updateTaxProfileController,
  updateTaxProfileVersionController,
} from '../controllers/tax-profile.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  activateTaxProfileVersionValidation,
  createTaxProfileValidation,
  createTaxProfileVersionValidation,
  deleteTaxProfileValidation,
  getTaxProfileValidation,
  getTaxProfileVersionsValidation,
  getTaxProfilesValidation,
  updateTaxProfileValidation,
  updateTaxProfileVersionValidation,
} from '../validations/tax-profile.schema';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

// Tax Profile CRUD
router.get('/', validate(getTaxProfilesValidation), getTaxProfilesController);

router.get('/:id', validate(getTaxProfileValidation), getTaxProfileController);

router.post('/', validate(createTaxProfileValidation), createTaxProfileController);

router.put('/:id', validate(updateTaxProfileValidation), updateTaxProfileController);

router.delete('/:id', validate(deleteTaxProfileValidation), deleteTaxProfileController);

// Tax Profile Versions
router.get(
  '/:id/versions',
  validate(getTaxProfileVersionsValidation),
  getTaxProfileVersionsController
);

router.post(
  '/:id/versions',
  validate(createTaxProfileVersionValidation),
  createTaxProfileVersionController
);

router.put(
  '/versions/:id',
  validate(updateTaxProfileVersionValidation),
  updateTaxProfileVersionController
);

router.patch(
  '/versions/:id/activate',
  validate(activateTaxProfileVersionValidation),
  activateTaxProfileVersionController
);

export default router;
