// React imports
import React from 'react';

// Third-party libraries

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Custom Components
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useAdminNotifications } from '@/hooks/notifications/useAdminNotifications';

// Utils
import { cn } from '@/lib/utils';
import { FiBell, FiChevronDown, FiLogOut, FiMenu, FiUser } from 'react-icons/fi';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout, isLoggingOut } = useAuth();
  const { counts } = useAdminNotifications();
  const isAdmin = user?.role === 'admin';
  const hasNotifications = isAdmin && counts.total > 0;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className={cn("lg:hidden")}
          >
            <FiMenu size={24} />
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          
          {/* Notification Bell - Only show for admins */}
          {isAdmin && (
            <NotificationDropdown>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative hover:bg-primary-50 text-heading-600 hover:text-primary-700"
                )}
              >
                <FiBell size={20} />
                {hasNotifications && (
                  <Badge
                    className={cn(
                      "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0",
                      "bg-red-600 text-white text-xs font-semibold rounded-full",
                      "border-2 border-white"
                    )}
                  >
                    {counts.total > 99 ? '99+' : counts.total}
                  </Badge>
                )}
              </Button>
            </NotificationDropdown>
          )}

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 hover:bg-primary-50 text-heading-600 hover:text-primary-700 px-3 py-2 h-auto border border-primary-100">
                <div className="p-2 rounded-full bg-primary-100 text-primary-700">
                  <FiUser size={20} />
                </div>
                <div className={cn("hidden sm:flex items-center space-x-2")}>
                  <span className="text-base font-medium">
                    Hi, {user?.name || 'User'}
                  </span>
                  <FiChevronDown size={18} />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-primary-700">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-primary-700 hover:!bg-primary-50 cursor-pointer">
                <FiUser size={16} />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isLoggingOut ? (
                <DropdownMenuItem disabled className="text-gray-400 cursor-wait">
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging out...
                  </span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={logout} className="text-primary-700 hover:!bg-primary-50 cursor-pointer">
                  <FiLogOut size={16} />
                  Logout
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
