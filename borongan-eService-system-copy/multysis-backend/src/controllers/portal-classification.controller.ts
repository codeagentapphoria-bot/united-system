/**
 * portal-classification.controller.ts
 *
 * Handler for GET /api/portal/classifications/my
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getMyClassifications } from '../services/portal-classification.service';

export const getMyClassificationsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const classifications = await getMyClassifications(req.user.id);
    res.status(200).json({ status: 'success', data: classifications });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
