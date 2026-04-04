// React imports
import React, { useEffect, useRef } from 'react';

// Hooks
import { useTransactionMessages } from '@/hooks/useTransactionMessages';

// Utils
import { Badge } from '@/components/ui/badge';
import { cn, formatDateWithoutTimezone } from '@/lib/utils';
import { FiMessageCircle, FiUser } from 'react-icons/fi';

interface TransactionMessagesProps {
  transactionId: string;
  onUnreadCountChange?: (count: number) => void;
  refreshTrigger?: number; // Add refresh trigger prop
}

export const TransactionMessages: React.FC<TransactionMessagesProps> = ({
  transactionId,
  onUnreadCountChange,
  refreshTrigger,
}) => {
  const { messages, isLoading, error, markAsRead, unreadCount, refreshMessages } = useTransactionMessages({
    transactionId,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });

  // Refresh messages when trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refreshMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notify parent of unread count changes
  useEffect(() => {
    if (onUnreadCountChange) {
      onUnreadCountChange(unreadCount);
    }
  }, [unreadCount, onUnreadCountChange]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    const unreadMessages = messages.filter((msg) => !msg.isRead && msg.senderType !== 'SUBSCRIBER');
    unreadMessages.forEach((msg) => {
      markAsRead(msg.id).catch(console.error);
    });
  }, [messages, markAsRead]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-gray-500">Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FiMessageCircle className="text-gray-400 mb-3" size={48} />
        <p className="text-sm text-gray-500">No messages yet</p>
        <p className="text-xs text-gray-400 mt-1">Start a conversation about this transaction</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
        {messages.map((message) => {
          const isFromUser = message.senderType === 'SUBSCRIBER';
          const isUnread = !message.isRead && !isFromUser;

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                isFromUser ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  isFromUser
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700'
                )}
              >
                <FiUser size={16} />
              </div>

              {/* Message Content */}
              <div
                className={cn(
                  'flex-1 space-y-1',
                  isFromUser ? 'items-end' : 'items-start'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%]',
                    isFromUser
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900',
                    isUnread && 'ring-2 ring-primary-300'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                </div>
                <div className={cn('flex items-center gap-2 text-xs text-gray-500', isFromUser && 'flex-row-reverse')}>
                  <span>
                    {formatDateWithoutTimezone(message.createdAt, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    })}
                  </span>
                  {isFromUser ? (
                    <span className="text-primary-600 font-medium">You</span>
                  ) : (
                    <span className="text-gray-600 font-medium">Admin</span>
                  )}
                  {isUnread && (
                    <Badge variant="outline" className="text-xs bg-primary-50 text-primary-700 border-primary-200">
                      New
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

