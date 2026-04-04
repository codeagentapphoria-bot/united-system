// React imports
import { useCallback, useEffect, useRef, useState } from 'react';

// Services
import { notificationService, type NotificationCounts } from '@/services/api/notification.service';
import { serviceService } from '@/services/api/service.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Context
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

// Types
import type { 
  TransactionUpdatePayload, 
  NewTransactionPayload,
  CitizenStatusChangePayload,
  TransactionNoteReadPayload,
} from '@/types/socket.types';

interface UseAdminNotificationsOptions {
  pollInterval?: number; // Polling interval in milliseconds (default: 30000 = 30 seconds)
  autoFetch?: boolean; // Whether to automatically fetch on mount
  enabled?: boolean; // Whether polling is enabled (pauses when tab is not visible)
}

interface UseAdminNotificationsReturn {
  counts: NotificationCounts;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_COUNTS: NotificationCounts = {
  pendingApplications: 0,
  pendingCitizens: 0,
  pendingUpdateRequests: 0,
  unreadMessages: 0,
  total: 0,
  pendingApplicationsByService: {},
};

export const useAdminNotifications = ({
  pollInterval = 120000, // 120 seconds (2 minutes) default - fallback mechanism
  autoFetch = true,
  enabled = true,
}: UseAdminNotificationsOptions = {}): UseAdminNotificationsReturn => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [counts, setCounts] = useState<NotificationCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [servicePaymentStatuses, setServicePaymentStatuses] = useState<Record<string, string[]>>({});
  const [isWebSocketHealthy, setIsWebSocketHealthy] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const lastEventTimeRef = useRef<number>(Date.now());
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCounts = useCallback(async () => {
    // Only fetch if user is admin
    if (!user || user.role !== 'admin') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await notificationService.getAdminNotificationCounts();
      if (isMountedRef.current) {
        setCounts(result);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch notification counts';
      if (isMountedRef.current) {
        setError(errorMessage);
        // Only show toast on initial error, not on polling errors
        if (!intervalRef.current) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: errorMessage,
          });
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, toast]);

  // WebSocket health monitoring
  useEffect(() => {
    if (!socket || !isConnected || !user || user.role !== 'admin') {
      return;
    }

    // Check WebSocket health every 30 seconds
    healthCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
      const healthThreshold = 60000; // 60 seconds

      if (timeSinceLastEvent > healthThreshold) {
        // No events received in 60 seconds, mark as unhealthy
        if (isWebSocketHealthy) {
          setIsWebSocketHealthy(false);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, [socket, isConnected, user, isWebSocketHealthy]);

  // Set up polling with dynamic interval based on WebSocket health
  useEffect(() => {
    if (!autoFetch || !enabled || !user || user.role !== 'admin') {
      return;
    }

    // Determine polling interval based on WebSocket health
    const effectivePollInterval = isWebSocketHealthy ? pollInterval : 15000; // 15s when unhealthy, normal interval when healthy

    // Initial fetch
    fetchCounts();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      if (enabled && isMountedRef.current) {
        fetchCounts();
      }
    }, effectivePollInterval);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoFetch, enabled, pollInterval, fetchCounts, user, isWebSocketHealthy]);

  // Handle page visibility changes (pause polling when tab is not visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, pause polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Tab is visible, resume polling
        if (autoFetch && enabled && user && user.role === 'admin' && !intervalRef.current) {
          fetchCounts();
          const effectivePollInterval = isWebSocketHealthy ? pollInterval : 15000;
          intervalRef.current = setInterval(() => {
            if (enabled && isMountedRef.current) {
              fetchCounts();
            }
          }, effectivePollInterval);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoFetch, enabled, pollInterval, fetchCounts, user, isWebSocketHealthy]);

  // Fetch service payment statuses on mount
  useEffect(() => {
    const fetchServices = async () => {
      if (!user || user.role !== 'admin') {
        return;
      }

      try {
        const services = await serviceService.getActiveServices();
        const statusesMap: Record<string, string[]> = {};
        services.forEach((service) => {
          if (service.paymentStatuses && Array.isArray(service.paymentStatuses)) {
            statusesMap[service.code] = service.paymentStatuses;
          }
        });
        setServicePaymentStatuses(statusesMap);
      } catch (error) {
        console.error('Failed to fetch services for notification counts:', error);
      }
    };

    fetchServices();
  }, [user]);

  // Helper function to get first payment status for a service
  const getFirstPaymentStatus = useCallback((serviceCode: string): string => {
    const statuses = servicePaymentStatuses[serviceCode];
    if (statuses && statuses.length > 0) {
      return statuses[0];
    }
    // Fallback to default
    return 'PENDING';
  }, [servicePaymentStatuses]);

  // Helper to check if payment status is "pending" (first status in service's paymentStatuses)
  const isPendingPaymentStatus = useCallback((paymentStatus: string | undefined, serviceCode: string | undefined): boolean => {
    if (!paymentStatus || !serviceCode) return false;
    const firstStatus = getFirstPaymentStatus(serviceCode);
    return paymentStatus === firstStatus;
  }, [getFirstPaymentStatus]);

