import { Response } from 'express';
import { MedicineRequestStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import {
  getMedicineRequests,
  getMedicineRequest,
  getMedicineRequestStats,
  updateMedicineRequestStatus,
} from '../services/medicine-request.service';

export const getMedicineRequestsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const status = req.query.status as MedicineRequestStatus | undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await getMedicineRequests({ status, search, page, limit });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch medicine requests',
    });
  }
};

export const getMedicineRequestController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await getMedicineRequest(id);

    res.status(200).json({
      status: 'success',
      data: request,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Medicine request not found',
    });
  }
};

export const getMedicineRequestStatsController = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const stats = await getMedicineRequestStats();

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch medicine request stats',
    });
  }
};

export const updateMedicineRequestStatusController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status: newStatus, note } = req.body;
    const adminId = req.user!.id;

    const updated = await updateMedicineRequestStatus(
      id,
      newStatus as MedicineRequestStatus,
      adminId,
      note
    );

    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (error: any) {
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Failed to update medicine request status',
    });
  }
};
