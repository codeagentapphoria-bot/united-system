import { Request, Response, NextFunction } from 'express';
import { createPage, getPages, getPageById, updatePage, deletePage, getDistinctSystems } from '../services/page.service';

// =============================================================================
// CREATE PAGE
// =============================================================================

export const createPageController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = await createPage(req.body);
    res.status(201).json({ status: 'success', data: page });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      res.status(409).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};

// =============================================================================
// GET PAGES
// =============================================================================

export const getPagesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { system, search, page, limit } = req.query;
    const result = await getPages({
      system: system as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json({ status: 'success', ...result });
  } catch (error) {
    next(error);
  }
};

// =============================================================================
// GET PAGE BY ID
// =============================================================================

export const getPageController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = await getPageById(req.params.id);
    res.json({ status: 'success', data: page });
  } catch (error: any) {
    if (error.message === 'Page not found') {
      res.status(404).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};

// =============================================================================
// UPDATE PAGE
// =============================================================================

export const updatePageController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = await updatePage(req.params.id, req.body);
    res.json({ status: 'success', data: page });
  } catch (error: any) {
    if (error.message === 'Page not found') {
      res.status(404).json({ status: 'error', message: error.message });
      return;
    }
    if (error.message.includes('already exists')) {
      res.status(409).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};

// =============================================================================
// DELETE PAGE
// =============================================================================

export const deletePageController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await deletePage(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Page not found') {
      res.status(404).json({ status: 'error', message: error.message });
      return;
    }
    next(error);
  }
};

// =============================================================================
// GET DISTINCT SYSTEMS
// =============================================================================

export const getDistinctSystemsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const systems = await getDistinctSystems();
    res.json({ status: 'success', data: systems });
  } catch (error) {
    next(error);
  }
};
