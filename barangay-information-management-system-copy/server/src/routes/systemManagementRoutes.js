import express from 'express';
import { allUsers } from '../middlewares/auth.js';
import { exportDatabase, exportUploads } from '../controllers/systemManagementControllers.js';

const router = express.Router();

/**
 * @route   GET /api/system-management/export/database
 * @desc    Export database as SQL dump
 * @access  Private (Municipality Admin only)
 */
router.get('/export/database', ...allUsers, exportDatabase);

/**
 * @route   GET /api/system-management/export/uploads
 * @desc    Export uploads folder as ZIP
 * @access  Private (Municipality Admin only)
 */
router.get('/export/uploads', ...allUsers, exportUploads);

export default router;

