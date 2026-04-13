import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getAdminNotificationCounts,
  getSubscriberNotificationCounts,
  getDashboardStatistics,
} from '../services/admin.service';
import { addDevLog } from '../services/dev.service';

export const getAdminNotificationCountsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    const counts = await getAdminNotificationCounts();

    res.status(200).json({
      status: 'success',
      data: counts,
    });
  } catch (error: any) {
    console.error('[ADMIN] getAdminNotificationCounts error:', error);
    addDevLog('error', 'Failed to get admin notification counts', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get notification counts',
    });
  }
};

export const getSubscriberNotificationCountsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'resident') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. Subscriber access required.',
      });
      return;
    }

    const residentId = req.user.id;
    const counts = await getSubscriberNotificationCounts(residentId);

    res.status(200).json({
      status: 'success',
      data: counts,
    });
  } catch (error: any) {
    console.error('[ADMIN] getSubscriberNotificationCounts error:', error);
    addDevLog('error', 'Failed to get subscriber notification counts', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get subscriber notification counts',
    });
  }
};

export const getDashboardStatisticsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied',
      });
      return;
    }

    const statistics = await getDashboardStatistics();

    res.status(200).json({
      status: 'success',
      data: statistics,
    });
  } catch (error: any) {
    console.error('[ADMIN] getDashboardStatistics error:', error);
    addDevLog('error', 'Failed to get dashboard statistics', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get dashboard statistics',
    });
  }
};
