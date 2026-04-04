import { useCallback, useEffect, useRef } from 'react';
import { notificationService, type NotificationCounts } from '@/services/api/notification.service';
import { serviceService } from '@/services/api/service.service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import {
  useAdminNotificationsGlobal,
  setAdminNotificationsGlobal,
  initializeAdminNotifications,
} from '@/context/AdminNotificationsContext';
import type { 
  TransactionUpdatePayload, 
  NewTransactionPayload,
  CitizenStatusChangePayload,
  TransactionNoteReadPayload,
} from '@/types/socket.types';

interface UseAdminNotificationsOptions {
  pollInterval?: number;
  autoFetch?: boolean;
  enabled?: boolean;
}

interface UseAdminNotificationsReturn {
  counts: NotificationCounts;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isWebSocketHealthy?: boolean;
}

const EMPTY_COUNTS: NotificationCounts = {
  pendingApplications: 0,
  pendingCitizens: 0,
  pendingUpdateRequests: 0,
  unreadMessages: 0,
  total: 0,
  pendingApplicationsByService: {},
};

let servicePaymentStatusesGlobal: Record<string, string[]> = {};
let healthCheckIntervalRef: ReturnType<typeof setInterval> | null = null;
let lastEventTimeRef = Date.now();
let isWebSocketHealthyGlobal = true;
let pollingIntervalRef: ReturnType<typeof setInterval> | null = null;
let socketListenerAttached = false;

const getFirstPaymentStatus = (serviceCode: string): string => {
  const statuses = servicePaymentStatusesGlobal[serviceCode];
  if (statuses && statuses.length > 0) {
    return statuses[0];
  }
  return 'PENDING';
};

const isPendingPaymentStatus = (paymentStatus: string | undefined, serviceCode: string | undefined): boolean => {
  if (!paymentStatus || !serviceCode) return false;
  const firstStatus = getFirstPaymentStatus(serviceCode);
  return paymentStatus === firstStatus;
};

