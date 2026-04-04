// React imports
import React, { useState } from 'react';

// Third-party libraries
import { Link, useLocation, useNavigate } from 'react-router-dom';

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
import { PortalNotificationDropdown } from '@/components/notifications/PortalNotificationDropdown';
import { PortalLoginSheet } from '@/components/portal/PortalLoginSheet';
import { PortalSignupSheet } from '@/components/portal/PortalSignupSheet';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useLoginSheet } from '@/context/LoginSheetContext';
import { usePortalNotifications } from '@/hooks/notifications/usePortalNotifications';

// Utils
import { cn } from '@/lib/utils';
import { FiBell, FiChevronDown, FiLogOut, FiMenu, FiUser, FiX } from 'react-icons/fi';

interface PortalHeaderProps {}

export const PortalHeader: React.FC<PortalHeaderProps> = () => {
  const { user, logout, isLoading } = useAuth();
  const {
    isLoginOpen,
    isSignupOpen,
    openLoginSheet,
    openSignupSheet,
    setLoginSheetOpen,
    setSignupSheetOpen,
  } = useLoginSheet();
  const { counts } = usePortalNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isSubscriber = user?.role === 'subscriber';
  const hasNotifications = isSubscriber && counts.total > 0;

  const navigationItems = [
    { path: '/portal', label: 'Home' },
    { path: '/portal/e-government', label: 'E-Government' },
    { path: '/portal/e-bills', label: 'E-Bills' },
    { path: '/portal/e-services', label: 'E-Services' },
    { path: '/portal/e-news', label: 'E-News' },
  ];

  const isActive = (path: string) => {
    if (path === '/portal') {
      return location.pathname === '/portal' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/portal');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/portal" className="flex items-center space-x-3">
            <img 
              src="/logo-colored.svg" 
              alt="City of Borongan Logo" 
              className="h-10 w-auto"
            />
            <div className="hidden sm:block">
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive(item.path)
                    ? 'bg-primary-600 text-white'
                    : 'text-heading-600 hover:bg-primary-50 hover:text-primary-700'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User Menu / Login Button */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              // Show loading state while checking authentication
              <div className="flex items-center space-x-2">
                <div className="h-9 w-20 bg-gray-200 animate-pulse rounded-md" />
                <div className="h-9 w-20 bg-gray-200 animate-pulse rounded-md" />
              </div>
            ) : user ? (
              <>
                {/* Notification Bell - Only for subscribers */}
                {isSubscriber && (
                  <PortalNotificationDropdown>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'relative hover:bg-primary-50 text-heading-600 hover:text-primary-700'
                      )}
                    >
                      <FiBell size={20} />
                      {hasNotifications && (
                        <Badge
                          className={cn(
                            'absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0',
                            'bg-red-600 text-white text-xs font-semibold rounded-full'
                          )}
                        >
                          {counts.total > 99 ? '99+' : counts.total}
                        </Badge>
                      )}
                    </Button>
                  </PortalNotificationDropdown>
                )}

                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 hover:bg-primary-50 text-heading-600 hover:text-primary-700 px-3 py-2 h-auto border border-primary-200"
                  >
                    <div className="p-1.5 rounded-full bg-primary-100 text-primary-700">
                      <FiUser size={18} />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">
                      {user.name || user.phoneNumber || 'User'}
                    </span>
                    <FiChevronDown size={16} className="hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-primary-700">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate('/portal/profile')}
                    className="text-heading-600 hover:!bg-primary-50 cursor-pointer"
                  >
                    <FiUser size={16} className="mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-heading-600 hover:!bg-primary-50 cursor-pointer"
                  >
                    <FiLogOut size={16} className="mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={openLoginSheet}
                  className="border-primary-600 text-primary-600 hover:bg-primary-50"
                >
                  Login
                </Button>
                <Button
                  onClick={openSignupSheet}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden"
            >
              {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive(item.path)
                      ? 'bg-primary-600 text-white'
                      : 'text-heading-600 hover:bg-primary-50 hover:text-primary-700'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {/* Mobile Login/Signup */}
            {!isLoading && !user && (
              <div className="px-4 py-4 flex flex-col space-y-3 border-t border-gray-200 mt-2">
                <Button
                  variant="outline"
                  onClick={() => { openLoginSheet(); setIsMobileMenuOpen(false); }}
                  className="w-full border-primary-600 text-primary-600"
                >
                  Login
                </Button>
                <Button
                  onClick={() => { openSignupSheet(); setIsMobileMenuOpen(false); }}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Login Sheet */}
      <PortalLoginSheet open={isLoginOpen} onOpenChange={setLoginSheetOpen} />

      {/* Signup Sheet */}
      <PortalSignupSheet open={isSignupOpen} onOpenChange={setSignupSheetOpen} />
    </header>
  );
};

