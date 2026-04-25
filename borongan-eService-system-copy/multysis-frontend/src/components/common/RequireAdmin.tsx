import { cn } from '@/lib/utils';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface RequireAdminProps {
  children: React.ReactNode;
}

export const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center')}>
        <div className={cn('animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600')}></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};
