// React imports
import { useEffect, useState, useCallback } from 'react';

// Hooks
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/hooks/use-toast';

// Types
import type { NotificationPayload } from '@/types/socket.types';

export const useNotifications = () => {
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [processedNotificationIds, setProcessedNotificationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleNotification = (data: NotificationPayload) => {
      // Create unique ID for deduplication
      const notificationId = `${data.type}-${data.transactionId || data.subscriberId}-${data.timestamp || Date.now()}`;
      
      // Prevent duplicate notifications
      if (processedNotificationIds.has(notificationId)) {
        return;
      }

      const notification: NotificationPayload = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setNotifications((prev) => [notification, ...prev]);
      setProcessedNotificationIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(notificationId);
        // Keep only last 100 IDs to prevent memory leak
        if (newSet.size > 100) {
          const firstId = Array.from(newSet)[0];
          newSet.delete(firstId);
        }
        return newSet;
      });

      // Show toast notification
      toast({
        title: 'Notification',
        description: notification.message,
      });
    };

    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [socket, isConnected, toast, processedNotificationIds]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setProcessedNotificationIds(new Set());
  }, []);

  return {
    notifications,
    clearNotifications,
  };
};


