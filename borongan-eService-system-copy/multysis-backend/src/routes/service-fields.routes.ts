import { Router } from 'express';
import { getServiceFieldsMetadataController } from '../controllers/service-fields.controller';
import { verifyAdmin } from '../middleware/auth';
import { requireServiceIdAccess } from '../services/service-access.service';

const router = Router();

// Get service fields metadata - requires admin authentication
router.get('/:serviceId', verifyAdmin, requireServiceIdAccess('serviceId'), getServiceFieldsMetadataController);

export default router;
