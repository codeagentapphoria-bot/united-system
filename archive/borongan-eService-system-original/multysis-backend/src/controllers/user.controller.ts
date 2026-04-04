import { Response } from 'express';
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserPassword,
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

export const getUsersController = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await getUsers();
    res.status(200).json({
      status: 'success',
      data: users,
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
    res.status(400).json({
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
    res.status(400).json({
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
