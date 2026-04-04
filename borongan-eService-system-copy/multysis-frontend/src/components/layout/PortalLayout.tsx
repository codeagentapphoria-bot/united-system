// React imports
import React from 'react';

// Custom Components
import { PortalHeader } from './PortalHeader';
import { PortalFooter } from './PortalFooter';

// Utils
import { cn } from '@/lib/utils';

interface PortalLayoutProps {
  children: React.ReactNode;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ children }) => {
  return (
    <div className={cn('min-h-screen flex flex-col bg-neutral-50')}>
      <PortalHeader />
      <main className={cn('flex-1')}>{children}</main>
      <PortalFooter />
    </div>
  );
};

