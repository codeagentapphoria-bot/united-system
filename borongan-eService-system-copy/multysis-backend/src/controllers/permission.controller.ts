import { Response } from 'express';
import {
  createPermission,
  getPermissions,
  getPermission,
  updatePermission,
  deletePermission,
  getDistinctResources,
} from '../services/permission.service';
import { AuthRequest } from '../middleware/auth';

export const createPermissionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const permission = await createPermission(req.body);
    res.status(201).json({
      status: 'success',
      data: permission,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create permission',
    });
  }
};

export const getPermissionsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = (req.query.search as string) || undefined;
    const resource = (req.query.resource as string) || undefined;
    const result = await getPermissions({ page, limit, search, resource });
    res.status(200).json({
      status: 'success',
      data: result.permissions,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch permissions',
    });
  }
};

export const getPermissionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const permission = await getPermission(req.params.id);
    res.status(200).json({
      status: 'success',
      data: permission,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Permission not found',
    });
  }
};

export const updatePermissionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const permission = await updatePermission(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: permission,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update permission',
    });
  }
};

export const deletePermissionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await deletePermission(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'Permission deleted successfully',
    });
  } catch (error: any) {
    let statusCode = 400;
    if (error.message === 'Permission not found') {
      statusCode = 404;
    } else if (error.message === 'Cannot delete permission that is assigned to roles') {
      statusCode = 409;
    }
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to delete permission',
    });
  }
};

export const getAdminResourcesController = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const resources = await getDistinctResources();
    res.status(200).json({
      status: 'success',
      data: resources,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch admin resources',
    });
  }
};
