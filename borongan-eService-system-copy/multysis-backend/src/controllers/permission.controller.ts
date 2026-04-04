import { Response } from 'express';
import {
  createPermission,
  getPermissions,
  getPermission,
  updatePermission,
  deletePermission,
} from '../services/permission.service';
import { AuthRequest } from '../middleware/auth';
import { getAdminResources } from '../utils/admin-resources';

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

export const getPermissionsController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const permissions = await getPermissions();
    res.status(200).json({
      status: 'success',
      data: permissions,
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
    res.status(400).json({
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
    const resources = getAdminResources();
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
