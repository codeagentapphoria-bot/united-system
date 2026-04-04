import { Router } from 'express';
import {
  getAdminNotificationCountsController,
  getSubscriberNotificationCountsController,
  getDashboardStatisticsController,
} from '../controllers/admin.controller';
import { verifyAdmin, verifyToken } from '../middleware/auth';

const router = Router();

// Subscriber notification counts (subscribers can access)
router.get(
  '/notifications/subscriber/counts',
  verifyToken,
  getSubscriberNotificationCountsController
);

// All admin routes require admin authentication
router.use(verifyAdmin);

// Get admin notification counts
router.get('/notifications/counts', getAdminNotificationCountsController);

// Get dashboard statistics
router.get('/dashboard/statistics', getDashboardStatisticsController);

export default router;
