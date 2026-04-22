/**
 * classification.controller.ts
 *
 * Handlers for admin classification endpoints:
 *   POST  /api/classification               — assign classification to resident
 *   GET   /api/classification-types         — list classification types for a municipality
 */

import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth';
import {
  insertClassification,
  getClassificationTypes,
} from '../services/classification.service';

// =============================================================================
// POST /api/classification — assign classification to a resident
// =============================================================================
export const insertClassificationController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { residentId, classificationType, classificationDetails } = req.body;

    if (!residentId || !classificationType) {
      res.status(400).json({
        status: 'error',
        message: 'residentId and classificationType are required',
      });
      return;
    }

    const classification = await insertClassification({
      residentId,
      classificationType,
      classificationDetails,
    });

    res.status(201).json({
      status: 'success',
      message: 'Classification added',
      data: classification,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET /api/classification-types — list active classification types
// =============================================================================
export const getClassificationTypesController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const municipalityId = parseInt(req.query.municipalityId as string, 10);

    if (!municipalityId || isNaN(municipalityId)) {
      res.status(400).json({
        status: 'error',
        message: 'municipalityId query param is required',
      });
      return;
    }

    const types = await getClassificationTypes({ municipalityId });

    res.json({
      status: 'success',
      data: types,
    });
  } catch (error) {
    next(error);
  }
};
