import prisma from '../config/database';
import { CustomError } from '../middleware/error';
import { addDevLog } from './dev.service';
import {
  getAppointmentCancellationEmail,
  getAppointmentConfirmationEmail,
  getAppointmentReschedulingEmail,
} from './email-templates/appointment-notifications';
import {
  getDocumentReadyEmail,
  getPaymentStatusChangeEmail,
  getTransactionStatusUpdateEmail,
} from './email-templates/transaction-notifications';
import { sendEmailSafely } from './email.service';
import { Prisma } from '@prisma/client';
import { computeTaxForTransaction } from './tax-computation.service';

export interface CreateTransactionData {
  subscriberId: string;
  serviceId: string;
  paymentAmount?: number;
  isResidentOfBorongan?: boolean;
  permitType?: string;
  validIdToPresent?: string;
  remarks?: string;
  serviceData?: Record<string, unknown>; // Dynamic service-specific data
  preferredAppointmentDate?: Date; // User's preferred appointment date/time
  applicationDate?: Date; // Date application was actually submitted (for tax version selection)
}

const generateTransactionId = (serviceCode: string, year: number, count: number): string => {
  const prefix = serviceCode.substring(0, 2).toUpperCase();
  return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
};

const generateReferenceNumber = (serviceCode: string, year: number, count: number): string => {
  const prefix = serviceCode.substring(0, 2).toUpperCase();
  return `REF-${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
};

export const createTransaction = async (data: CreateTransactionData) => {
  // Verify subscriber exists
  const subscriber = await prisma.subscriber.findUnique({
    where: { id: data.subscriberId },
  });

  if (!subscriber) {
    throw new Error('Subscriber not found');
  }

  // Verify service exists
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  if (!service.isActive) {
    throw new Error('Service is not active');
  }

  // Check for appointment conflicts if service requires appointment
  if (service.requiresAppointment && data.preferredAppointmentDate) {
    const appointmentDate = new Date(data.preferredAppointmentDate);
    const appointmentDuration = service.appointmentDuration || 30; // Default to 30 minutes if not specified
    const appointmentEndTime = new Date(appointmentDate.getTime() + appointmentDuration * 60000);

    // Additional check: Ensure appointment is not in the past
    if (appointmentDate < new Date()) {
      throw new CustomError('Appointment date cannot be in the past', 400);
    }

    // Find potential conflicting appointments (within a time window)
    // We check appointments that start within a window that could overlap
    // The window is: [newStart - service.appointmentDuration, newEnd + service.appointmentDuration]
    // This captures appointments that might overlap before or after
    const timeWindowStart = new Date(appointmentDate.getTime() - appointmentDuration * 60000);
    const timeWindowEnd = new Date(appointmentEndTime.getTime() + appointmentDuration * 60000);

    const potentialConflicts = await prisma.transaction.findMany({
      where: {
        serviceId: data.serviceId,
        preferredAppointmentDate: {
          not: null,
          gte: timeWindowStart,
          lte: timeWindowEnd,
        },
        appointmentStatus: {
          in: ['PENDING', 'ACCEPTED', 'REQUESTED_UPDATE'],
        },
      },
      include: {
        service: {
          select: {
            appointmentDuration: true,
          },
        },
      },
    });

    // Check for actual overlaps considering appointment durations
    for (const existingAppointment of potentialConflicts) {
      if (!existingAppointment.preferredAppointmentDate) continue;

      const existingStart = new Date(existingAppointment.preferredAppointmentDate);
      const existingDuration =
        existingAppointment.service.appointmentDuration || appointmentDuration;
      const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);

      // Two appointments overlap if:
      // newStart < existingEnd AND newEnd > existingStart
      if (appointmentDate < existingEnd && appointmentEndTime > existingStart) {
        const formattedDate = appointmentDate.toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        throw new CustomError(
          `The requested appointment time slot (${formattedDate}) is already reserved. Please choose a different time.`,
          409
        );
      }
    }
  }

  const year = new Date().getFullYear();
  const count = await prisma.transaction.count({
    where: {
      serviceId: data.serviceId,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  const transactionId = generateTransactionId(service.code, year, count);
  const referenceNumber = generateReferenceNumber(service.code, year, count);

  // Determine default payment status from service
  const paymentStatuses = service.paymentStatuses as string[] | null;
  const defaultPaymentStatus =
    paymentStatuses && Array.isArray(paymentStatuses) && paymentStatuses.length > 0
      ? paymentStatuses[0]
      : 'PENDING';

  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      subscriberId: data.subscriberId,
      serviceId: data.serviceId,
      transactionId,
      referenceNumber,
      paymentStatus: defaultPaymentStatus,
      paymentAmount: data.paymentAmount || service.defaultAmount || 0,
      isResidentOfBorongan: data.isResidentOfBorongan ?? false,
      permitType: data.permitType,
      validIdToPresent: data.validIdToPresent,
      remarks: data.remarks,
      serviceData: data.serviceData ? (data.serviceData as Prisma.InputJsonValue) : Prisma.JsonNull,
      applicationDate: data.applicationDate || null, // Defaults to createdAt if not provided
      preferredAppointmentDate: data.preferredAppointmentDate || null,
      appointmentStatus:
        service.requiresAppointment && data.preferredAppointmentDate ? 'PENDING' : null,
      referenceNumberGeneratedAt: new Date(),
      status: 'Pending',
      isPosted: false,
    },
  });

  // Compute tax if service has a tax profile
  try {
    const serviceWithTaxProfile = await prisma.service.findUnique({
      where: { id: service.id },
      include: {
        taxProfiles: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (serviceWithTaxProfile && serviceWithTaxProfile.taxProfiles.length > 0) {
      // Compute tax for the transaction
      await computeTaxForTransaction(transaction.id);
    }
  } catch (error: any) {
    // Log error but don't fail transaction creation
    // Tax computation can be retried later
    console.error('Failed to compute tax for transaction:', error.message);
    addDevLog('error', 'Tax computation failed', {
      transactionId: transaction.id,
      error: error.message,
    });
  }

  return (prisma as any).transaction.findUnique({
    where: { id: transaction.id },
    include: {
      subscriber: {
        include: {
          citizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
          nonCitizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
        },
      },
      service: true,
      taxComputations: {
        where: { isActive: true },
        take: 1,
        include: {
          taxProfileVersion: {
            include: {
              taxProfile: {
                include: {
                  service: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
};

export const getTransactions = async (
  subscriberId: string,
  serviceId?: string,
  page: number = 1,
  limit: number = 10
) => {
  const where: any = { subscriberId };
  if (serviceId) {
    where.serviceId = serviceId;
  }

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        service: true,
        taxComputations: {
          where: { isActive: true },
          take: 1,
          include: {
            payments: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.count({ where }),
  ]);

  // Calculate balance for each transaction with tax computation
  const transactionsWithTaxData = await Promise.all(
    transactions.map(async (transaction) => {
      if (transaction.taxComputations && transaction.taxComputations.length > 0) {
        const taxComputation = transaction.taxComputations[0];
        const totalTax = Number(taxComputation.adjustedTax ?? taxComputation.totalTax);
        const totalPaid = taxComputation.payments.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0
        );
        const balance = Math.max(0, totalTax - totalPaid);

        return {
          ...transaction,
          taxComputation: {
            id: taxComputation.id,
            totalTax: taxComputation.totalTax,
            adjustedTax: taxComputation.adjustedTax,
            exemptionsApplied: taxComputation.exemptionsApplied,
            discountsApplied: taxComputation.discountsApplied,
            penaltiesApplied: taxComputation.penaltiesApplied,
            balance: {
              totalTax,
              totalPaid,
              balance,
            },
          },
        };
      }
      return transaction;
    })
  );

  return {
    transactions: transactionsWithTaxData,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getTransaction = async (
  id: string,
  userType?: 'admin' | 'subscriber' | 'dev',
  _userId?: string
) => {
  const transaction = await (prisma as any).transaction.findUnique({
    where: { id },
    include: {
      subscriber: {
        include: {
          citizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
          nonCitizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
        },
      },
      service: true,
      appointmentNotes: {
        orderBy: { createdAt: 'desc' },
      },
      transactionNotes: {
        where: userType === 'subscriber' ? { isInternal: false } : undefined,
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  return transaction;
};

export const updateTransaction = async (
  id: string,
  data: {
    paymentStatus?: string;
    paymentAmount?: number;
    status?: string;
    isPosted?: boolean;
    remarks?: string;
    serviceData?: Record<string, unknown>;
    appointmentStatus?: string;
    scheduledAppointmentDate?: Date;
    updateRequestStatus?: string;
    adminUpdateRequestDescription?: string;
  }
) => {
  // Get old transaction state for comparison
  const oldTransaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      subscriber: {
        include: {
          citizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
          nonCitizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
        },
      },
      service: true,
    },
  });

  if (!oldTransaction) {
    throw new Error('Transaction not found');
  }

  const updateData: Record<string, unknown> = {
    ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
    ...(data.paymentAmount !== undefined && { paymentAmount: data.paymentAmount }),
    ...(data.status && { status: data.status }),
    ...(data.isPosted !== undefined && { isPosted: data.isPosted }),
    ...(data.remarks !== undefined && { remarks: data.remarks }),
    ...(data.serviceData !== undefined && {
      serviceData: data.serviceData ? (data.serviceData as Prisma.InputJsonValue) : Prisma.JsonNull,
    }),
    ...(data.appointmentStatus && { appointmentStatus: data.appointmentStatus }),
    ...(data.scheduledAppointmentDate && {
      scheduledAppointmentDate: data.scheduledAppointmentDate,
    }),
    ...(data.updateRequestStatus && { updateRequestStatus: data.updateRequestStatus }),
    ...(data.adminUpdateRequestDescription && {
      adminUpdateRequestDescription: data.adminUpdateRequestDescription,
    }),
  };

  const updatedTransaction = await (prisma as any).transaction.update({
    where: { id },
    data: updateData,
    include: {
      subscriber: {
        include: {
          citizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
          nonCitizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
        },
      },
      service: true,
    },
  });

  // Log transaction updates
  const changes: string[] = [];
  if (data.status && data.status !== oldTransaction.status) {
    changes.push(`status: ${oldTransaction.status} → ${data.status}`);
  }
  if (data.paymentStatus && data.paymentStatus !== oldTransaction.paymentStatus) {
    changes.push(`paymentStatus: ${oldTransaction.paymentStatus} → ${data.paymentStatus}`);
  }
  if (data.appointmentStatus && data.appointmentStatus !== oldTransaction.appointmentStatus) {
    changes.push(
      `appointmentStatus: ${oldTransaction.appointmentStatus} → ${data.appointmentStatus}`
    );
  }
  if (changes.length > 0) {
    addDevLog('info', 'Transaction updated', {
      transactionId: id,
      transactionNumber: oldTransaction.transactionId,
      subscriberId: oldTransaction.subscriberId,
      changes: changes.join(', '),
    });
  }

  // Send email notifications (non-blocking)
  try {
    const subscriber = updatedTransaction.subscriber;
    const subscriberName = subscriber.citizen
      ? `${subscriber.citizen.firstName} ${subscriber.citizen.lastName}`
      : `${subscriber.nonCitizen.firstName} ${subscriber.nonCitizen.lastName}`;
    const subscriberEmail = subscriber.citizen?.email || subscriber.nonCitizen?.email;

    if (subscriberEmail) {
      // Payment status change notification
      if (data.paymentStatus && data.paymentStatus !== oldTransaction.paymentStatus) {
        const emailData = {
          subscriberName,
          transactionId: updatedTransaction.transactionId,
          referenceNumber: updatedTransaction.referenceNumber,
          serviceName: updatedTransaction.service.name,
          paymentStatus: data.paymentStatus,
          paymentAmount: updatedTransaction.paymentAmount
            ? Number(updatedTransaction.paymentAmount)
            : undefined,
          status: updatedTransaction.status || undefined,
          remarks: data.remarks || updatedTransaction.remarks || undefined,
        };

        // Special handling for document ready statuses
        if (['FOR_PICK_UP', 'RELEASED'].includes(data.paymentStatus)) {
          const { subject, html, text } = getDocumentReadyEmail(emailData);
          await sendEmailSafely(subscriberEmail, subject, html, text);
        } else {
          const { subject, html, text } = getPaymentStatusChangeEmail(emailData);
          await sendEmailSafely(subscriberEmail, subject, html, text);
        }
      }

      // Generic status change notification
      if (data.status && data.status !== oldTransaction.status) {
        const emailData = {
          subscriberName,
          transactionId: updatedTransaction.transactionId,
          referenceNumber: updatedTransaction.referenceNumber,
          serviceName: updatedTransaction.service.name,
          paymentStatus: updatedTransaction.paymentStatus,
          paymentAmount: updatedTransaction.paymentAmount
            ? Number(updatedTransaction.paymentAmount)
            : undefined,
          status: data.status,
          remarks: data.remarks || updatedTransaction.remarks || undefined,
        };

        const { subject, html, text } = getTransactionStatusUpdateEmail(emailData);
        await sendEmailSafely(subscriberEmail, subject, html, text);
      }

      // Appointment status change notifications
      if (data.appointmentStatus && data.appointmentStatus !== oldTransaction.appointmentStatus) {
        const appointmentData = {
          subscriberName,
          transactionId: updatedTransaction.transactionId,
          referenceNumber: updatedTransaction.referenceNumber,
          serviceName: updatedTransaction.service.name,
          preferredDate: oldTransaction.preferredAppointmentDate?.toISOString(),
          scheduledDate: updatedTransaction.scheduledAppointmentDate?.toISOString(),
          appointmentStatus: data.appointmentStatus,
          remarks: data.remarks || updatedTransaction.remarks || undefined,
        };

        if (data.appointmentStatus === 'ACCEPTED') {
          const { subject, html, text } = getAppointmentConfirmationEmail(appointmentData);
          await sendEmailSafely(subscriberEmail, subject, html, text);
        } else if (
          data.appointmentStatus === 'CANCELLED' ||
          data.appointmentStatus === 'DECLINED'
        ) {
          const { subject, html, text } = getAppointmentCancellationEmail(appointmentData);
          await sendEmailSafely(subscriberEmail, subject, html, text);
        } else if (data.appointmentStatus === 'REQUESTED_UPDATE' && data.scheduledAppointmentDate) {
          const { subject, html, text } = getAppointmentReschedulingEmail(appointmentData);
          await sendEmailSafely(subscriberEmail, subject, html, text);
        }
      }

      // Appointment scheduled notification
      if (data.scheduledAppointmentDate && !oldTransaction.scheduledAppointmentDate) {
        const appointmentData = {
          subscriberName,
          transactionId: updatedTransaction.transactionId,
          referenceNumber: updatedTransaction.referenceNumber,
          serviceName: updatedTransaction.service.name,
          preferredDate: oldTransaction.preferredAppointmentDate?.toISOString(),
          scheduledDate: updatedTransaction.scheduledAppointmentDate?.toISOString(),
          appointmentStatus: updatedTransaction.appointmentStatus || 'ACCEPTED',
          remarks: data.remarks || updatedTransaction.remarks || undefined,
        };

        const { subject, html, text } = getAppointmentConfirmationEmail(appointmentData);
        await sendEmailSafely(subscriberEmail, subject, html, text);
      }

      // Update request status change notification
      if (
        data.updateRequestStatus &&
        data.updateRequestStatus !== oldTransaction.updateRequestStatus
      ) {
        if (['APPROVED', 'REJECTED'].includes(data.updateRequestStatus)) {
          const emailContent = {
            subscriberName,
            transactionId: updatedTransaction.transactionId,
            referenceNumber: updatedTransaction.referenceNumber,
            serviceName: updatedTransaction.service.name,
            paymentStatus: updatedTransaction.paymentStatus,
            status: updatedTransaction.status || undefined,
            remarks:
              data.adminUpdateRequestDescription ||
              data.remarks ||
              updatedTransaction.remarks ||
              undefined,
          };

          const updateEmailData = {
            ...emailContent,
            nextSteps:
              data.updateRequestStatus === 'APPROVED'
                ? 'Your transaction has been updated. Please check your portal for the latest information.'
                : 'Please review the remarks and contact support if you have questions.',
          };
          const { subject, html, text } = getTransactionStatusUpdateEmail(updateEmailData);

          await sendEmailSafely(subscriberEmail, subject, html, text);
        }
      }
    }
  } catch (error: any) {
    // Log error but don't fail the transaction update
    console.error('Failed to send transaction update email:', error.message);
  }

  return updatedTransaction;
};

export interface GetTransactionsByServiceFilters {
  paymentStatus?: string;
  status?: string;
  isResidentOfBorongan?: boolean;
  search?: string; // Search by reference number, transaction ID, or subscriber name
  startDate?: Date;
  endDate?: Date;
  serviceData?: Record<string, string>; // Filter by serviceData fields (e.g., { businessType: 'retail' })
}

export const getTransactionsByService = async (
  serviceCode: string,
  filters: GetTransactionsByServiceFilters = {},
  page: number = 1,
  limit: number = 10
) => {
  // First, get the service by code
  const service = await prisma.service.findUnique({
    where: { code: serviceCode },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const where: any = {
    serviceId: service.id,
  };

  // Apply filters
  if (filters.paymentStatus) {
    where.paymentStatus = filters.paymentStatus;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.isResidentOfBorongan !== undefined) {
    where.isResidentOfBorongan = filters.isResidentOfBorongan;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.createdAt.lte = filters.endDate;
    }
  }

  // Search functionality
  if (filters.search) {
    where.OR = [
      { referenceNumber: { contains: filters.search, mode: 'insensitive' } },
      { transactionId: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Extract serviceData filters - we'll apply these after fetching
  const serviceDataFilters =
    filters.serviceData && Object.keys(filters.serviceData).length > 0
      ? filters.serviceData
      : undefined;

  // Helper function to filter transactions by serviceData
  const filterByServiceData = (txns: any[]) => {
    if (!serviceDataFilters || Object.keys(serviceDataFilters).length === 0) {
      return txns;
    }

    return txns.filter((transaction: any) => {
      if (!transaction.serviceData) return false;

      // Check if all serviceData filter conditions match
      return Object.entries(serviceDataFilters).every(([key, value]) => {
        return transaction.serviceData[key] === value;
      });
    });
  };

  const skip = (page - 1) * limit;

  // Fetch all matching transactions (we'll apply serviceData filters in memory)
  let [allTransactions, total] = await Promise.all([
    (prisma as any).transaction.findMany({
      where,
      include: {
        subscriber: {
          include: {
            citizen: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              },
            },
            nonCitizen: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
        service: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.count({ where }),
  ]);

  // Apply serviceData filters if provided
  let transactions = filterByServiceData(allTransactions);

  // Recalculate total after serviceData filtering
  if (serviceDataFilters && Object.keys(serviceDataFilters).length > 0) {
    total = transactions.length;
  }

  // Apply pagination
  transactions = transactions.slice(skip, skip + limit);

  // Fetch tax computations for the paginated transactions
  const transactionIds = transactions.map((t: any) => t.id);
  const taxComputations = await prisma.taxComputation.findMany({
    where: {
      transactionId: { in: transactionIds },
      isActive: true,
    },
    include: {
      payments: true,
    },
  });

  // Create a map of transactionId -> taxComputation
  const taxComputationMap = new Map();
  taxComputations.forEach((tc) => {
    const totalTax = Number(tc.adjustedTax ?? tc.totalTax);
    const totalPaid = tc.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const balance = Math.max(0, totalTax - totalPaid);

    taxComputationMap.set(tc.transactionId, {
      id: tc.id,
      totalTax: tc.totalTax,
      adjustedTax: tc.adjustedTax,
      exemptionsApplied: tc.exemptionsApplied,
      discountsApplied: tc.discountsApplied,
      penaltiesApplied: tc.penaltiesApplied,
      balance: {
        totalTax,
        totalPaid,
        balance,
      },
    });
  });

  // Attach tax computation data to transactions
  const transactionsWithTaxData = transactions.map((transaction: any) => {
    const taxComputation = taxComputationMap.get(transaction.id);
    if (taxComputation) {
      return {
        ...transaction,
        taxComputation,
      };
    }
    return transaction;
  });

  // If search is provided, also filter by subscriber name
  if (filters.search && transactions.length < limit) {
    const subscriberWhere: any = {
      serviceId: service.id,
    };

    if (filters.paymentStatus) {
      subscriberWhere.paymentStatus = filters.paymentStatus;
    }
    if (filters.status) {
      subscriberWhere.status = filters.status;
    }
    if (filters.isResidentOfBorongan !== undefined) {
      subscriberWhere.isResidentOfBorongan = filters.isResidentOfBorongan;
    }
    if (filters.startDate || filters.endDate) {
      subscriberWhere.createdAt = {};
      if (filters.startDate) {
        subscriberWhere.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        subscriberWhere.createdAt.lte = filters.endDate;
      }
    }

    subscriberWhere.OR = [
      {
        subscriber: {
          citizen: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { phoneNumber: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      },
      {
        subscriber: {
          nonCitizen: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { phoneNumber: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];

    const subscriberTransactions = await (prisma as any).transaction.findMany({
      where: subscriberWhere,
      include: {
        subscriber: {
          include: {
            citizen: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              },
            },
            nonCitizen: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
        service: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Merge and deduplicate
    const transactionMap = new Map();
    [...allTransactions, ...subscriberTransactions].forEach((t) => {
      transactionMap.set(t.id, t);
    });
    let mergedTransactions = Array.from(transactionMap.values());

    // Apply serviceData filters to merged results
    mergedTransactions = filterByServiceData(mergedTransactions);

    // Recalculate total after filtering
    const mergedTotal = mergedTransactions.length;

    // Fetch tax computations for merged transactions
    const mergedTransactionIds = mergedTransactions.map((t: any) => t.id);
    const mergedTaxComputations = await prisma.taxComputation.findMany({
      where: {
        transactionId: { in: mergedTransactionIds },
        isActive: true,
      },
      include: {
        payments: true,
      },
    });

    // Create a map of transactionId -> taxComputation
    const mergedTaxComputationMap = new Map();
    mergedTaxComputations.forEach((tc) => {
      const totalTax = Number(tc.adjustedTax ?? tc.totalTax);
      const totalPaid = tc.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const balance = Math.max(0, totalTax - totalPaid);

      mergedTaxComputationMap.set(tc.transactionId, {
        id: tc.id,
        totalTax: tc.totalTax,
        adjustedTax: tc.adjustedTax,
        exemptionsApplied: tc.exemptionsApplied,
        discountsApplied: tc.discountsApplied,
        penaltiesApplied: tc.penaltiesApplied,
        balance: {
          totalTax,
          totalPaid,
          balance,
        },
      });
    });

    // Attach tax computation data to merged transactions
    const mergedTransactionsWithTaxData = mergedTransactions.map((transaction: any) => {
      const taxComputation = mergedTaxComputationMap.get(transaction.id);
      if (taxComputation) {
        return {
          ...transaction,
          taxComputation,
        };
      }
      return transaction;
    });

    return {
      transactions: mergedTransactionsWithTaxData.slice(skip, skip + limit),
      pagination: {
        page,
        limit,
        total: mergedTotal,
        totalPages: Math.ceil(mergedTotal / limit),
      },
    };
  }

  return {
    transactions: transactionsWithTaxData,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export interface ServiceStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  byPaymentStatus: Record<string, number>;
  totalRevenue: number;
  byDate: Array<{ date: string; count: number; revenue: number }>;
}

export const getServiceStatistics = async (
  serviceCode: string,
  startDate?: Date,
  endDate?: Date
): Promise<ServiceStatistics> => {
  // Get the service by code
  const service = await prisma.service.findUnique({
    where: { code: serviceCode },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const where: any = {
    serviceId: service.id,
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  // Get all transactions for the service
  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      paymentStatus: true,
      paymentAmount: true,
      status: true,
      createdAt: true,
    },
  });

  // Calculate statistics
  const total = transactions.length;
  const pending = transactions.filter((t) => t.status === 'Pending' || !t.status).length;
  const approved = transactions.filter(
    (t) => t.status === 'Approved' || t.status === 'Completed'
  ).length;
  const rejected = transactions.filter((t) => t.status === 'Rejected').length;
  const cancelled = transactions.filter((t) => t.status === 'Cancelled').length;

  // Group by payment status
  const byPaymentStatus: Record<string, number> = {};
  transactions.forEach((t) => {
    const status = t.paymentStatus || 'UNKNOWN';
    byPaymentStatus[status] = (byPaymentStatus[status] || 0) + 1;
  });

  // Calculate total revenue
  const totalRevenue = transactions.reduce((sum, t) => {
    const amount =
      typeof t.paymentAmount === 'string'
        ? parseFloat(t.paymentAmount)
        : Number(t.paymentAmount) || 0;
    return sum + amount;
  }, 0);

  // Group by date
  const dateMap = new Map<string, { count: number; revenue: number }>();
  transactions.forEach((t) => {
    const dateKey = t.createdAt.toISOString().split('T')[0];
    const existing = dateMap.get(dateKey) || { count: 0, revenue: 0 };
    const amount =
      typeof t.paymentAmount === 'string'
        ? parseFloat(t.paymentAmount)
        : Number(t.paymentAmount) || 0;
    dateMap.set(dateKey, {
      count: existing.count + 1,
      revenue: existing.revenue + amount,
    });
  });

  const byDate = Array.from(dateMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total,
    pending,
    approved,
    rejected,
    cancelled,
    byPaymentStatus,
    totalRevenue,
    byDate,
  };
};

export interface AppointmentSlot {
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // Time in HH:mm format
  datetime: string; // ISO datetime string
  isAvailable: boolean;
  transactionId?: string;
}

export const getAppointmentAvailability = async (
  serviceId: string,
  startDate: Date,
  endDate: Date
): Promise<AppointmentSlot[]> => {
  // Verify service exists
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  if (!service.requiresAppointment) {
    throw new Error('Service does not require appointments');
  }

  const appointmentDuration = service.appointmentDuration || 30; // minutes
  const slots: AppointmentSlot[] = [];

  // Generate time slots (e.g., 9:00 AM to 5:00 PM, based on appointment duration intervals)
  const workStartHour = 9; // 9 AM
  const workEndHour = 17; // 5 PM
  const intervalMinutes = appointmentDuration;

  // Get all existing appointments in the date range
  const existingAppointments = await prisma.transaction.findMany({
    where: {
      serviceId,
      preferredAppointmentDate: {
        not: null,
        gte: startDate,
        lte: endDate,
      },
      appointmentStatus: {
        in: ['PENDING', 'ACCEPTED', 'REQUESTED_UPDATE'],
      },
    },
    select: {
      id: true,
      preferredAppointmentDate: true,
      service: {
        select: {
          appointmentDuration: true,
        },
      },
    },
  });

  // Create a set of occupied slots for quick lookup
  const occupiedSlots = new Map<string, string>(); // slotKey -> transactionId
  for (const appointment of existingAppointments) {
    if (appointment.preferredAppointmentDate) {
      const apptDate = new Date(appointment.preferredAppointmentDate);
      const apptDuration = appointment.service.appointmentDuration || appointmentDuration;
      const apptEnd = new Date(apptDate.getTime() + apptDuration * 60000);

      // Mark all slots that overlap with this appointment
      const currentSlot = new Date(apptDate);
      while (currentSlot < apptEnd) {
        const slotKey = currentSlot.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        occupiedSlots.set(slotKey, appointment.id);

        // Move to next interval
        const nextSlot = new Date(currentSlot);
        nextSlot.setMinutes(nextSlot.getMinutes() + intervalMinutes);
        if (nextSlot >= apptEnd) break;
        currentSlot.setTime(nextSlot.getTime());
      }
    }
  }

  // Generate all possible slots
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);

  while (currentDate <= endDateTime) {
    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Generate time slots for this day
      const dateStr = currentDate.toISOString().split('T')[0];

      for (let hour = workStartHour; hour < workEndHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
          const slotDateTime = new Date(currentDate);
          slotDateTime.setHours(hour, minute, 0, 0);

          // Skip slots in the past
          if (slotDateTime < new Date()) continue;

          const slotKey = slotDateTime.toISOString().slice(0, 16);
          const transactionId = occupiedSlots.get(slotKey);
          const isAvailable = !transactionId;

          slots.push({
            date: dateStr,
            time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            datetime: slotDateTime.toISOString(),
            isAvailable,
            transactionId: transactionId || undefined,
          });
        }
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return slots;
};

// Request update from portal user
export const requestTransactionUpdate = async (
  transactionId: string,
  subscriberId: string,
  description: string,
  updatedServiceData: any,
  preferredAppointmentDate?: string
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Verify ownership
  if (transaction.subscriberId !== subscriberId) {
    throw new Error('Access denied');
  }

  const tx = transaction as any;

  // Allow multiple requests - only prevent if there's already a pending portal request
  // (user can submit a new request after approval/rejection)
  if (tx.updateRequestStatus === 'PENDING_PORTAL' && tx.updateRequestedBy === 'PORTAL') {
    throw new Error(
      'You already have a pending update request. Please wait for admin approval or rejection before submitting a new request.'
    );
  }

  // If admin requested update, portal can apply it directly
  if (tx.updateRequestStatus === 'PENDING_ADMIN' && tx.updateRequestedBy === 'ADMIN') {
    // Apply the update immediately (admin requested it, so portal can apply)
    const updateData: Record<string, unknown> = {
      serviceData: updatedServiceData
        ? (updatedServiceData as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      updateRequestStatus: 'APPROVED',
      updateRequestDescription: description,
      pendingServiceData: Prisma.JsonNull,
    };

    // Add preferredAppointmentDate if provided
    if (preferredAppointmentDate !== undefined) {
      updateData.preferredAppointmentDate = preferredAppointmentDate || null;
    }

    return (prisma as any).transaction.update({
      where: { id: transactionId },
      data: updateData,
    });
  }

  // Otherwise, create a new request - DO NOT update serviceData yet, only store in pendingServiceData
  // Store appointment date in pendingServiceData as a special field if provided
  let pendingData: any = updatedServiceData ? { ...updatedServiceData } : {};
  if (preferredAppointmentDate !== undefined) {
    pendingData._pendingAppointmentDate = preferredAppointmentDate || null;
  }

  const updateData: Record<string, unknown> = {
    // DO NOT update serviceData here - keep the original data unchanged
    // Only store the pending data for admin review
    updateRequestStatus: 'PENDING_PORTAL',
    updateRequestedBy: 'PORTAL',
    updateRequestDescription: description,
    pendingServiceData:
      Object.keys(pendingData).length > 0
        ? (pendingData as Prisma.InputJsonValue)
        : Prisma.JsonNull,
  };

  return (prisma as any).transaction.update({
    where: { id: transactionId },
    data: updateData,
  });
};

// Admin requests update from portal user
export const adminRequestTransactionUpdate = async (transactionId: string, description: string) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  return (prisma as any).transaction.update({
    where: { id: transactionId },
    data: {
      updateRequestStatus: 'PENDING_ADMIN',
      updateRequestedBy: 'ADMIN',
      adminUpdateRequestDescription: description,
    },
  });
};

// Admin approves/rejects portal update request
export const reviewTransactionUpdateRequest = async (transactionId: string, approved: boolean) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  const tx = transaction as any;

  if (tx.updateRequestStatus !== 'PENDING_PORTAL') {
    throw new Error('No pending update request found');
  }

  if (approved) {
    // Extract appointment date from pendingServiceData if it exists
    const pendingData = tx.pendingServiceData || {};
    const pendingAppointmentDate = pendingData._pendingAppointmentDate;

    // Remove the special appointment date field from serviceData
    const { _pendingAppointmentDate, ...serviceDataToApply } = pendingData;

    // Prepare update data
    const updateData: Record<string, unknown> = {
      serviceData:
        Object.keys(serviceDataToApply).length > 0
          ? (serviceDataToApply as Prisma.InputJsonValue)
          : tx.serviceData,
      updateRequestStatus: 'APPROVED',
      pendingServiceData: Prisma.JsonNull,
    };

    // Apply appointment date if it was in the pending data
    if (pendingAppointmentDate !== undefined) {
      updateData.preferredAppointmentDate = pendingAppointmentDate;
    }

    return (prisma as any).transaction.update({
      where: { id: transactionId },
      data: updateData,
    });
  } else {
    // Reject the request - clear pending data
    return (prisma as any).transaction.update({
      where: { id: transactionId },
      data: {
        updateRequestStatus: 'REJECTED',
        pendingServiceData: Prisma.JsonNull,
      },
    });
  }
};

// Get appointments (transactions with preferredAppointmentDate and active statuses)
export const getAppointments = async (startDate?: Date, endDate?: Date, date?: Date) => {
  const where: any = {
    preferredAppointmentDate: {
      not: null,
    },
    appointmentStatus: {
      in: ['PENDING', 'ACCEPTED', 'REQUESTED_UPDATE'],
    },
  };

  // If specific date is provided, filter by that date
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    where.preferredAppointmentDate = {
      gte: startOfDay,
      lte: endOfDay,
    };
  } else if (startDate || endDate) {
    // Date range filtering
    where.preferredAppointmentDate = {};
    if (startDate) {
      where.preferredAppointmentDate.gte = startDate;
    }
    if (endDate) {
      where.preferredAppointmentDate.lte = endDate;
    }
  }

  const appointments = await prisma.transaction.findMany({
    where,
    include: {
      subscriber: {
        include: {
          citizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
          nonCitizen: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              email: true,
            },
          },
        },
      },
      service: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
        },
      },
    },
    orderBy: {
      preferredAppointmentDate: 'asc',
    },
  });

  return appointments;
};
