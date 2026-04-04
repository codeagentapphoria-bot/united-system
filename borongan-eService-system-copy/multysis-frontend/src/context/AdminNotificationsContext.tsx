import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { notificationService, type NotificationCounts } from '@/services/api/notification.service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useActiveServices } from '@/hooks/useActiveServices';
import type { 
  TransactionUpdatePayload, 
  NewTransactionPayload,
  CitizenStatusChangePayload,
  TransactionNoteReadPayload,
} from '@/types/socket.types';

interface AdminNotificationsContextType {
  counts: NotificationCounts;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isWebSocketHealthy: boolean;
  isInitialized: boolean;
}

const EMPTY_COUNTS: NotificationCounts = {
  pendingApplications: 0,
  pendingCitizens: 0,
  pendingUpdateRequests: 0,
  unreadMessages: 0,
  total: 0,
  pendingApplicationsByService: {},
};

let globalCounts = EMPTY_COUNTS;
let globalIsLoading = false;
let globalError: string | null = null;
let globalIsWebSocketHealthy = true;
let globalIsInitialized = false;
let initializationPromise: Promise<void> | null = null;
let subscribers: Set<() => void> = new Set();

const notifySubscribers = () => {
  subscribers.forEach(callback => callback());
};

export const useAdminNotificationsGlobal = () => {
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    const callback = () => forceUpdate(prev => prev + 1);
    subscribers.add(callback);
    return () => { subscribers.delete(callback); };
  }, []);
  
  return {
    counts: globalCounts,
    isLoading: globalIsLoading,
    error: globalError,
    isWebSocketHealthy: globalIsWebSocketHealthy,
    isInitialized: globalIsInitialized,
  };
};

export const setAdminNotificationsGlobal = (data: { counts?: NotificationCounts; isLoading?: boolean; error?: string | null; isWebSocketHealthy?: boolean; isInitialized?: boolean }) => {
  if (data.counts) {
    globalCounts = data.counts;
  }
  if (data.isLoading !== undefined) globalIsLoading = data.isLoading;
  if (data.error !== undefined) globalError = data.error;
  if (data.isWebSocketHealthy !== undefined) globalIsWebSocketHealthy = data.isWebSocketHealthy;
  if (data.isInitialized !== undefined) globalIsInitialized = data.isInitialized;
  notifySubscribers();
};

