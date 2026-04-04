import express from 'express';
import { getAllLogs, getBarangayLogs, getSpecificLogs } from '../controllers/logsControllers.js';
import { allUsers } from '../middlewares/auth.js';
const router = express.Router();

// Test route without authentication
router.get('/test', (req, res) => {
  res.json({ message: 'Logs route is working' });
});

router.get('/all-logs', ...allUsers, getAllLogs);
router.get('/barangay-logs', ...allUsers, getBarangayLogs);
router.get('/specific-logs', ...allUsers, getSpecificLogs);

export default router;
