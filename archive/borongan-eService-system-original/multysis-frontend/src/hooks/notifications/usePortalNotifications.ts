// React imports
import { useCallback, useEffect, useRef, useState } from 'react';

// Services
import {
  notificationService,
  type SubscriberNotificationCounts,
} from '@/services/api/notification.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Context
import { useAuth } from '@/context/AuthContext';

interface UsePortalNotificationsOptions {
  pollInterval?: number; // Polling interval in milliseconds (default: 30000 = 30 seconds)
  autoFetch?: boolean; // Whether to automatically fetch on mount
  enabled?: boolean; // Whether polling is enabled (pauses when tab is not visible)
}

interface UsePortalNotificationsReturn {
  counts: SubscriberNotificationCounts;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_COUNTS: SubscriberNotificationCounts = {
  pendingUpdateRequests: 0,
  unreadMessages: 0,
  statusUpdates: 0,
  total: 0,
};

export const usePortalNotifications = ({
  pollInterval = 30000, // 30 seconds default
  autoFetch = true,
  enabled = true,
}: UsePortalNotificationsOptions = {}): UsePortalNotificationsReturn => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [counts, setCounts] = useState<SubscriberNotificationCounts>(EMPTY_COUNTS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchCounts = useCallback(async () => {
    // Only fetch if user is subscriber
    if (!user || user.role !== 'subscriber') {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await notificationService.getSubscriberNotificationCounts();
      if (isMountedRef.current) {
        setCounts(result);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || err.message || 'Failed to fetch notification counts';
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

  // Set up polling
  useEffect(() => {
    if (!autoFetch || !enabled || !user || user.role !== 'subscriber') {
      return;
    }

    // Initial fetch
    fetchCounts();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      if (enabled && isMountedRef.current) {
        fetchCounts();
      }
    }, pollInterval);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoFetch, enabled, pollInterval, fetchCounts, user]);

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
        if (autoFetch && enabled && user && user.role === 'subscriber' && !intervalRef.current) {
          fetchCounts();
          intervalRef.current = setInterval(() => {
            if (enabled && isMountedRef.current) {
              fetchCounts();
            }
          }, pollInterval);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoFetch, enabled, pollInterval, fetchCounts, user]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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

