// React imports
import React, { useState } from 'react';

// Third-party libraries
import { useNavigate } from 'react-router-dom';

// UI Components (shadcn/ui)
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Hooks
import { usePortalNotifications } from '@/hooks/notifications/usePortalNotifications';

// Utils
import { FiBell, FiEdit, FiFileText, FiMessageSquare } from 'react-icons/fi';

interface PortalNotificationDropdownProps {
  children: React.ReactNode;
}

export const PortalNotificationDropdown: React.FC<PortalNotificationDropdownProps> = ({
  children,
}) => {
  const navigate = useNavigate();
  const { counts, refresh } = usePortalNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const hasNotifications = counts.total > 0;

  // Refresh notifications when dropdown opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Refresh when opening to get latest counts
      refresh();
    }
  };

  const handlePendingUpdateRequestsSelect = async () => {
    await refresh(); // Refresh before navigating
    setIsOpen(false); // Close dropdown
    navigate('/portal/profile');
  };

  const handleUnreadMessagesSelect = async () => {
    await refresh(); // Refresh before navigating
    setIsOpen(false); // Close dropdown
    navigate('/portal/profile');
  };

  const handleStatusUpdatesSelect = async () => {
    await refresh(); // Refresh before navigating
    setIsOpen(false); // Close dropdown
    navigate('/portal/profile');
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="text-primary-700 flex items-center justify-between">
          <span>Notifications</span>
          {hasNotifications && (
            <span className="text-xs font-normal text-gray-500">
              {counts.total} {counts.total === 1 ? 'item' : 'items'}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!hasNotifications ? (
          <div className="px-2 py-6 text-center text-gray-500">
            <FiBell size={32} className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {/* Pending Update Requests */}
            {counts.pendingUpdateRequests > 0 && (
              <>
                <DropdownMenuItem
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:!bg-gray-100 focus:!bg-gray-100"
                  onSelect={handlePendingUpdateRequestsSelect}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                      <FiEdit size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        Pending Update Requests
                      </span>
                      <span className="text-xs text-gray-500">
                        {counts.pendingUpdateRequests}{' '}
                        {counts.pendingUpdateRequests === 1 ? 'request' : 'requests'} from admin
                      </span>
                    </div>
                  </div>
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-purple-600 rounded-full">
                    {counts.pendingUpdateRequests}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Unread Messages */}
            {counts.unreadMessages > 0 && (
              <>
                <DropdownMenuItem
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:!bg-gray-100 focus:!bg-gray-100"
                  onSelect={handleUnreadMessagesSelect}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                      <FiMessageSquare size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">Unread Messages</span>
                      <span className="text-xs text-gray-500">
                        {counts.unreadMessages} {counts.unreadMessages === 1 ? 'message' : 'messages'}{' '}
                        from admin
                      </span>
                    </div>
                  </div>
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-green-600 rounded-full">
                    {counts.unreadMessages}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Status Updates */}
            {counts.statusUpdates > 0 && (
              <>
                <DropdownMenuItem
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:!bg-gray-100 focus:!bg-gray-100"
                  onSelect={handleStatusUpdatesSelect}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <FiFileText size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">Status Updates</span>
                      <span className="text-xs text-gray-500">
                        {counts.statusUpdates} recent{' '}
                        {counts.statusUpdates === 1 ? 'update' : 'updates'} on applications
                      </span>
                    </div>
                  </div>
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                    {counts.statusUpdates}
                  </span>
                </DropdownMenuItem>
              </>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

