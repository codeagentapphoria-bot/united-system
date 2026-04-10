import { cn } from '@/lib/utils';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user' | 'developer' | 'resident';
  requireActiveStatus?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireActiveStatus = false,
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

  if (!isAuthenticated) {
    return <Navigate to="/portal" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/portal" replace />;
  }

  if (requireActiveStatus && user?.status !== 'active') {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

