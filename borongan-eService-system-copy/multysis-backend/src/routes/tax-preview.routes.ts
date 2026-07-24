import { Router } from 'express';
import { previewTaxController } from '../controllers/tax-preview.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { previewTaxValidation } from '../validations/tax-preview.schema';
import { requireServiceIdAccess } from '../services/service-access.service';

const router = Router();

router.post(
  '/preview',
  verifyAdmin,
  validate(previewTaxValidation),
  requireServiceIdAccess('serviceId'),
  previewTaxController
);

export default router;
