import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  reassessTax,
  getReassessmentHistory,
  getReassessmentComparison,
} from '../services/tax-reassessment.service';

export const reassessTaxController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await reassessTax(req.params.transactionId, {
      ...req.body,
      computedBy: req.user?.id || '',
    });
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to reassess tax',
    });
  }
};

export const getReassessmentHistoryController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const history = await getReassessmentHistory(req.params.transactionId);
    res.status(200).json({
      status: 'success',
      data: history,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get reassessment history',
    });
  }
};

export const getReassessmentComparisonController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const comparison = await getReassessmentComparison(req.params.computationId);
    res.status(200).json({
      status: 'success',
      data: comparison,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get reassessment comparison',
    });
  }
};
