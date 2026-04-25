import { Response } from 'express';
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  getAllowedPages,
} from '../services/user.service';
import { AuthRequest } from '../middleware/auth';

export const createUserController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await createUser(req.body);
    res.status(201).json({
      status: 'success',
      data: user,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create user',
    });
  }
};

export const getUsersController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = (req.query.search as string) || undefined;
    const result = await getUsers({ page, limit, search });
    res.status(200).json({
      status: 'success',
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch users',
    });
  }
};

export const getUserController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await getUser(req.params.id);
    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'User not found',
    });
  }
};

export const updateUserController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await updateUser(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (error: any) {
    const statusCode = error.message === 'User not found' ? 404 : 400;
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to update user',
    });
  }
};

export const deleteUserController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await deleteUser(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    const statusCode = error.message === 'User not found' ? 404 : 400;
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to delete user',
    });
  }
};

export const changePasswordController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { password } = req.body;
    await changeUserPassword(req.params.id, password);
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to change password',
    });
  }
};

export const getAllowedPagesController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const targetUserId = req.params.id;
    const pages = await getAllowedPages(targetUserId);
    res.status(200).json({
      status: 'success',
      data: pages,
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch allowed pages',
    });
  }
};
