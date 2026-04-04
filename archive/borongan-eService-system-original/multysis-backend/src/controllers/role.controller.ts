import { Response } from 'express';
import {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
} from '../services/role.service';
import { AuthRequest } from '../middleware/auth';

export const createRoleController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = await createRole(req.body);
    res.status(201).json({
      status: 'success',
      data: role,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create role',
    });
  }
};

export const getRolesController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roles = await getRoles();
    res.status(200).json({
      status: 'success',
      data: roles,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch roles',
    });
  }
};

export const getRoleController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = await getRole(req.params.id);
    res.status(200).json({
      status: 'success',
      data: role,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Role not found',
    });
  }
};

export const updateRoleController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = await updateRole(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: role,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update role',
    });
  }
};

export const deleteRoleController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteRole(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'Role deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to delete role',
    });
  }
};

export const assignPermissionsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { permissionIds } = req.body;
    const role = await assignPermissionsToRole(req.params.id, permissionIds);
    res.status(200).json({
      status: 'success',
      data: role,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to assign permissions',
    });
  }
};
