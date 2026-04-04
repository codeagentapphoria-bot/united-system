import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  emitAppointmentNew,
  emitAppointmentUpdate,
  emitNewTransaction,
  emitTransactionUpdate,
} from '../services/socket.service';
import {
  adminRequestTransactionUpdate,
  createTransaction,
  getAppointments,
  getServiceStatistics,
  getTransaction,
  getTransactions,
  getTransactionsByService,
  requestTransactionUpdate,
  reviewTransactionUpdateRequest,
  updateTransaction,
  type GetTransactionsByServiceFilters,
} from '../services/transaction.service';

export const createTransactionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Verify subscriber can only create transactions for themselves
    if (req.user?.type === 'subscriber' && req.body.subscriberId !== req.user.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    const transaction = await createTransaction(req.body);

    // Emit WebSocket event for new transaction with full data
    emitNewTransaction({
      id: transaction.id,
      subscriberId: transaction.subscriberId,
      transactionId: transaction.transactionId,
      serviceId: transaction.serviceId,
      status: transaction.status || undefined,
      paymentStatus: transaction.paymentStatus,
      paymentAmount: transaction.paymentAmount ? Number(transaction.paymentAmount) : undefined,
      referenceNumber: transaction.referenceNumber,
      createdAt: transaction.createdAt,
      serviceCode: transaction.service?.code,
    });

    // Emit appointment:new event if transaction has an appointment
    if (transaction.preferredAppointmentDate) {
      emitAppointmentNew({
        transactionId: transaction.id,
        serviceId: transaction.serviceId,
        serviceCode: transaction.service?.code,
        appointmentDate: transaction.preferredAppointmentDate,
        appointmentStatus: transaction.appointmentStatus || 'PENDING',
        subscriberId: transaction.subscriberId,
      });
    }

    res.status(201).json({
      status: 'success',
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create transaction',
    });
  }
};

export const getTransactionsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subscriberId = req.params.subscriberId;

    // Verify ownership for subscribers
    if (req.user?.type === 'subscriber' && subscriberId !== req.user.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    const serviceId = req.query.serviceId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await getTransactions(subscriberId, serviceId, page, limit);

    res.status(200).json({
      status: 'success',
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch transactions',
    });
  }
};

export const getTransactionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userType = req.user?.type;
    const userId = req.user?.id;
    const transaction = await getTransaction(req.params.id, userType, userId);

    // Verify ownership for subscribers
    if (req.user?.type === 'subscriber' && transaction.subscriberId !== req.user.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: transaction,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Transaction not found',
    });
  }
};

export const updateTransactionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Get old transaction before update for incremental updates
    const { getTransaction } = await import('../services/transaction.service');
    const oldTransaction = await getTransaction(req.params.id);

    const transaction = await updateTransaction(req.params.id, req.body);

    // Emit WebSocket event for transaction update with old values
    emitTransactionUpdate(transaction.id, {
      status: transaction.status || undefined,
      paymentStatus: transaction.paymentStatus,
      appointmentStatus: transaction.appointmentStatus || undefined,
      updatedAt: transaction.updatedAt,
      // Old values for incremental updates
      oldStatus: oldTransaction.status || undefined,
      oldPaymentStatus: oldTransaction.paymentStatus,
      updateRequestStatus: transaction.updateRequestStatus || undefined,
      oldUpdateRequestStatus: oldTransaction.updateRequestStatus || undefined,
      serviceId: transaction.serviceId,
      serviceCode: transaction.service?.code,
      paymentAmount: transaction.paymentAmount ? Number(transaction.paymentAmount) : undefined,
    });

    // Emit appointment:update event if appointment status changed
    if (
      oldTransaction.appointmentStatus !== transaction.appointmentStatus ||
      oldTransaction.preferredAppointmentDate?.getTime() !==
        transaction.preferredAppointmentDate?.getTime()
    ) {
      emitAppointmentUpdate(transaction.id, {
        appointmentStatus: transaction.appointmentStatus || undefined,
        appointmentDate:
          transaction.preferredAppointmentDate || transaction.scheduledAppointmentDate,
        oldAppointmentStatus: oldTransaction.appointmentStatus || undefined,
        serviceId: transaction.serviceId,
        serviceCode: transaction.service?.code,
        subscriberId: transaction.subscriberId,
        updatedAt: transaction.updatedAt,
      });
    }

    res.status(200).json({
      status: 'success',
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update transaction',
    });
  }
};

