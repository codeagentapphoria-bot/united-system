/**
 * classification.routes.ts
 *
 * Admin-only routes for managing resident classifications.
 * Mounted at: /api/classification
 */

import { Router } from 'express';
import { verifyAdmin } from '../middleware/auth';
import {
  insertClassificationController,
  getClassificationTypesController,
} from '../controllers/classification.controller';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

// POST /api/classification — assign classification to resident
router.post('/', insertClassificationController);

// GET /api/classification-types?municipalityId=1 — list active classification types
router.get('/types', getClassificationTypesController);

export default router;
