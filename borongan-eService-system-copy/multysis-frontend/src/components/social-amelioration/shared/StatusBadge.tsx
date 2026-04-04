// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const variants: Record<string, string> = {
    active: 'bg-success-100 text-success-700',
    inactive: 'bg-neutral-200 text-neutral-700',
    pending: 'bg-warning-100 text-warning-700',
  };

  return (
    <Badge className={`${variants[status] || variants.inactive} ${className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

