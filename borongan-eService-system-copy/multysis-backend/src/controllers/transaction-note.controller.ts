import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  createTransactionNote,
  getTransactionNotes,
  getUnreadCount,
  markAllNotesAsRead,
  markNoteAsRead,
} from '../services/transaction-note.service';

export const createTransactionNoteController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transactionId = req.params.id;
    const { message, isInternal } = req.body;

    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    const senderType = req.user.type === 'admin' ? 'ADMIN' : 'RESIDENT';
    const senderId = req.user.id;

    const note = await createTransactionNote({
      transactionId,
      message,
      senderType,
      senderId,
      isInternal: isInternal || false,
    });

    res.status(201).json({
      status: 'success',
      data: note,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message || 'Failed to create transaction note',
    });
  }
};

export const getTransactionNotesController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transactionId = req.params.id;

    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    const userType = req.user.type;
    const userId = req.user.id;

    const notes = await getTransactionNotes(transactionId, userType, userId);

    res.status(200).json({
      status: 'success',
      data: notes,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message || 'Failed to fetch transaction notes',
    });
  }
};

export const markNoteAsReadController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: _transactionId, noteId } = req.params;

    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    const userType = req.user.type;
    const userId = req.user.id;

    const note = await markNoteAsRead(noteId, userType, userId);

    res.status(200).json({
      status: 'success',
      data: note,
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message || 'Failed to mark note as read',
    });
  }
};

export const markAllNotesAsReadController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const transactionId = req.params.id;

    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    const userType = req.user.type;
    const userId = req.user.id;

    const result = await markAllNotesAsRead(transactionId, userType, userId);

    res.status(200).json({
      status: 'success',
      data: {
        count: result.count,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message || 'Failed to mark all notes as read',
    });
  }
};

export const getUnreadCountController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transactionId = req.params.id;

    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    const userType = req.user.type;
    const userId = req.user.id;

    const count = await getUnreadCount(transactionId, userType, userId);

    res.status(200).json({
      status: 'success',
      data: {
        count,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 400).json({
      status: 'error',
      message: error.message || 'Failed to get unread count',
    });
  }
};
