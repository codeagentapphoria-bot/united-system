// React imports
import React from 'react';

// Custom Components
import { PortalHeader } from './PortalHeader';

// Hooks
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useSessionSync } from '@/hooks/useSessionSync';

// Utils
import { cn } from '@/lib/utils';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const onIdleWarning = () => {
    toast({
      title: 'Session Warning',
      description: 'Your session will expire in 2 minutes due to inactivity.',
      variant: 'default',
    });
  };

  const onIdleTimeout = () => {
    toast({
      title: 'Session Expired',
      description: 'Your session has expired due to inactivity. Please log in again.',
      variant: 'destructive',
    });
    navigate('/portal');
  };

  const onAbsoluteWarning = () => {
    toast({
      title: 'Session Warning',
      description: 'Your session will expire in 5 minutes. Please save your work.',
      variant: 'default',
    });
  };

  const onAbsoluteTimeout = () => {
    toast({
      title: 'Session Expired',
      description: 'Your session has expired. Please log in again.',
      variant: 'destructive',
    });
    navigate('/portal');
  };

  useSessionSync({
    onIdleWarning,
    onIdleTimeout,
    onAbsoluteWarning,
    onAbsoluteTimeout,
    enabled: true,
  });

  return (
    <div className={cn('min-h-screen flex flex-col bg-neutral-50')}>
      <PortalHeader />
      <main className={cn('flex-1')}>{children}</main>
    </div>
  );
};
