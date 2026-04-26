import React from 'react';
import { useAllowedPages } from '../../context/AllowedPagesContext';
import { AccessDenied } from './AccessDenied';
import { cn } from '@/lib/utils';

interface AccessControlGateProps {
  children: React.ReactNode;
  pagePath: string;
}

export const AccessControlGate: React.FC<AccessControlGateProps> = ({ children, pagePath }) => {
  const { allowedPaths, isLoading } = useAllowedPages();

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center min-h-[40vh]')}>
        <div className={cn('animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600')}></div>
      </div>
    );
  }

  if (allowedPaths.size === 0) {
    return <AccessDenied pagePath={pagePath} message="No pages assigned to your account. Contact an administrator." />;
  }

  if (!allowedPaths.has(pagePath)) {
    return <AccessDenied pagePath={pagePath} />;
  }

  return <>{children}</>;
};