export const downloadTransactionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transaction = await getTransaction(req.params.id);

    // Verify ownership for subscribers
    if (req.user?.type === 'subscriber' && transaction.subscriberId !== req.user.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    // TODO: Implement document generation and download
    // For now, return transaction data
    res.status(200).json({
      status: 'success',
      message: 'Download functionality to be implemented',
      data: transaction,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Transaction not found',
    });
  }
};

export const getTransactionsByServiceController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const serviceCode = req.params.serviceCode.toUpperCase();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const filters: GetTransactionsByServiceFilters = {};

    if (req.query.paymentStatus) {
      filters.paymentStatus = req.query.paymentStatus as string;
    }
    if (req.query.status) {
      filters.status = req.query.status as string;
    }
    if (req.query.isResidentOfBorongan !== undefined) {
      filters.isResidentOfBorongan = req.query.isResidentOfBorongan === 'true';
    }
    if (req.query.search) {
      filters.search = req.query.search as string;
    }
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    if (req.query.serviceData) {
      try {
        filters.serviceData = JSON.parse(req.query.serviceData as string);
      } catch (error) {
        // Invalid JSON, ignore
      }
    }

    const result = await getTransactionsByService(serviceCode, filters, page, limit);

    res.status(200).json({
      status: 'success',
      data: result.transactions,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch transactions',
    });
  }
};

export const getServiceStatisticsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const serviceCode = req.params.serviceCode.toUpperCase();

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (req.query.startDate) {
      // Parse date string and set to start of day in local timezone
      const dateStr = req.query.startDate as string;
      const [year, month, day] = dateStr.split('-').map(Number);
      startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    }
    if (req.query.endDate) {
      // Parse date string and set to end of day in local timezone
      const dateStr = req.query.endDate as string;
      const [year, month, day] = dateStr.split('-').map(Number);
      endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    }

    const statistics = await getServiceStatistics(serviceCode, startDate, endDate);

    res.status(200).json({
      status: 'success',
      data: statistics,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch statistics',
    });
  }
};

export const requestTransactionUpdateController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transactionId = req.params.id;
    const { description, serviceData, preferredAppointmentDate } = req.body;

    if (!req.user || req.user.type !== 'subscriber') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    const transaction = await requestTransactionUpdate(
      transactionId,
      req.user.id,
      description,
      serviceData,
      preferredAppointmentDate
    );

    res.status(200).json({
      status: 'success',
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to request transaction update',
    });
  }
};

export const adminRequestTransactionUpdateController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transactionId = req.params.id;
    const { description } = req.body;

    if (!req.user || req.user.type !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    const transaction = await adminRequestTransactionUpdate(transactionId, description);

    res.status(200).json({
      status: 'success',
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to request transaction update',
    });
  }
};

export const reviewTransactionUpdateRequestController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transactionId = req.params.id;
    const { approved } = req.body;

    if (!req.user || req.user.type !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    const transaction = await reviewTransactionUpdateRequest(transactionId, approved);

    res.status(200).json({
      status: 'success',
      data: transaction,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to review transaction update request',
    });
  }
};

export const getAppointmentsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const date = req.query.date ? new Date(req.query.date as string) : undefined;

    const appointments = await getAppointments(startDate, endDate, date);

    res.status(200).json({
      status: 'success',
      data: appointments,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get appointments',
    });
  }
};
