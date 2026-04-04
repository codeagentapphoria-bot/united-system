import { Router } from 'express';
import { getServiceFieldsMetadataController } from '../controllers/service-fields.controller';
import { verifyAdmin } from '../middleware/auth';

const router = Router();

// Get service fields metadata - requires admin authentication
router.get('/:serviceId', verifyAdmin, getServiceFieldsMetadataController);

export default router;
