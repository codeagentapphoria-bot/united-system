// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Hooks
import { useDashboardStatistics } from '@/hooks/admin/useDashboardStatistics';

// Utils
import { formatDistanceToNow } from 'date-fns';
import { FiFileText, FiUser, FiClock } from 'react-icons/fi';

// Format status for display
const formatStatus = (status: string | null): string => {
  if (!status) return 'Pending';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Get status badge variant
const getStatusVariant = (status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!status) return 'secondary';
  const upperStatus = status.toUpperCase();
  if (upperStatus.includes('APPROVED') || upperStatus.includes('COMPLETED')) return 'default';
  if (upperStatus.includes('REJECTED') || upperStatus.includes('CANCELLED')) return 'destructive';
  return 'secondary';
};

export const RecentActivity: React.FC = () => {
  const { statistics, isLoading } = useDashboardStatistics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Citizens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const recentTransactions = statistics?.recentTransactions || [];
  const recentCitizens = statistics?.recentCitizens || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <FiFileText size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.serviceName}
                      </p>
                      <Badge variant={getStatusVariant(transaction.status)} className="text-xs">
                        {formatStatus(transaction.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FiUser size={12} />
                        {transaction.subscriberName}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiClock size={12} />
                        {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Payment: <span className="font-medium">{formatStatus(transaction.paymentStatus)}</span>
                      {' • '}
                      Amount: <span className="font-medium">₱{transaction.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No recent transactions</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Citizens</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCitizens.length > 0 ? (
            <div className="space-y-4">
              {recentCitizens.map((citizen) => (
                <div
                  key={citizen.id}
                  className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <FiUser size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900">
                        {citizen.firstName} {citizen.lastName}
                      </p>
                      <Badge 
                        variant={
                          citizen.residencyStatus === 'ACTIVE' 
                            ? 'default' 
                            : citizen.residencyStatus === 'PENDING'
                            ? 'secondary'
                            : 'outline'
                        }
                        className="text-xs"
                      >
                        {citizen.residencyStatus}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {citizen.phoneNumber && (
                        <span>{citizen.phoneNumber}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <FiClock size={12} />
                        {formatDistanceToNow(new Date(citizen.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No recent citizens</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