  // Listen for WebSocket events to update counts incrementally
  useEffect(() => {
    if (!socket || !isConnected || !user || user.role !== 'admin') {
      return;
    }

    // Update last event time on any WebSocket event
    const updateLastEventTime = () => {
      lastEventTimeRef.current = Date.now();
      if (!isWebSocketHealthy) {
        setIsWebSocketHealthy(true);
      }
    };

    // Listen for new transactions - increment pendingApplications if applicable
    const handleNewTransaction = (data: NewTransactionPayload) => {
      updateLastEventTime();
      setCounts((prev) => {
        const updated = { ...prev };
        
        // New transactions typically start with pending payment status
        if (data.paymentStatus && data.serviceCode && isPendingPaymentStatus(data.paymentStatus, data.serviceCode)) {
          updated.pendingApplications += 1;
          updated.total += 1;
          
          // Update pendingApplicationsByService
          if (data.serviceCode) {
            updated.pendingApplicationsByService[data.serviceCode] = 
              (updated.pendingApplicationsByService[data.serviceCode] || 0) + 1;
          }
        }
        
        return updated;
      });
    };

    // Listen for transaction updates - update counts based on status/payment changes
    const handleTransactionUpdate = (data: TransactionUpdatePayload) => {
      updateLastEventTime();
      setCounts((prev) => {
        const updated = { ...prev };
        
        // Handle payment status changes (affects pendingApplications)
        if (data.paymentStatus !== undefined && data.oldPaymentStatus !== undefined && 
            data.paymentStatus !== data.oldPaymentStatus && data.serviceCode) {
          
          const wasPending = isPendingPaymentStatus(data.oldPaymentStatus, data.serviceCode);
          const isNowPending = isPendingPaymentStatus(data.paymentStatus, data.serviceCode);
          
          if (wasPending && !isNowPending) {
            // Moving away from pending
            updated.pendingApplications = Math.max(0, updated.pendingApplications - 1);
            updated.total = Math.max(0, updated.total - 1);
            
            if (data.serviceCode && updated.pendingApplicationsByService[data.serviceCode]) {
              updated.pendingApplicationsByService[data.serviceCode] = 
                Math.max(0, updated.pendingApplicationsByService[data.serviceCode] - 1);
            }
          } else if (!wasPending && isNowPending) {
            // Moving to pending
            updated.pendingApplications += 1;
            updated.total += 1;
            
            if (data.serviceCode) {
              updated.pendingApplicationsByService[data.serviceCode] = 
                (updated.pendingApplicationsByService[data.serviceCode] || 0) + 1;
            }
          }
        }
        
        // Handle updateRequestStatus changes (affects pendingUpdateRequests)
        if (data.updateRequestStatus !== undefined && data.oldUpdateRequestStatus !== undefined &&
            data.updateRequestStatus !== data.oldUpdateRequestStatus) {
          
          const wasPendingAdmin = data.oldUpdateRequestStatus === 'PENDING_ADMIN';
          const isNowPendingAdmin = data.updateRequestStatus === 'PENDING_ADMIN';
          
          if (wasPendingAdmin && !isNowPendingAdmin) {
            // Moving away from PENDING_ADMIN
            updated.pendingUpdateRequests = Math.max(0, updated.pendingUpdateRequests - 1);
            updated.total = Math.max(0, updated.total - 1);
          } else if (!wasPendingAdmin && isNowPendingAdmin) {
            // Moving to PENDING_ADMIN
            updated.pendingUpdateRequests += 1;
            updated.total += 1;
          }
        }
        
        return updated;
      });
    };

    // Listen for citizen status changes
    const handleCitizenStatusChange = (data: CitizenStatusChangePayload) => {
      updateLastEventTime();
      setCounts((prev) => {
        const updated = { ...prev };
        
        const wasPending = data.oldStatus === 'PENDING';
        const isNowPending = data.newStatus === 'PENDING';
        
        if (wasPending && !isNowPending) {
          // Moving away from PENDING
          updated.pendingCitizens = Math.max(0, updated.pendingCitizens - 1);
          updated.total = Math.max(0, updated.total - 1);
        } else if (!wasPending && isNowPending) {
          // Moving to PENDING
          updated.pendingCitizens += 1;
          updated.total += 1;
        }
        
        return updated;
      });
    };

    // Listen for transaction note read events
    const handleTransactionNoteRead = (data: TransactionNoteReadPayload) => {
      updateLastEventTime();
      setCounts((prev) => {
        const updated = { ...prev };
        
        // Only decrement if it's a subscriber message (admin needs to see unread subscriber messages)
        if (data.senderType === 'SUBSCRIBER' && data.isRead) {
          updated.unreadMessages = Math.max(0, updated.unreadMessages - 1);
          updated.total = Math.max(0, updated.total - 1);
        }
        
        return updated;
      });
    };

    // Listen for notifications - these might indicate message count changes
    const handleNotification = () => {
      updateLastEventTime();
      // For unreadMessages, we might need to refetch or handle separately
      // For now, we'll do a lightweight refetch
      fetchCounts();
    };

    socket.on('transaction:new', handleNewTransaction);
    socket.on('transaction:update', handleTransactionUpdate);
    socket.on('citizen:status-change', handleCitizenStatusChange);
    socket.on('transaction:note:read', handleTransactionNoteRead);
    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('transaction:new', handleNewTransaction);
      socket.off('transaction:update', handleTransactionUpdate);
      socket.off('citizen:status-change', handleCitizenStatusChange);
      socket.off('transaction:note:read', handleTransactionNoteRead);
      socket.off('notification:new', handleNotification);
    };
  }, [socket, isConnected, user, fetchCounts, isPendingPaymentStatus, isWebSocketHealthy]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, []);

  const refresh = useCallback(async () => {
    await fetchCounts();
  }, [fetchCounts]);

  return {
    counts,
    isLoading,
    error,
    refresh,
  };
};

