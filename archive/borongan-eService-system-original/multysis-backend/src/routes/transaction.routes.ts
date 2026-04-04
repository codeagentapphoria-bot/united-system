import { Router } from 'express';
import {
  createTransactionNoteController,
  getTransactionNotesController,
  getUnreadCountController,
  markAllNotesAsReadController,
  markNoteAsReadController,
} from '../controllers/transaction-note.controller';
import {
  createTransactionController,
  downloadTransactionController,
  getAppointmentsController,
  getServiceStatisticsController,
  getTransactionController,
  getTransactionsByServiceController,
  getTransactionsController,
  updateTransactionController,
  requestTransactionUpdateController,
  adminRequestTransactionUpdateController,
  reviewTransactionUpdateRequestController,
} from '../controllers/transaction.controller';
import {
  getTaxComputationController,
  computeTaxController,
} from '../controllers/tax-profile.controller';
import { verifyAdmin, verifyToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createTransactionNoteValidation,
  getTransactionNotesValidation,
  getUnreadCountValidation,
  markAllNotesAsReadValidation,
  markNoteAsReadValidation,
} from '../validations/transaction-note.schema';
import {
  createTransactionValidation,
  getAppointmentsValidation,
  getTransactionsValidation,
  getTransactionValidation,
  updateTransactionValidation,
  requestTransactionUpdateValidation,
  adminRequestTransactionUpdateValidation,
  reviewTransactionUpdateValidation,
} from '../validations/transaction.schema';
import {
  getTaxComputationValidation,
  computeTaxValidation,
} from '../validations/tax-profile.schema';

const router = Router();

// Get transactions for a subscriber (admin or subscriber can access)
router.get(
  '/subscriber/:subscriberId',
  verifyToken,
  validate(getTransactionsValidation),
  getTransactionsController
);

// Get transactions by service code (admin only) - must come before /:id
router.get('/service/:serviceCode', verifyAdmin, getTransactionsByServiceController);

// Get service statistics (admin only) - must come before /:id
router.get('/service/:serviceCode/statistics', verifyAdmin, getServiceStatisticsController);

// Get appointments (admin only) - must come before /:id
router.get(
  '/appointments',
  verifyAdmin,
  validate(getAppointmentsValidation),
  getAppointmentsController
);

// Get single transaction (admin or subscriber can access)
router.get('/:id', verifyToken, validate(getTransactionValidation), getTransactionController);

// Create transaction (subscriber can create, admin can also create)
router.post('/', verifyToken, validate(createTransactionValidation), createTransactionController);

// Update transaction (admin only)
router.put('/:id', verifyAdmin, validate(updateTransactionValidation), updateTransactionController);

// Download transaction document (admin or subscriber can access)
router.get(
  '/:id/download',
  verifyToken,
  validate(getTransactionValidation),
  downloadTransactionController
);

// Transaction Notes Routes (nested under /:id/notes)
// Create note (admin or subscriber can create)
router.post(
  '/:id/notes',
  verifyToken,
  validate(createTransactionNoteValidation),
  createTransactionNoteController
);

// Get all notes for a transaction (admin or subscriber can access)
router.get(
  '/:id/notes',
  verifyToken,
  validate(getTransactionNotesValidation),
  getTransactionNotesController
);

// Mark a note as read (admin or subscriber can mark)
router.put(
  '/:id/notes/:noteId/read',
  verifyToken,
  validate(markNoteAsReadValidation),
  markNoteAsReadController
);

// Mark all notes as read (admin or subscriber can mark)
router.put(
  '/:id/notes/read-all',
  verifyToken,
  validate(markAllNotesAsReadValidation),
  markAllNotesAsReadController
);

// Get unread count (admin or subscriber can access)
router.get(
  '/:id/notes/unread-count',
  verifyToken,
  validate(getUnreadCountValidation),
  getUnreadCountController
);

// Request transaction update (portal user)
router.post(
  '/:id/request-update',
  verifyToken,
  validate(requestTransactionUpdateValidation),
  requestTransactionUpdateController
);

// Admin request update from portal user
router.post(
  '/:id/admin-request-update',
  verifyAdmin,
  validate(adminRequestTransactionUpdateValidation),
  adminRequestTransactionUpdateController
);

// Admin review portal update request (approve/reject)
router.post(
  '/:id/review-update-request',
  verifyAdmin,
  validate(reviewTransactionUpdateValidation),
  reviewTransactionUpdateRequestController
);

// Tax computation routes
// Get tax computation (admin or subscriber can access)
router.get(
  '/:id/tax-computation',
  verifyToken,
  validate(getTaxComputationValidation),
  getTaxComputationController
);

// Manually trigger tax computation (admin only)
router.post('/:id/compute-tax', verifyAdmin, validate(computeTaxValidation), computeTaxController);

export default router;