export const useAdminNotifications = ({
  pollInterval = 120000,
  autoFetch = true,
  enabled = true,
}: UseAdminNotificationsOptions = {}): UseAdminNotificationsReturn => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const globalState = useAdminNotificationsGlobal();
  const isMountedRef = useRef(true);
  const initializedRef = useRef(false);

  const fetchCounts = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      return EMPTY_COUNTS;
    }

    setAdminNotificationsGlobal({ isLoading: true, error: null });

    try {
      const result = await notificationService.getAdminNotificationCounts();
      if (isMountedRef.current) {
        setAdminNotificationsGlobal({ counts: result, isLoading: false, isInitialized: true });
      }
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch notification counts';
      if (isMountedRef.current) {
        setAdminNotificationsGlobal({ error: errorMessage, isLoading: false });
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      }
      return EMPTY_COUNTS;
    }
  }, [user, toast]);

  useEffect(() => {
    if (!socket || !isConnected || !user || user.role !== 'admin' || socketListenerAttached) {
      return;
    }

    socketListenerAttached = true;

    const updateLastEventTime = () => {
      lastEventTimeRef = Date.now();
      if (!isWebSocketHealthyGlobal) {
        isWebSocketHealthyGlobal = true;
        setAdminNotificationsGlobal({ isWebSocketHealthy: true });
      }
    };

    const handleNewTransaction = (data: NewTransactionPayload) => {
      updateLastEventTime();
      const current = globalState.counts;
      const updated = { ...current };
      
      if (data.paymentStatus && data.serviceCode && isPendingPaymentStatus(data.paymentStatus, data.serviceCode)) {
        updated.pendingApplications += 1;
        updated.total += 1;
        
        if (data.serviceCode) {
          updated.pendingApplicationsByService[data.serviceCode] = 
            (updated.pendingApplicationsByService[data.serviceCode] || 0) + 1;
        }
      }
      
      setAdminNotificationsGlobal({ counts: updated });
    };

    const handleTransactionUpdate = (data: TransactionUpdatePayload) => {
      updateLastEventTime();
      const current = globalState.counts;
      const updated = { ...current };
      
      if (data.paymentStatus !== undefined && data.oldPaymentStatus !== undefined && 
          data.paymentStatus !== data.oldPaymentStatus && data.serviceCode) {
        
        const wasPending = isPendingPaymentStatus(data.oldPaymentStatus, data.serviceCode);
        const isNowPending = isPendingPaymentStatus(data.paymentStatus, data.serviceCode);
        
        if (wasPending && !isNowPending) {
          updated.pendingApplications = Math.max(0, updated.pendingApplications - 1);
          updated.total = Math.max(0, updated.total - 1);
          
          if (data.serviceCode && updated.pendingApplicationsByService[data.serviceCode]) {
            updated.pendingApplicationsByService[data.serviceCode] = 
              Math.max(0, updated.pendingApplicationsByService[data.serviceCode] - 1);
          }
        } else if (!wasPending && isNowPending) {
          updated.pendingApplications += 1;
          updated.total += 1;
          
          if (data.serviceCode) {
            updated.pendingApplicationsByService[data.serviceCode] = 
              (updated.pendingApplicationsByService[data.serviceCode] || 0) + 1;
          }
        }
      }
      
      if (data.updateRequestStatus !== undefined && data.oldUpdateRequestStatus !== undefined &&
          data.updateRequestStatus !== data.oldUpdateRequestStatus) {
        
        const wasPendingAdmin = data.oldUpdateRequestStatus === 'PENDING_ADMIN';
        const isNowPendingAdmin = data.updateRequestStatus === 'PENDING_ADMIN';
        
        if (wasPendingAdmin && !isNowPendingAdmin) {
          updated.pendingUpdateRequests = Math.max(0, updated.pendingUpdateRequests - 1);
          updated.total = Math.max(0, updated.total - 1);
        } else if (!wasPendingAdmin && isNowPendingAdmin) {
          updated.pendingUpdateRequests += 1;
          updated.total += 1;
        }
      }
      
      setAdminNotificationsGlobal({ counts: updated });
    };

    const handleCitizenStatusChange = (data: CitizenStatusChangePayload) => {
      updateLastEventTime();
      const current = globalState.counts;
      const updated = { ...current };
      
      const wasPending = data.oldStatus === 'PENDING';
      const isNowPending = data.newStatus === 'PENDING';
      
      if (wasPending && !isNowPending) {
        updated.pendingCitizens = Math.max(0, updated.pendingCitizens - 1);
        updated.total = Math.max(0, updated.total - 1);
      } else if (!wasPending && isNowPending) {
        updated.pendingCitizens += 1;
        updated.total += 1;
      }
      
      setAdminNotificationsGlobal({ counts: updated });
    };

    const handleTransactionNoteRead = (data: TransactionNoteReadPayload) => {
      updateLastEventTime();
      const current = globalState.counts;
      const updated = { ...current };
      
      if (data.senderType === 'SUBSCRIBER' && data.isRead) {
        updated.unreadMessages = Math.max(0, updated.unreadMessages - 1);
        updated.total = Math.max(0, updated.total - 1);
      }
      
      setAdminNotificationsGlobal({ counts: updated });
    };

    socket.on('transaction:new', handleNewTransaction);
    socket.on('transaction:update', handleTransactionUpdate);
    socket.on('citizen:status-change', handleCitizenStatusChange);
    socket.on('transaction:note:read', handleTransactionNoteRead);

    return () => {
      socket.off('transaction:new', handleNewTransaction);
      socket.off('transaction:update', handleTransactionUpdate);
      socket.off('citizen:status-change', handleCitizenStatusChange);
      socket.off('transaction:note:read', handleTransactionNoteRead);
      socketListenerAttached = false;
    };
  }, [socket, isConnected, user, globalState.counts]);

  useEffect(() => {
    if (!autoFetch || !enabled || !user || user.role !== 'admin' || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    const effectivePollInterval = isWebSocketHealthyGlobal ? pollInterval : 15000;

    initializeAdminNotifications();

    pollingIntervalRef = setInterval(() => {
      if (enabled && isMountedRef.current) {
        fetchCounts();
      }
    }, effectivePollInterval);

    healthCheckIntervalRef = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTimeRef;
      const healthThreshold = 60000;

      if (timeSinceLastEvent > healthThreshold) {
        if (isWebSocketHealthyGlobal) {
          isWebSocketHealthyGlobal = false;
          setAdminNotificationsGlobal({ isWebSocketHealthy: false });
        }
      }
    }, 30000);

    const fetchServices = async () => {
      try {
        const services = await serviceService.getActiveServices();
        const statusesMap: Record<string, string[]> = {};
        services.forEach((service) => {
          if (service.paymentStatuses && Array.isArray(service.paymentStatuses)) {
            statusesMap[service.code] = service.paymentStatuses;
          }
        });
        servicePaymentStatusesGlobal = statusesMap;
      } catch (error) {
        console.error('Failed to fetch services for notification counts:', error);
      }
    };

    fetchServices();

    return () => {
      if (pollingIntervalRef) {
        clearInterval(pollingIntervalRef);
        pollingIntervalRef = null;
      }
      if (healthCheckIntervalRef) {
        clearInterval(healthCheckIntervalRef);
        healthCheckIntervalRef = null;
      }
    };
  }, [autoFetch, enabled, pollInterval, fetchCounts, user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pollingIntervalRef) {
          clearInterval(pollingIntervalRef);
          pollingIntervalRef = null;
        }
      } else {
        if (autoFetch && enabled && user && user.role === 'admin' && !pollingIntervalRef) {
          fetchCounts();
          const effectivePollInterval = isWebSocketHealthyGlobal ? pollInterval : 15000;
          pollingIntervalRef = setInterval(() => {
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
  }, [autoFetch, enabled, pollInterval, fetchCounts, user]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    await fetchCounts();
  }, [fetchCounts]);

  return {
    counts: globalState.counts,
    isLoading: globalState.isLoading,
    error: globalState.error,
    refresh,
    isWebSocketHealthy: globalState.isWebSocketHealthy,
  };
};
