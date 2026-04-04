import api from './auth.service';

export interface NotificationCounts {
  pendingApplications: number;
  pendingCitizens: number;
  pendingUpdateRequests: number;
  unreadMessages: number;
  total: number;
  pendingApplicationsByService: Record<string, number>; // service code -> count
}

export interface SubscriberNotificationCounts {
  pendingUpdateRequests: number;
  unreadMessages: number;
  statusUpdates: number;
  total: number;
}

export const notificationService = {
  async getAdminNotificationCounts(): Promise<NotificationCounts> {
    const response = await api.get('/admin/notifications/counts');
    return response.data.data;
  },

  async getSubscriberNotificationCounts(): Promise<SubscriberNotificationCounts> {
    const response = await api.get('/admin/notifications/subscriber/counts');
    return response.data.data;
  },
};

