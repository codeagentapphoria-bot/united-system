import express from 'express';
import { municipalityAdminOnly } from '../middlewares/auth.js';
import { exportDatabase, exportUploads } from '../controllers/systemManagementControllers.js';

const router = express.Router();

/**
 * @route   GET /api/system-management/export/database
 * @desc    Export database as SQL dump
 * @access  Private (Municipality Admin only)
 */
router.get('/export/database', ...municipalityAdminOnly, exportDatabase);

/**
 * @route   GET /api/system-management/export/uploads
 * @desc    Export uploads folder as ZIP
 * @access  Private (Municipality Admin only)
 */
router.get('/export/uploads', ...municipalityAdminOnly, exportUploads);

export default router;
