import { cn } from '@/lib/utils';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface BlockPortalUsersProps {
  children: React.ReactNode;
}

/**
 * Component that blocks portal users (residents) from accessing admin routes.
 * If a portal user (resident) is authenticated, they will be redirected to /portal.
 * If an admin user is authenticated, they will be redirected to their role's redirectPath.
 * Unauthenticated users can access the route (for login pages).
 */
export const BlockPortalUsers: React.FC<BlockPortalUsersProps> = ({
  children,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  // ⚠️ DEVELOPMENT MODE: Authentication temporarily disabled
  // TODO: Re-enable authentication before production
  const DISABLE_AUTH = false;

  if (DISABLE_AUTH) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center")}>
        <div className={cn("animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600")}></div>
      </div>
    );
  }

  // If user is authenticated and is a portal user (subscriber), redirect to portal
  if (isAuthenticated && user && user.role === 'resident') {
    return <Navigate to="/portal" replace />;
  }

  // If admin is authenticated, redirect to their role's redirectPath (not the login page)
  if (isAuthenticated && user && user.role === 'admin') {
    const redirectTo = user.redirectPath || '/portal';
    return <Navigate to={redirectTo} replace />;
  }

  // Allow access if not authenticated (for login)
  return <>{children}</>;
};

