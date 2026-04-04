import prisma from '../config/database';
import { CustomError } from '../middleware/error';
import { emitTransactionNoteRead } from './socket.service';
import { getTransactionStatusUpdateEmail } from './email-templates/transaction-notifications';
import { sendEmailSafely } from './email.service';

export interface CreateTransactionNoteData {
  transactionId: string;
  message: string;
  senderType: 'ADMIN' | 'SUBSCRIBER';
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
  } else if (data.senderType === 'SUBSCRIBER') {
    const subscriber = await prisma.subscriber.findUnique({
      where: { id: data.senderId },
    });
    if (!subscriber) {
      throw new CustomError('Subscriber not found', 404);
    }
    // Subscribers cannot create internal notes
    if (data.isInternal) {
      throw new CustomError('Subscribers cannot create internal notes', 403);
    }
    // Verify subscriber owns the transaction
    if (subscriber.id !== transaction.subscriberId) {
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
      isRead: false, // New notes are unread by default
    },
  });

  // Send email notification (non-blocking, only for non-internal notes)
  if (!data.isInternal) {
    try {
      // Get transaction with subscriber and service details
      const transactionWithDetails = await prisma.transaction.findUnique({
        where: { id: data.transactionId },
        include: {
          subscriber: {
            include: {
              citizen: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phoneNumber: true,
                },
              },
              nonCitizen: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (transactionWithDetails) {
        const subscriber =
          transactionWithDetails.subscriber.citizen || transactionWithDetails.subscriber.nonCitizen;
        const subscriberEmail = subscriber?.email;

        if (subscriberEmail) {
          const subscriberName = subscriber
            ? `${subscriber.firstName} ${subscriber.lastName}`
            : 'Subscriber';

          // If admin sent the note, notify subscriber
          if (data.senderType === 'ADMIN') {
            const emailData = {
              subscriberName,
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
              subscriberEmail,
              `New Message: ${transactionWithDetails.service.name}`,
              html,
              text
            );
          }
          // If subscriber sent the note, notify admins (optional - could be implemented with admin email list)
          // For now, we'll skip admin notifications for subscriber notes
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
  userType: 'admin' | 'subscriber' | 'dev',
  userId: string
) => {
  // Verify transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new CustomError('Transaction not found', 404);
  }

  // Verify access
  if (userType === 'subscriber') {
    if (transaction.subscriberId !== userId) {
      throw new CustomError('Access denied', 403);
    }
  }
  // Dev users are treated like admins (can see all notes)

  // Build where clause - subscribers only see public notes, admins and devs see all
  const where: any = { transactionId };
  if (userType === 'subscriber') {
    where.isInternal = false;
  }

  const notes = await prisma.transactionNote.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  return notes;
};

export const markNoteAsRead = async (
  noteId: string,
  userType: 'admin' | 'subscriber' | 'dev',
  userId: string
) => {
  const note = await prisma.transactionNote.findUnique({
    where: { id: noteId },
    include: { transaction: true },
  });

  if (!note) {
    throw new CustomError('Note not found', 404);
  }

  // Verify access
  if (userType === 'subscriber') {
    if (note.transaction.subscriberId !== userId) {
      throw new CustomError('Access denied', 403);
    }
    // Subscribers cannot mark internal notes as read (they can't see them)
    if (note.isInternal) {
      throw new CustomError('Access denied', 403);
    }
  }
  // Dev users are treated like admins (can mark any note as read)

  // Mark as read
  const updatedNote = await prisma.transactionNote.update({
    where: { id: noteId },
    data: { isRead: true },
  });

  // Emit WebSocket event for notification count updates
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
  userType: 'admin' | 'subscriber' | 'dev',
  userId: string
) => {
  // Verify transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new CustomError('Transaction not found', 404);
  }

  // Verify access
  if (userType === 'subscriber') {
    if (transaction.subscriberId !== userId) {
      throw new CustomError('Access denied', 403);
    }
  }
  // Dev users are treated like admins (can mark all notes as read)

  // Build where clause
  const where: any = {
    transactionId,
    isRead: false,
  };

  if (userType === 'subscriber') {
    where.isInternal = false;
  }

  // Get the notes that will be marked as read before updating
  const notesToMark = await prisma.transactionNote.findMany({
    where,
    select: {
      id: true,
      transactionId: true,
      senderType: true,
    },
  });

  // Mark all unread notes as read
  const result = await prisma.transactionNote.updateMany({
    where,
    data: { isRead: true },
  });

  // Emit WebSocket events for each note marked as read
  notesToMark.forEach((note) => {
    emitTransactionNoteRead(note.id, note.transactionId, note.senderType, true);
  });

  return result;
};

export const getUnreadCount = async (
  transactionId: string,
  userType: 'admin' | 'subscriber' | 'dev',
  userId: string
) => {
  // Verify transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new CustomError('Transaction not found', 404);
  }

  // Verify access
  if (userType === 'subscriber') {
    if (transaction.subscriberId !== userId) {
      throw new CustomError('Access denied', 403);
    }
  }
  // Dev users are treated like admins (can see all unread counts)

  // Build where clause
  const where: any = {
    transactionId,
    isRead: false,
  };

  if (userType === 'subscriber') {
    where.isInternal = false;
  }

  // Count unread notes
  const count = await prisma.transactionNote.count({
    where,
  });

  return count;
};
