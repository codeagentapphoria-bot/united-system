import { Router } from 'express';
import {
  activateSocialAmeliorationSettingController,
  createSocialAmeliorationSettingController,
  deactivateSocialAmeliorationSettingController,
  deleteSocialAmeliorationSettingController,
  getSocialAmeliorationSettingController,
  getSocialAmeliorationSettingsController,
  updateSocialAmeliorationSettingController,
} from '../controllers/social-amelioration-setting.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  activateSocialAmeliorationSettingValidation,
  createSocialAmeliorationSettingValidation,
  deactivateSocialAmeliorationSettingValidation,
  deleteSocialAmeliorationSettingValidation,
  getSocialAmeliorationSettingValidation,
  getSocialAmeliorationSettingsValidation,
  updateSocialAmeliorationSettingValidation,
} from '../validations/social-amelioration-setting.schema';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

// Get all social amelioration settings (with optional filters)
router.get(
  '/',
  validate(getSocialAmeliorationSettingsValidation),
  getSocialAmeliorationSettingsController
);

// Get single social amelioration setting
router.get(
  '/:id',
  validate(getSocialAmeliorationSettingValidation),
  getSocialAmeliorationSettingController
);

// Create social amelioration setting
router.post(
  '/',
  validate(createSocialAmeliorationSettingValidation),
  createSocialAmeliorationSettingController
);

// Update social amelioration setting
router.put(
  '/:id',
  validate(updateSocialAmeliorationSettingValidation),
  updateSocialAmeliorationSettingController
);

// Delete social amelioration setting
router.delete(
  '/:id',
  validate(deleteSocialAmeliorationSettingValidation),
  deleteSocialAmeliorationSettingController
);

// Activate social amelioration setting
router.patch(
  '/:id/activate',
  validate(activateSocialAmeliorationSettingValidation),
  activateSocialAmeliorationSettingController
);

// Deactivate social amelioration setting
router.patch(
  '/:id/deactivate',
  validate(deactivateSocialAmeliorationSettingValidation),
  deactivateSocialAmeliorationSettingController
);

export default router;
