// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Services
import type { Transaction } from '@/services/api/transaction.service';
import { TaxStatusBadge } from '@/components/tax/TaxStatusBadge';
import { TaxIndicator } from '@/components/tax/TaxIndicator';

// Utils
import { cn } from '@/lib/utils';

// Icons
import { FiEye, FiMessageCircle, FiUser } from 'react-icons/fi';

interface ApplicationCardProps {
  transaction: Transaction;
  onViewDetails: () => void;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ transaction, onViewDetails }) => {
  const getSubscriberName = () => {
    if (transaction.subscriber?.citizen) {
      const { firstName, lastName } = transaction.subscriber.citizen;
      return `${firstName} ${lastName}`;
    }
    if (transaction.subscriber?.nonCitizen) {
      const { firstName, lastName } = transaction.subscriber.nonCitizen;
      return `${firstName} ${lastName}`;
    }
    return 'Unknown';
  };

  const getSubscriberPhone = () => {
    return transaction.subscriber?.citizen?.phoneNumber || transaction.subscriber?.nonCitizen?.phoneNumber || 'N/A';
  };

  const formatStatus = (status: string | undefined): string => {
    if (!status) return 'N/A';
    // Replace underscores with spaces and capitalize each word
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatPaymentStatus = (status: string): string => {
    if (!status) return 'N/A';
    // Replace underscores with spaces and capitalize each word
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    switch (status.toUpperCase()) {
      case 'APPROVED':
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Helper functions for tax display
  const hasTaxComputation = (transaction: Transaction) => {
    return !!transaction.taxComputation;
  };

  const getTaxAmount = (transaction: Transaction): number => {
    if (!transaction.taxComputation) return 0;
    return Number(transaction.taxComputation.adjustedTax ?? transaction.taxComputation.totalTax);
  };

  const getTaxBalance = (transaction: Transaction): number => {
    if (!transaction.taxComputation?.balance) return 0;
    return transaction.taxComputation.balance.balance;
  };

  const getTaxStatus = (transaction: Transaction): 'paid' | 'partial' | 'unpaid' | 'exemption-pending' => {
    if (!transaction.taxComputation) return 'unpaid';
    
    // Check if there are pending exemptions
    // Note: In a real implementation, we'd need to fetch exemption status
    // For now, we'll check based on balance and exemptions applied
    const hasPendingExemptions = transaction.taxComputation.exemptionsApplied && 
      transaction.taxComputation.exemptionsApplied.length > 0 &&
      getTaxBalance(transaction) > 0;

    if (hasPendingExemptions) {
      return 'exemption-pending';
    }

    const balance = getTaxBalance(transaction);
    const totalTax = transaction.taxComputation.balance?.totalTax || getTaxAmount(transaction);

    if (balance <= 0) {
      return 'paid';
    } else if (balance < totalTax) {
      return 'partial';
    } else {
      return 'unpaid';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Reference Number and Transaction ID */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Reference Number</p>
                <p className="text-sm font-semibold text-heading-700">{transaction.referenceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                <p className="text-sm font-mono text-heading-700">{transaction.transactionId}</p>
              </div>
            </div>

            {/* Subscriber Info */}
            <div className="flex items-center gap-2">
              <FiUser size={16} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-heading-700">{getSubscriberName()}</p>
                <p className="text-xs text-gray-500">{getSubscriberPhone()}</p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {hasTaxComputation(transaction) && (
                <TaxIndicator taxAmount={getTaxAmount(transaction)} />
              )}
              <Badge className={cn('text-xs', getPaymentStatusColor(transaction.paymentStatus))}>
                Payment: {formatPaymentStatus(transaction.paymentStatus)}
              </Badge>
              {transaction.status && (
                <Badge className={cn('text-xs', getStatusColor(transaction.status))}>
                  Status: {formatStatus(transaction.status)}
                </Badge>
              )}
              {hasTaxComputation(transaction) && (
                <TaxStatusBadge status={getTaxStatus(transaction)} />
              )}
              {transaction.isResidentOfBorongan && (
                <Badge className="bg-blue-100 text-blue-700 text-xs">Resident</Badge>
              )}
              {transaction.unreadMessageCount !== undefined && transaction.unreadMessageCount > 0 && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs flex items-center gap-1">
                  <FiMessageCircle size={12} />
                  {transaction.unreadMessageCount} unread
                </Badge>
              )}
              {transaction.updateRequestStatus && transaction.updateRequestStatus !== 'NONE' && (
                <Badge className={cn('text-xs',
                  transaction.updateRequestStatus === 'PENDING_PORTAL' ? 'bg-yellow-100 text-yellow-700' :
                  transaction.updateRequestStatus === 'PENDING_ADMIN' ? 'bg-blue-100 text-blue-700' :
                  transaction.updateRequestStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {transaction.updateRequestStatus === 'PENDING_PORTAL' ? 'Update Pending' :
                   transaction.updateRequestStatus === 'PENDING_ADMIN' ? 'Update Requested' :
                   transaction.updateRequestStatus === 'APPROVED' ? 'Update Approved' :
                   'Update Rejected'}
                </Badge>
              )}
            </div>

            {/* Amount and Date */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              {transaction.paymentAmount > 0 && (
                <span>Service: ₱{Number(transaction.paymentAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
              {hasTaxComputation(transaction) && (
                <span>Tax: ₱{getTaxAmount(transaction).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              )}
              <span>
                Created: {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            <Button onClick={onViewDetails} variant="outline" size="sm" className="w-full sm:w-auto hover:bg-primary-50 hover:text-primary-700">
              <FiEye size={16} className="mr-2" />
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

