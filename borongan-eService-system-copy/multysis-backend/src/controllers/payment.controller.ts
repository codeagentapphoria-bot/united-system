import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  recordPayment,
  getPaymentsByTransaction,
  calculateBalance,
  getPayment,
} from '../services/payment.service';

export const recordPaymentController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payment = await recordPayment({
      ...req.body,
      receivedBy: req.user?.id || '',
      paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : undefined,
    });
    res.status(201).json({
      status: 'success',
      data: payment,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to record payment',
    });
  }
};

export const getPaymentsByTransactionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payments = await getPaymentsByTransaction(req.params.transactionId);
    res.status(200).json({
      status: 'success',
      data: payments,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get payments',
    });
  }
};

export const getBalanceController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get active tax computation for the transaction
    const { getActiveTaxComputation } = await import('../services/tax-computation.service');
    const computation = await getActiveTaxComputation(req.params.transactionId);

    if (!computation) {
      res.status(404).json({
        status: 'error',
        message: 'No active tax computation found for this transaction',
      });
      return;
    }

    const balance = await calculateBalance(req.params.transactionId, computation.id);
    res.status(200).json({
      status: 'success',
      data: balance,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to calculate balance',
    });
  }
};

export const getPaymentController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payment = await getPayment(req.params.id);
    res.status(200).json({
      status: 'success',
      data: payment,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Payment not found',
    });
  }
};
