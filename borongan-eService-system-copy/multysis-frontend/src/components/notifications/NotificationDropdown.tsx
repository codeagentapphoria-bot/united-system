// React imports
import React, { useMemo } from 'react';

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
import { useAdminNotifications } from '@/hooks/notifications/useAdminNotifications';
import { useActiveServices } from '@/hooks/useActiveServices';

// Utils
import { FiBell, FiEdit, FiFileText, FiMessageSquare, FiUsers } from 'react-icons/fi';

interface NotificationDropdownProps {
  children: React.ReactNode;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ children }) => {
  const navigate = useNavigate();
  const { counts } = useAdminNotifications();
  const { services } = useActiveServices();

  const hasNotifications = counts.total > 0;

  // Find the first service with pending applications
  const firstPendingService = useMemo(() => {
    if (!counts.pendingApplicationsByService || Object.keys(counts.pendingApplicationsByService).length === 0) {
      return null;
    }

    // Find the first service that has pending applications
    for (const service of services) {
      const pendingCount = counts.pendingApplicationsByService[service.code];
      if (pendingCount && pendingCount > 0) {
        // Convert service code to kebab-case for URL
        const kebabCode = service.code.toLowerCase().replace(/_/g, '-');
        return `/admin/e-government/${kebabCode}?tab=applications`;
      }
    }
    return null;
  }, [counts.pendingApplicationsByService, services]);

  const handlePendingApplicationsClick = () => {
    if (firstPendingService) {
      navigate(firstPendingService);
    } else {
      // Fallback to first service or e-government page
      if (services.length > 0) {
        const firstService = services[0];
        const kebabCode = firstService.code.toLowerCase().replace(/_/g, '-');
        navigate(`/admin/e-government/${kebabCode}?tab=applications`);
      } else {
        navigate('/admin/e-government');
      }
    }
  };

  const handleCitizensClick = () => {
    navigate('/admin/residents');
  };

  const handleSubscribersClick = () => {
    navigate('/admin/residents');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
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
            {/* Pending Applications */}
            {counts.pendingApplications > 0 && (
              <>
                <DropdownMenuItem
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:!bg-gray-100 focus:!bg-gray-100"
                  onSelect={handlePendingApplicationsClick}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <FiFileText size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">Pending Applications</span>
                      <span className="text-xs text-gray-500">
                        {counts.pendingApplications} {counts.pendingApplications === 1 ? 'application' : 'applications'} need review
                      </span>
                    </div>
                  </div>
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                    {counts.pendingApplications}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Pending Citizens */}
            {counts.pendingCitizens > 0 && (
              <>
                <DropdownMenuItem
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:!bg-gray-100 focus:!bg-gray-100"
                  onSelect={handleCitizensClick}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                      <FiUsers size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">Pending Citizen Approvals</span>
                      <span className="text-xs text-gray-500">
                        {counts.pendingCitizens} {counts.pendingCitizens === 1 ? 'citizen' : 'citizens'} awaiting approval
                      </span>
                    </div>
                  </div>
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-yellow-600 rounded-full">
                    {counts.pendingCitizens}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Pending Update Requests */}
            {counts.pendingUpdateRequests > 0 && (
              <>
                <DropdownMenuItem
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:!bg-gray-100 focus:!bg-gray-100"
                  onSelect={handleSubscribersClick}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                      <FiEdit size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">Pending Update Requests</span>
                      <span className="text-xs text-gray-500">
                        {counts.pendingUpdateRequests} {counts.pendingUpdateRequests === 1 ? 'request' : 'requests'} need review
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
                  onSelect={handleSubscribersClick}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                      <FiMessageSquare size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">Unread Messages</span>
                      <span className="text-xs text-gray-500">
                        {counts.unreadMessages} {counts.unreadMessages === 1 ? 'message' : 'messages'} from subscribers
                      </span>
                    </div>
                  </div>
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold text-white bg-green-600 rounded-full">
                    {counts.unreadMessages}
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

