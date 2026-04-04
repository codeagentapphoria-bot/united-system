import prisma from '../config/database';
import { CustomError } from '../middleware/error';
import { emitTransactionNoteRead } from './socket.service';
import { getTransactionStatusUpdateEmail } from './email-templates/transaction-notifications';
import { sendEmailSafely } from './email.service';

export interface CreateTransactionNoteData {
  transactionId: string;
  message: string;
  senderType: 'ADMIN' | 'RESIDENT';
  senderId: string;
  isInternal?: boolean;
}

export const createTransactionNote = async (data: CreateTransactionNoteData) => {
  // Verify transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { id: data.transactionId },
  });

  if (!transaction) {
    throw new CustomError('Transaction not found', 404);
  }

  // Verify sender exists
  if (data.senderType === 'ADMIN') {
    const admin = await prisma.user.findUnique({
      where: { id: data.senderId },
    });
    if (!admin) {
      throw new CustomError('Admin user not found', 404);
    }
  } else if (data.senderType === 'RESIDENT') {
    const resident = await prisma.resident.findUnique({
      where: { id: data.senderId },
    });
    if (!resident) {
      throw new CustomError('Resident not found', 404);
    }
    // Residents cannot create internal notes
    if (data.isInternal) {
      throw new CustomError('Residents cannot create internal notes', 403);
    }
    // Verify resident owns the transaction
    if (resident.id !== transaction.residentId) {
      throw new CustomError('Access denied', 403);
    }
  }

  // Create the note
  const note = await prisma.transactionNote.create({
    data: {
      transactionId: data.transactionId,
      message: data.message,
      senderType: data.senderType,
      senderId: data.senderId,
      isInternal: data.isInternal || false,
      isRead: false,
    },
  });

  // Send email notification (non-blocking, only for non-internal notes)
  if (!data.isInternal) {
    try {
      const transactionWithDetails = await prisma.transaction.findUnique({
        where: { id: data.transactionId },
        include: {
          resident: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              contactNumber: true,
            },
          },
          service: {
            select: { id: true, name: true },
          },
        },
      });

      if (transactionWithDetails?.resident?.email) {
        const residentName = `${transactionWithDetails.resident.firstName} ${transactionWithDetails.resident.lastName}`;

        if (data.senderType === 'ADMIN') {
          const emailData = {
            subscriberName: residentName,
            transactionId: transactionWithDetails.transactionId,
            referenceNumber: transactionWithDetails.referenceNumber,
            serviceName: transactionWithDetails.service.name,
            paymentStatus: transactionWithDetails.paymentStatus,
            status: transactionWithDetails.status || undefined,
            remarks: data.message,
          };

          const { html, text } = getTransactionStatusUpdateEmail({
            ...emailData,
            nextSteps: 'Please check your portal for the full message and respond if needed.',
          });

          await sendEmailSafely(
            transactionWithDetails.resident.email,
            `New Message: ${transactionWithDetails.service.name}`,
            html,
            text
          );
        }
      }
    } catch (error: any) {
      console.error('Failed to send transaction note email:', error.message);
    }
  }

  return note;
};

export const getTransactionNotes = async (
  transactionId: string,
  userType: 'admin' | 'resident' | 'dev',
  userId: string
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new CustomError('Transaction not found', 404);
  }

  if (userType === 'resident') {
    if (transaction.residentId !== userId) {
      throw new CustomError('Access denied', 403);
    }
  }

  const where: any = { transactionId };
  if (userType === 'resident') {
    where.isInternal = false;
  }

  return prisma.transactionNote.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
};

export const markNoteAsRead = async (
  noteId: string,
  userType: 'admin' | 'resident' | 'dev',
  userId: string
) => {
  const note = await prisma.transactionNote.findUnique({
    where: { id: noteId },
    include: { transaction: true },
  });

  if (!note) {
    throw new CustomError('Note not found', 404);
  }

  if (userType === 'resident') {
    if (note.transaction.residentId !== userId) {
      throw new CustomError('Access denied', 403);
    }
    if (note.isInternal) {
      throw new CustomError('Access denied', 403);
    }
  }

  const updatedNote = await prisma.transactionNote.update({
    where: { id: noteId },
    data: { isRead: true },
  });

  emitTransactionNoteRead(
    updatedNote.id,
    updatedNote.transactionId,
    updatedNote.senderType,
    updatedNote.isRead
  );

  return updatedNote;
};

export const markAllNotesAsRead = async (
  transactionId: string,
  userType: 'admin' | 'resident' | 'dev',
  userId: string
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new CustomError('Transaction not found', 404);
  }

  if (userType === 'resident') {
    if (transaction.residentId !== userId) {
      throw new CustomError('Access denied', 403);
    }
  }

  const where: any = { transactionId, isRead: false };

  if (userType === 'resident') {
    where.isInternal = false;
  }

  const notesToMark = await prisma.transactionNote.findMany({
    where,
    select: { id: true, transactionId: true, senderType: true },
  });

  const result = await prisma.transactionNote.updateMany({
    where,
    data: { isRead: true },
  });

  notesToMark.forEach((note) => {
    emitTransactionNoteRead(note.id, note.transactionId, note.senderType, true);
  });

  return result;
};

export const getUnreadCount = async (
  transactionId: string,
  userType: 'admin' | 'resident' | 'dev',
  userId: string
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new CustomError('Transaction not found', 404);
  }

  if (userType === 'resident') {
    if (transaction.residentId !== userId) {
      throw new CustomError('Access denied', 403);
    }
  }

  const where: any = { transactionId, isRead: false };

  if (userType === 'resident') {
    where.isInternal = false;
  }

  return prisma.transactionNote.count({ where });
};
