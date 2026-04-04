import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  createExemptionRequest,
  approveExemption,
  rejectExemption,
  getExemptionsByTransaction,
  getExemption,
  getPendingExemptions,
} from '../services/exemption.service';

export const createExemptionRequestController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const exemption = await createExemptionRequest({
      ...req.body,
      requestedBy: req.user?.id || '',
    });
    res.status(201).json({
      status: 'success',
      data: exemption,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create exemption request',
    });
  }
};

export const getExemptionsByTransactionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const exemptions = await getExemptionsByTransaction(req.params.transactionId);
    res.status(200).json({
      status: 'success',
      data: exemptions,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get exemptions',
    });
  }
};

export const getExemptionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const exemption = await getExemption(req.params.id);
    res.status(200).json({
      status: 'success',
      data: exemption,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Exemption not found',
    });
  }
};

export const getPendingExemptionsController = async (
  _req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const exemptions = await getPendingExemptions();
    res.status(200).json({
      status: 'success',
      data: exemptions,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get pending exemptions',
    });
  }
};

export const approveExemptionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const exemption = await approveExemption(req.params.id, {
      ...req.body,
      approvedBy: req.user?.id || '',
    });
    res.status(200).json({
      status: 'success',
      data: exemption,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to approve exemption',
    });
  }
};

export const rejectExemptionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const exemption = await rejectExemption(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: exemption,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to reject exemption',
    });
  }
};
