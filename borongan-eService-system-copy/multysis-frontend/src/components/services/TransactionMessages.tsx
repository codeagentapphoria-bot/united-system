// React imports
import React, { useEffect, useRef } from 'react';

// Hooks
import { useTransactionMessages } from '@/hooks/useTransactionMessages';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Utils
import { cn, formatDateWithoutTimezone } from '@/lib/utils';
import { FiLock, FiMessageCircle, FiShield, FiUser, FiUserCheck } from 'react-icons/fi';

interface TransactionMessagesProps {
  transactionId: string;
  subscriberName?: string;
  onUnreadCountChange?: (count: number) => void;
  refreshTrigger?: number; // Add refresh trigger prop
}

export const TransactionMessages: React.FC<TransactionMessagesProps> = ({
  transactionId,
  subscriberName,
  onUnreadCountChange,
  refreshTrigger,
}) => {
  const { messages, isLoading, error, markAsRead, markAllAsRead, unreadCount, refreshMessages } = useTransactionMessages({
    transactionId,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });

  // Refresh messages when trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0 && refreshMessages) {
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
    const unreadMessages = messages.filter((msg) => !msg.isRead && msg.senderType === 'SUBSCRIBER');
    unreadMessages.forEach((msg) => {
      markAsRead(msg.id).catch(console.error);
    });
  }, [messages, markAsRead]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

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

  const hasUnread = unreadCount > 0;

  return (
    <div className="space-y-4">
      {/* Header with mark all as read */}
      {hasUnread && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
              {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
          >
            Mark All as Read
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
        {messages.map((message) => {
          const isFromAdmin = message.senderType === 'ADMIN';
          const isInternal = message.isInternal;
          const isUnread = !message.isRead && !isFromAdmin;

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                isFromAdmin ? 'flex-row' : 'flex-row-reverse'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  isFromAdmin
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700'
                )}
              >
                {isFromAdmin ? <FiShield size={16} /> : <FiUser size={16} />}
              </div>

              {/* Message Content */}
              <div
                className={cn(
                  'flex-1 space-y-1',
                  isFromAdmin ? 'items-start' : 'items-end'
                )}
              >
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%]',
                    isFromAdmin
                      ? isInternal
                        ? 'bg-orange-100 text-orange-900 border border-orange-300'
                        : 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900',
                    isUnread && 'ring-2 ring-blue-300'
                  )}
                >
                  {isInternal && isFromAdmin && (
                    <div className="flex items-center gap-1 mb-2 text-xs text-orange-700">
                      <FiLock size={12} />
                      <span className="font-medium">Internal Note</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                </div>
                <div className={cn('flex items-center gap-2 text-xs text-gray-500', isFromAdmin ? 'flex-row' : 'flex-row-reverse')}>
                  <span>
                    {formatDateWithoutTimezone(message.createdAt, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    })}
                  </span>
                  {isFromAdmin ? (
                    <span className="text-primary-600 font-medium flex items-center gap-1">
                      <FiShield size={12} />
                      Admin
                    </span>
                  ) : (
                    <span className="text-gray-600 font-medium flex items-center gap-1">
                      <FiUserCheck size={12} />
                      {subscriberName || 'Subscriber'}
                    </span>
                  )}
                  {isUnread && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
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

