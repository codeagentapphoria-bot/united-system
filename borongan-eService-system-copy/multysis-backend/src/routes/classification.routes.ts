/**
 * classification.routes.ts
 *
 * Admin-only routes for managing resident classifications.
 * Mounted at: /api/classification AND /api/classification-types
 */

import { Router } from 'express';
import { z } from 'zod';
import { verifyAdmin } from '../middleware/auth';
import {
  insertClassificationController,
  getClassificationTypesController,
  updateClassificationTypeController,
} from '../controllers/classification.controller';
import {
  invalidateClassificationTypesCache,
} from '../services/classification.service';
import prisma from '../config/database';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

// POST /api/classification — assign classification to resident
router.post('/', insertClassificationController);

// GET /api/classification-types?municipalityId=1 — list active classification types
router.get('/types', getClassificationTypesController);

// PATCH /api/classification-types/:id — update classification_types.details
const detailsFieldSchema = z.object({
  key:     z.string().min(1),
  label:   z.string().min(1),
  type:    z.enum(['text', 'select', 'multiselect']),
  options: z.array(z.string().min(1)).optional(),
}).refine(
  (f) => (f.type === 'text') || Array.isArray(f.options),
  { message: 'select/multiselect fields must include options[]' }
);

const updateClassificationTypeSchema = z.object({
  details: z.array(detailsFieldSchema).min(1),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const parsed = updateClassificationTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_payload', issues: parsed.error.issues });
    }

    const existing = await prisma.classificationType.findUnique({ where: { id: parseInt(req.params.id, 10) } });
    if (!existing) {
      return res.status(404).json({ error: 'classification_type_not_found' });
    }

    const updated = await prisma.classificationType.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { details: parsed.data.details as any },
    });

    // Invalidate list cache for this municipality
    await invalidateClassificationTypesCache(existing.municipalityId);

    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
