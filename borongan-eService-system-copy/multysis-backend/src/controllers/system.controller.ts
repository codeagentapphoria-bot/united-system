import { Request, Response, NextFunction } from 'express';
import {
  createSystem,
  getSystems,
  getSystemBySlug,
  updateSystem,
  deleteSystem,
  forceDeleteSystem,
} from '../services/system.service';

// =============================================================================
// CREATE SYSTEM
// =============================================================================

export const createSystemController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const system = await createSystem(req.body);
    res.status(201).json({ status: 'success', data: system });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      res.status(409).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};

// =============================================================================
// GET SYSTEMS
// =============================================================================

export const getSystemsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const systems = await getSystems();
    res.json({ status: 'success', data: systems });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET SYSTEM BY SLUG
// =============================================================================

export const getSystemController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const system = await getSystemBySlug(req.params.slug);
    res.json({ status: 'success', data: system });
  } catch (error: any) {
    if (error.message === 'System not found') {
      res.status(404).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};

// =============================================================================
// UPDATE SYSTEM
// =============================================================================

export const updateSystemController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const system = await updateSystem(req.params.slug, req.body);
    res.json({ status: 'success', data: system });
  } catch (error: any) {
    if (error.message === 'System not found') {
      res.status(404).json({ status: 'error', message: error.message });
      return;
    }
    if (error.message.includes('already exists') || error.message.includes('Cannot modify')) {
      res.status(409).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};

// =============================================================================
// DELETE SYSTEM (check dependents — returns warning counts if any)
// =============================================================================

export const deleteSystemController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.params;
    const { force } = req.query;

    if (force === 'true') {
      // User confirmed the warning — reassign and delete
      const result = await forceDeleteSystem(slug);
      res.json({
        status: 'success',
        message: `System deleted. ${result.affectedPages} pages and ${result.affectedRoles} roles set to unassigned.`,
        data: result,
      });
      return;
    }

    // First call — check for dependents
    const result = await deleteSystem(slug);

    if (result.affectedPages > 0 || result.affectedRoles > 0) {
      // Has dependents — return 409 with counts so frontend can warn user
      res.status(409).json({
        status: 'warning',
        message: `System is in use by ${result.affectedPages} pages and ${result.affectedRoles} roles. Set them to unassigned before deleting?`,
        data: {
          affectedPages: result.affectedPages,
          affectedRoles: result.affectedRoles,
        },
      });
      return;
    }

    // No dependents — safe to delete
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'System not found' || error.message.includes('Cannot delete')) {
      res.status(404).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};
