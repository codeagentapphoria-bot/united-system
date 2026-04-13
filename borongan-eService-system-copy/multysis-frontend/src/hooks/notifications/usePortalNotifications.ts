// React imports
import { useCallback, useEffect, useRef } from 'react';

// Services
import { notificationService, type SubscriberNotificationCounts } from '@/services/api/notification.service';

// Hooks
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Context
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

// Lib
import { queryKeys } from '@/lib/query-keys';

// Types
import type {
  ProgramApplicationReviewPayload,
  TransactionUpdatePayload,
  TransactionNoteResponse,
} from '@/types/socket.types';

interface UsePortalNotificationsOptions {
  pollInterval?: number;
  autoFetch?: boolean;
  enabled?: boolean;
}

interface UsePortalNotificationsReturn {
  counts: SubscriberNotificationCounts;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  clearProgramApplicationUpdates: () => void;
  isWebSocketConnected: boolean;
}

const EMPTY_COUNTS: SubscriberNotificationCounts = {
  pendingUpdateRequests: 0,
  unreadMessages: 0,
  statusUpdates: 0,
  programApplicationUpdates: 0,
  total: 0,
};

// Module-level flag: once the resident dismisses the program application notification,
// suppress it from re-appearing on background polls until a new review arrives via socket.
let programApplicationUpdatesDismissed = false;

export const usePortalNotifications = ({
  pollInterval = 60000,
  autoFetch = true,
  enabled = true,
}: UsePortalNotificationsOptions = {}): UsePortalNotificationsReturn => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);

  const fetchCounts = useCallback(async () => {
    const result = await notificationService.getSubscriberNotificationCounts();
    return result;
  }, []);

  const {
    data: counts = EMPTY_COUNTS,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: fetchCounts,
    enabled: autoFetch && enabled && !!user && user.role === 'resident',
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: pollInterval,
    refetchOnWindowFocus: false,
    // Suppress programApplicationUpdates when dismissed, until a new review comes in via socket
    select: (data: SubscriberNotificationCounts) => {
      if (programApplicationUpdatesDismissed) {
        const diff = data.programApplicationUpdates ?? 0;
        return { ...data, programApplicationUpdates: 0, total: Math.max(0, data.total - diff) };
      }
      return data;
    },
  });

  // Update query client cache on WebSocket events
  useEffect(() => {
    if (!socket || !isConnected || !user || user.role !== 'resident') {
      return;
    }

    const handleTransactionUpdate = (data: TransactionUpdatePayload) => {
      queryClient.setQueryData<SubscriberNotificationCounts>(queryKeys.notifications.all, old => {
        if (!old) return old;
        const updated = { ...old };

        if (data.status !== undefined && data.oldStatus !== undefined && data.status !== data.oldStatus) {
          updated.statusUpdates += 1;
          updated.total += 1;
        }

        if (
          data.paymentStatus !== undefined &&
          data.oldPaymentStatus !== undefined &&
          data.paymentStatus !== data.oldPaymentStatus
        ) {
          if (data.oldPaymentStatus === 'PAID' && data.paymentStatus !== 'PAID') {
            updated.pendingUpdateRequests += 1;
            updated.total += 1;
          } else if (data.oldPaymentStatus !== 'PAID' && data.paymentStatus === 'PAID') {
            updated.pendingUpdateRequests = Math.max(0, updated.pendingUpdateRequests - 1);
            updated.total = Math.max(0, updated.total - 1);
          }
        }

        return updated;
      });
    };

    const handleNewTransactionNote = (data: TransactionNoteResponse) => {
      if (data.senderType === 'ADMIN' && !data.isRead) {
        queryClient.setQueryData<SubscriberNotificationCounts>(queryKeys.notifications.all, old => {
          if (!old) return old;
          return {
            ...old,
            unreadMessages: old.unreadMessages + 1,
            total: old.total + 1,
          };
        });
      }
    };

    const handleTransactionNoteRead = (data: {
      transactionId: string;
      senderType: 'ADMIN' | 'RESIDENT';
      isRead: boolean;
    }) => {
      if (data.senderType === 'RESIDENT' && data.isRead) {
        queryClient.setQueryData<SubscriberNotificationCounts>(queryKeys.notifications.all, old => {
          if (!old) return old;
          return {
            ...old,
            unreadMessages: Math.max(0, old.unreadMessages - 1),
            total: Math.max(0, old.total - 1),
          };
        });
      }
    };

    const handleProgramApplicationReview = (_data: ProgramApplicationReviewPayload) => {
      // New review arrived — un-dismiss so the resident sees it
      programApplicationUpdatesDismissed = false;
      queryClient.setQueryData<SubscriberNotificationCounts>(queryKeys.notifications.all, old => {
        if (!old) return old;
        return {
          ...old,
          programApplicationUpdates: (old.programApplicationUpdates ?? 0) + 1,
          total: old.total + 1,
        };
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.portalPrograms.myApplications });
      queryClient.invalidateQueries({ queryKey: queryKeys.portalPrograms.all });
    };

    socket.on('transaction:update', handleTransactionUpdate);
    socket.on('transaction:note:new', handleNewTransactionNote);
    socket.on('transaction:note:read', handleTransactionNoteRead);
    socket.on('program-application:review', handleProgramApplicationReview);

    return () => {
      socket.off('transaction:update', handleTransactionUpdate);
      socket.off('transaction:note:new', handleNewTransactionNote);
      socket.off('transaction:note:read', handleTransactionNoteRead);
      socket.off('program-application:review', handleProgramApplicationReview);
    };
  }, [socket, isConnected, user, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  }, [queryClient]);

  const clearProgramApplicationUpdates = useCallback(() => {
    programApplicationUpdatesDismissed = true;
    queryClient.setQueryData<SubscriberNotificationCounts>(queryKeys.notifications.all, old => {
      if (!old) return old;
      const diff = old.programApplicationUpdates ?? 0;
      return { ...old, programApplicationUpdates: 0, total: Math.max(0, old.total - diff) };
    });
  }, [queryClient]);

  return {
    counts,
    isLoading,
    error: error ? (error as Error).message : null,
    refresh,
    clearProgramApplicationUpdates,
    isWebSocketConnected: isConnected,
  };
};
