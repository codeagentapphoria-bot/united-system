import { Response } from 'express';
import prisma from '../config/database';
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
    // Residents can only create transactions for themselves.
    // Guest submissions (no residentId) are allowed without auth.
    if (req.user?.type === 'resident' && req.body.residentId && req.body.residentId !== req.user.id) {
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
      residentId: transaction.residentId ?? '',
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
        residentId: transaction.residentId ?? '',
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

// GET /api/transactions/track/:referenceNumber — public, no auth
// Returns minimal status info for any transaction (guest or resident).
export const trackTransactionController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { referenceNumber: req.params.referenceNumber },
      select: {
        transactionId:     true,
        referenceNumber:   true,
        status:            true,
        paymentStatus:     true,
        paymentAmount:     true,
        applicationDate:   true,
        appointmentStatus: true,
        createdAt:         true,
        updatedAt:         true,
        applicantName:     true,
        applicantEmail:    true,
        resident: { select: { firstName: true, lastName: true } },
        service:  { select: { id: true, name: true, code: true, description: true } },
      },
    });

    if (!transaction) {
      res.status(404).json({ status: 'error', message: 'Transaction not found' });
      return;
    }

    const applicantName = transaction.applicantName
      ?? (transaction.resident
          ? `${transaction.resident.firstName} ${transaction.resident.lastName}`
          : 'Unknown');

    res.status(200).json({
      status: 'success',
      data: {
        transactionId:     transaction.transactionId,
        referenceNumber:   transaction.referenceNumber,
        status:            transaction.status,
        paymentStatus:     transaction.paymentStatus,
        paymentAmount:     transaction.paymentAmount,
        appointmentStatus: transaction.appointmentStatus,
        applicationDate:   transaction.applicationDate,
        createdAt:         transaction.createdAt,
        updatedAt:         transaction.updatedAt,
        applicantName,
        service:           transaction.service,
        isGuest:           !transaction.resident,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getTransactionsController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const residentId = req.params.residentId;

    // Verify ownership for residents
    if (req.user?.type === 'resident' && residentId !== req.user.id) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    const serviceId = req.query.serviceId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await getTransactions(residentId, serviceId, page, limit, status, search);

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
    const transaction = await getTransaction(req.params.id, userType as any, userId);

    // Residents can only access their own transactions.
    // Guest (null residentId) transactions are publicly accessible via referenceNumber.
    if (req.user?.type === 'resident' && transaction.residentId !== null && transaction.residentId !== req.user.id) {
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
          (transaction.preferredAppointmentDate || transaction.scheduledAppointmentDate) ?? undefined,
        oldAppointmentStatus: oldTransaction.appointmentStatus || undefined,
        serviceId: transaction.serviceId,
        serviceCode: transaction.service?.code,
      residentId: transaction.residentId ?? '',
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

    // Residents can only download their own transactions.
    if (req.user?.type === 'resident' && transaction.residentId !== null && transaction.residentId !== req.user.id) {
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
    if (req.query.isLocalResident !== undefined) {
      filters.isLocalResident = req.query.isLocalResident === 'true';
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

    if (!req.user || req.user.type !== 'resident') {
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
