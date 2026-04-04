import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FiCheckCircle, FiClock, FiXCircle, FiAlertCircle } from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface TaxStatusBadgeProps {
  status: 'paid' | 'partial' | 'unpaid' | 'exemption-pending';
  className?: string;
}

export const TaxStatusBadge: React.FC<TaxStatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'paid':
        return {
          label: 'Tax Paid',
          icon: FiCheckCircle,
          className: 'bg-green-100 text-green-700 border-green-300',
        };
      case 'partial':
        return {
          label: 'Partial Payment',
          icon: FiClock,
          className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        };
      case 'unpaid':
        return {
          label: 'Tax Unpaid',
          icon: FiXCircle,
          className: 'bg-red-100 text-red-700 border-red-300',
        };
      case 'exemption-pending':
        return {
          label: 'Exemption Pending',
          icon: FiAlertCircle,
          className: 'bg-blue-100 text-blue-700 border-blue-300',
        };
      default:
        return {
          label: 'Unknown',
          icon: FiAlertCircle,
          className: 'bg-gray-100 text-gray-700 border-gray-300',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge className={cn('text-xs flex items-center gap-1', config.className, className)}>
      <Icon size={12} />
      {config.label}
    </Badge>
  );
};
