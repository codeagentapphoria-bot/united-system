import React from 'react';
import { Badge } from '@/components/ui/badge';
import { FiDollarSign } from 'react-icons/fi';
import { cn } from '@/lib/utils';

interface TaxIndicatorProps {
  taxAmount: number;
  className?: string;
  showTooltip?: boolean;
}

export const TaxIndicator: React.FC<TaxIndicatorProps> = ({
  taxAmount,
  className,
  showTooltip = true,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const indicator = (
    <Badge
      className={cn(
        'bg-primary-100 text-primary-700 border-primary-300 text-xs flex items-center gap-1',
        className
      )}
      title={showTooltip ? `Tax Amount: ${formatCurrency(taxAmount)}` : undefined}
    >
      <FiDollarSign size={12} />
      Tax Applied
    </Badge>
  );

  return indicator;
};
