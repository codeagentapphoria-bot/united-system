import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getAdminNotificationCounts,
  getSubscriberNotificationCounts,
  getDashboardStatistics,
} from '../services/admin.service';

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
    if (!req.user || req.user.type !== 'subscriber') {
      res.status(403).json({
        status: 'error',
        message: 'Access denied. Subscriber access required.',
      });
      return;
    }

    const subscriberId = req.user.id;
    const counts = await getSubscriberNotificationCounts(subscriberId);

    res.status(200).json({
      status: 'success',
      data: counts,
    });
  } catch (error: any) {
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
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get dashboard statistics',
    });
  }
};