export const initializeAdminNotifications = async () => {
  if (globalIsInitialized && globalCounts.total !== -1) {
    return;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  globalCounts = { ...EMPTY_COUNTS };
  globalIsLoading = true;
  globalError = null;
  notifySubscribers();
  
  initializationPromise = (async () => {
    try {
      const result = await notificationService.getAdminNotificationCounts();
      globalCounts = result;
      globalIsInitialized = true;
    } catch (err: any) {
      globalError = err.response?.data?.message || err.message || 'Failed to fetch notification counts';
    } finally {
      globalIsLoading = false;
      initializationPromise = null;
      notifySubscribers();
    }
  })();
  
  return initializationPromise;
};

interface AdminNotificationsProviderProps {
  children: React.ReactNode;
}

export const AdminNotificationsContext = createContext<AdminNotificationsContextType | undefined>(undefined);

export const AdminNotificationsProvider: React.FC<AdminNotificationsProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const { paymentStatuses: servicePaymentStatuses } = useActiveServices();
  const [counts, setCounts] = useState<NotificationCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWebSocketHealthy, setIsWebSocketHealthy] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const lastEventTimeRef = useRef<number>(Date.now());
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  const getFirstPaymentStatus = useCallback((serviceCode: string): string => {
    const statuses = servicePaymentStatuses[serviceCode];
    if (statuses && statuses.length > 0) {
      return statuses[0];
    }
    return 'PENDING';
  }, [servicePaymentStatuses]);

  const isPendingPaymentStatus = useCallback((paymentStatus: string | undefined, serviceCode: string | undefined): boolean => {
    if (!paymentStatus || !serviceCode) return false;
    const firstStatus = getFirstPaymentStatus(serviceCode);
    return paymentStatus === firstStatus;
  }, [getFirstPaymentStatus]);

  const fetchCounts = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await notificationService.getAdminNotificationCounts();
      if (isMountedRef.current) {
        setCounts(result);
        globalCounts = result;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch notification counts';
      if (isMountedRef.current) {
        setError(errorMessage);
        globalError = errorMessage;
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
        globalIsLoading = false;
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (!socket || !isConnected || !user || user.role !== 'admin') {
      return;
    }

    healthCheckIntervalRef.current = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
      const healthThreshold = 60000;

      if (timeSinceLastEvent > healthThreshold) {
        if (isWebSocketHealthy) {
          setIsWebSocketHealthy(false);
          globalIsWebSocketHealthy = false;
        }
      }
    }, 30000);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, [socket, isConnected, user, isWebSocketHealthy]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    const effectivePollInterval = isWebSocketHealthy ? 120000 : 15000;

    fetchCounts();

    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchCounts();
      }
    }, effectivePollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, isWebSocketHealthy, fetchCounts]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        if (user && user.role === 'admin' && !intervalRef.current) {
          fetchCounts();
          const effectivePollInterval = isWebSocketHealthy ? 120000 : 15000;
          intervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
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
  }, [user, isWebSocketHealthy, fetchCounts]);

  useEffect(() => {
    if (!socket || !isConnected || !user || user.role !== 'admin') {
      return;
    }

    const updateLastEventTime = () => {
      lastEventTimeRef.current = Date.now();
      if (!isWebSocketHealthy) {
        setIsWebSocketHealthy(true);
        globalIsWebSocketHealthy = true;
      }
    };

    const handleNewTransaction = (data: NewTransactionPayload) => {
      updateLastEventTime();
      setCounts((prev) => {
        const updated = { ...prev };
        
        if (data.paymentStatus && data.serviceCode && isPendingPaymentStatus(data.paymentStatus, data.serviceCode)) {
          updated.pendingApplications += 1;
          updated.total += 1;
          
          if (data.serviceCode) {
            updated.pendingApplicationsByService[data.serviceCode] = 
              (updated.pendingApplicationsByService[data.serviceCode] || 0) + 1;
          }
        }
        
        globalCounts = updated;
        return updated;
      });
    };

    const handleTransactionUpdate = (data: TransactionUpdatePayload) => {
      updateLastEventTime();
      setCounts((prev) => {
        const updated = { ...prev };
        
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
        
        globalCounts = updated;
        return updated;
      });
    };

    const handleCitizenStatusChange = (data: CitizenStatusChangePayload) => {
      updateLastEventTime();
      setCounts((prev) => {
        const updated = { ...prev };
        
        const wasPending = data.oldStatus === 'PENDING';
        const isNowPending = data.newStatus === 'PENDING';
        
        if (wasPending && !isNowPending) {
          updated.pendingCitizens = Math.max(0, updated.pendingCitizens - 1);
          updated.total = Math.max(0, updated.total - 1);
        } else if (!wasPending && isNowPending) {
          updated.pendingCitizens += 1;
          updated.total += 1;
        }
        
        globalCounts = updated;
        return updated;
      });
    };

    const handleTransactionNoteRead = (data: TransactionNoteReadPayload) => {
      updateLastEventTime();
      setCounts((prev) => {
        const updated = { ...prev };
        
        if (data.senderType === 'SUBSCRIBER' && data.isRead) {
          updated.unreadMessages = Math.max(0, updated.unreadMessages - 1);
          updated.total = Math.max(0, updated.total - 1);
        }
        
        globalCounts = updated;
        return updated;
      });
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
    };
  }, [socket, isConnected, user, isPendingPaymentStatus, isWebSocketHealthy]);

  useEffect(() => {
    isMountedRef.current = true;
    setIsInitialized(true);
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

  return (
    <AdminNotificationsContext.Provider value={{ counts, isLoading, error, refresh, isWebSocketHealthy, isInitialized }}>
      {children}
    </AdminNotificationsContext.Provider>
  );
};

export const useAdminNotificationsContext = () => {
  const context = React.useContext(AdminNotificationsContext);
  if (context === undefined) {
    const global = useAdminNotificationsGlobal();
    return {
      counts: global.counts,
      isLoading: global.isLoading,
      error: global.error,
      refresh: async () => {},
      isWebSocketHealthy: global.isWebSocketHealthy,
      isInitialized: global.isInitialized,
    };
  }
  return context;
};
