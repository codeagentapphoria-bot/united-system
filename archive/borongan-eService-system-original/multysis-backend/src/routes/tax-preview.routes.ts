import { Router } from 'express';
import { previewTaxController } from '../controllers/tax-preview.controller';
import { verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { previewTaxValidation } from '../validations/tax-preview.schema';

const router = Router();

router.post('/preview', verifyToken, validate(previewTaxValidation), previewTaxController);

export default router;
