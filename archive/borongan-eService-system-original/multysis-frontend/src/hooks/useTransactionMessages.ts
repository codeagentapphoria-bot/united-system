// React imports
import { useCallback, useEffect, useRef, useState } from 'react';

// Services
import { transactionNoteService, type CreateTransactionNoteInput, type TransactionNote } from '@/services/api/transaction-note.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

interface UseTransactionMessagesOptions {
  transactionId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseTransactionMessagesReturn {
  messages: TransactionNote[];
  isLoading: boolean;
  error: string | null;
  createMessage: (data: CreateTransactionNoteInput) => Promise<void>;
  markAsRead: (noteId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  unreadCount: number;
}

export const useTransactionMessages = ({
  transactionId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds default
}: UseTransactionMessagesOptions): UseTransactionMessagesReturn => {
  const [messages, setMessages] = useState<TransactionNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!transactionId) return;

    try {
      setError(null);
      const fetchedMessages = await transactionNoteService.getNotes(transactionId);
      setMessages(fetchedMessages);

      // Calculate unread count
      const unread = fetchedMessages.filter((msg) => !msg.isRead).length;
      setUnreadCount(unread);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch messages';
      setError(errorMessage);
      console.error('Failed to fetch transaction messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!transactionId) return;

    try {
      const count = await transactionNoteService.getUnreadCount(transactionId);
      setUnreadCount(count);
    } catch (err) {
      // Silently fail for unread count - not critical
      console.error('Failed to fetch unread count:', err);
    }
  }, [transactionId]);

  const createMessage = useCallback(
    async (data: CreateTransactionNoteInput) => {
      if (!transactionId) return;

      try {
        setError(null);
        const newMessage = await transactionNoteService.createNote(transactionId, data);
        setMessages((prev) => [...prev, newMessage]);
        
        // Update unread count if message is not from current user
        // (We'll need to check sender type - for now, assume new messages are unread for others)
        await fetchUnreadCount();

        toast({
          title: 'Success',
          description: 'Message sent successfully',
        });
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to send message';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        throw err;
      }
    },
    [transactionId, toast, fetchUnreadCount]
  );

  const markAsRead = useCallback(
    async (noteId: string) => {
      if (!transactionId) return;

      try {
        setError(null);
        await transactionNoteService.markAsRead(transactionId, noteId);
        
        // Update local state
        setMessages((prev) =>
          prev.map((msg) => (msg.id === noteId ? { ...msg, isRead: true } : msg))
        );
        
        // Update unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to mark message as read';
        setError(errorMessage);
        console.error('Failed to mark message as read:', err);
      }
    },
    [transactionId]
  );

  const markAllAsRead = useCallback(
    async () => {
      if (!transactionId) return;

      try {
        setError(null);
        await transactionNoteService.markAllAsRead(transactionId);
        
        // Update local state
        setMessages((prev) => prev.map((msg) => ({ ...msg, isRead: true })));
        setUnreadCount(0);
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to mark all messages as read';
        setError(errorMessage);
        console.error('Failed to mark all messages as read:', err);
      }
    },
    [transactionId]
  );

  const refreshMessages = useCallback(async () => {
    setIsLoading(true);
    await fetchMessages();
  }, [fetchMessages]);

  // Initial fetch
  useEffect(() => {
    if (transactionId) {
      fetchMessages();
      fetchUnreadCount();
    }
  }, [transactionId, fetchMessages, fetchUnreadCount]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && transactionId) {
      intervalRef.current = setInterval(() => {
        fetchMessages();
        fetchUnreadCount();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, transactionId, refreshInterval, fetchMessages, fetchUnreadCount]);

  return {
    messages,
    isLoading,
    error,
    createMessage,
    markAsRead,
    markAllAsRead,
    refreshMessages,
    unreadCount,
  };
};

