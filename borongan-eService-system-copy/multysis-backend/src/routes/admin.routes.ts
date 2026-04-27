import { Router } from 'express';
import {
  getAdminNotificationCountsController,
  getSubscriberNotificationCountsController,
  getDashboardStatisticsController,
} from '../controllers/admin.controller';
import { verifyAdmin, verifyToken } from '../middleware/auth';
import { requirePageAccess } from '../middleware/pageAccess';

const router = Router();

// Subscriber notification counts (subscribers can access)
router.get(
  '/notifications/subscriber/counts',
  verifyToken,
  getSubscriberNotificationCountsController
);

// All admin routes require admin authentication + page-level access control
router.use(verifyAdmin);
router.use(requirePageAccess);

// Get admin notification counts
router.get('/notifications/counts', getAdminNotificationCountsController);

// Get dashboard statistics
router.get('/dashboard/statistics', getDashboardStatisticsController);

export default router;
