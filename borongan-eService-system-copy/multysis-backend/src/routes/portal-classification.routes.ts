/**
 * portal-classification.routes.ts
 *
 * Read-only BIMS classification data for the resident portal.
 * Mounted at: /api/portal/classifications
 */

import { Router } from 'express';
import { verifyResident } from '../middleware/auth';
import { getMyClassificationsController } from '../controllers/portal-classification.controller';

const router = Router();

// GET /api/portal/classifications/my
router.get('/my', verifyResident, getMyClassificationsController);

export default router;
