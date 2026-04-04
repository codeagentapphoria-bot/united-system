import { body, param } from 'express-validator';

export const createTransactionNoteValidation = [
  param('id').isUUID().withMessage('Transaction ID must be a valid UUID'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
  body('isInternal').optional().isBoolean().withMessage('isInternal must be a boolean'),
];

export const getTransactionNotesValidation = [
  param('id').isUUID().withMessage('Transaction ID must be a valid UUID'),
];

export const markNoteAsReadValidation = [
  param('id').isUUID().withMessage('Transaction ID must be a valid UUID'),
  param('noteId').isUUID().withMessage('Note ID must be a valid UUID'),
];

export const markAllNotesAsReadValidation = [
  param('id').isUUID().withMessage('Transaction ID must be a valid UUID'),
];

export const getUnreadCountValidation = [
  param('id').isUUID().withMessage('Transaction ID must be a valid UUID'),
];
