import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { useSocket } from '@/context/SocketContext';
import { cn } from '@/lib/utils';
import type { Service } from '@/services/api/service.service';
import { subscriberService } from '@/services/api/subscriber.service';
import type { NewTransactionPayload, TransactionUpdatePayload } from '@/types/socket.types';
import type { Transaction } from '@/types/subscriber';
import {
    getPaymentStatusCardBg,
    getPaymentStatusColor,
    getPaymentStatusIcon,
    getPaymentStatusTextColor,
    normalizeServiceCode,
} from '@/utils/dynamic-subscriber-tabs';
import React, { useEffect, useState } from 'react';
import { FiDownload, FiEye } from 'react-icons/fi';

interface DynamicServiceTabProps {
  service: Service;
  subscriberId: string;
  onViewDetails: (transaction: Transaction) => void;
  isActive?: boolean; // Whether this tab is currently active
}

export const DynamicServiceTab: React.FC<DynamicServiceTabProps> = ({
  service,
  subscriberId,
  onViewDetails,
  isActive = false,
}) => {
  const { socket, isConnected } = useSocket();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchTransactions = async () => {
    if (!subscriberId || !service.id) return;
    
    setIsLoading(true);
    try {
      const data = await subscriberService.getSubscriberTransactions(subscriberId, service.id);
      setTransactions(data);
      setHasFetched(true);
    } catch (error) {
      console.error(`Failed to fetch transactions for service ${service.code}:`, error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Only fetch when tab becomes active and we haven't fetched yet
  useEffect(() => {
    if (isActive && !hasFetched && subscriberId && service.id) {
      fetchTransactions();
    }
  }, [isActive, hasFetched, subscriberId, service.id, service.code]);

  // Listen for WebSocket events to update transactions incrementally
  useEffect(() => {
    if (!socket || !isConnected || !isActive || !hasFetched || !subscriberId) {
      return;
    }

    // Listen for transaction updates - update specific transaction in list
    const handleTransactionUpdate = (data: TransactionUpdatePayload) => {
      // Only process if transaction belongs to this subscriber (we can't verify service without transaction data)
      // Update the specific transaction in the current list
      setTransactions((prevTransactions) => {
        const index = prevTransactions.findIndex(
          (t) => t.id === data.transactionId || t.transactionId === data.transactionId
        );

        if (index === -1) {
          // Transaction not in current list
          return prevTransactions;
        }

        // Update the transaction in place
        const updated = [...prevTransactions];
        const validAppointmentStatuses = ['PENDING', 'ACCEPTED', 'REQUESTED_UPDATE', 'DECLINED', 'CANCELLED'] as const;
        const newAppointmentStatus = data.appointmentStatus !== undefined
          ? (validAppointmentStatuses.includes(data.appointmentStatus as typeof validAppointmentStatuses[number])
              ? data.appointmentStatus as typeof validAppointmentStatuses[number]
              : updated[index].appointmentStatus)
          : undefined;
        updated[index] = {
          ...updated[index],
          ...(data.status !== undefined && { status: data.status }),
          ...(data.paymentStatus !== undefined && { paymentStatus: data.paymentStatus }),
          ...(newAppointmentStatus !== undefined && { appointmentStatus: newAppointmentStatus }),
          ...(data.paymentAmount !== undefined && { paymentAmount: data.paymentAmount }),
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : data.updatedAt.toISOString(),
        };

        return updated;
      });
    };

    // Listen for new transactions - add to list if matches
    const handleNewTransaction = (data: NewTransactionPayload) => {
      // Only add if transaction belongs to this subscriber and service
      if (data.subscriberId !== subscriberId || data.serviceId !== service.id) {
        return;
      }

      setTransactions((prev) => {
        // Check if transaction already exists (prevent duplicates)
        const exists = prev.some((t) => t.id === data.id || t.transactionId === data.transactionId);
        if (exists) return prev;

        // Create a transaction object from the payload
        const newTransaction: Transaction = {
          id: data.id,
          subscriberId: data.subscriberId,
          serviceId: data.serviceId,
          transactionId: data.transactionId,
          referenceNumber: data.referenceNumber || '',
          paymentStatus: data.paymentStatus || 'PENDING',
          paymentAmount: data.paymentAmount || 0,
          isResidentOfBorongan: false,
          isPosted: false,
          status: data.status,
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : data.createdAt.toISOString(),
          updatedAt: typeof data.createdAt === 'string' ? data.createdAt : data.createdAt.toISOString(),
          service: service, // Use the service prop
        };

        // Add to beginning of list
        return [newTransaction, ...prev];
      });
    };

    socket.on('transaction:update', handleTransactionUpdate);
    socket.on('transaction:new', handleNewTransaction);

    return () => {
      socket.off('transaction:update', handleTransactionUpdate);
      socket.off('transaction:new', handleNewTransaction);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, isActive, hasFetched, subscriberId, service.id, service]);

  // Calculate payment status summary
  const paymentStatusSummary = React.useMemo(() => {
    const summary: Record<string, { count: number; totalAmount: number }> = {};
    
    transactions.forEach((transaction) => {
      const status = transaction.paymentStatus;
      if (!summary[status]) {
        summary[status] = { count: 0, totalAmount: 0 };
      }
      summary[status].count += 1;
      summary[status].totalAmount += Number(transaction.paymentAmount) || 0;
    });

    return summary;
  }, [transactions]);

  // Get payment statuses from service config or use defaults
  const paymentStatuses = service.paymentStatuses || ['PENDING', 'APPROVED', 'RELEASED'];

  const tabValue = normalizeServiceCode(service.code);

  if (isLoading) {
    return (
      <TabsContent value={tabValue} className="space-y-6">
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Loading {service.name} records...</p>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value={tabValue} className="space-y-6">
      {/* Header with Download Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-heading-800">{service.name} Records</h3>
          <p className="text-sm text-gray-600">
            {service.description || `Manage ${service.name.toLowerCase()} applications and payments`}
          </p>
        </div>
        <Button className="bg-primary-600 hover:bg-primary-700">
          <FiDownload className="mr-2" size={16} />
          Download Records
        </Button>
      </div>

      {/* Payment Status Overview */}
      {paymentStatuses.length > 0 && (
        <div className={cn("flex flex-wrap gap-4")}>
          {paymentStatuses.map((status) => {
            const summary = paymentStatusSummary[status] || { count: 0, totalAmount: 0 };
            const bgClass = getPaymentStatusCardBg(status);
            const textClass = getPaymentStatusTextColor(status);
            const icon = getPaymentStatusIcon(status);

            return (
              <div key={status} className={cn("rounded-lg p-4 border min-w-[150px]", bgClass)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={textClass}>{icon}</span>
                  <span className={cn("font-semibold", textClass)}>
                    {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                </div>
                <p className={cn("text-2xl font-bold", textClass)}>
                  ₱{summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={cn("text-sm", textClass)}>
                  {summary.count} {summary.count === 1 ? 'record' : 'records'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Records */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-heading-700">Recent Applications</h4>
        
        {transactions.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No {service.name.toLowerCase()} records found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => {
              const statusColor = getPaymentStatusColor(transaction.paymentStatus);
              
              return (
                <Card key={transaction.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Transaction ID</p>
                            <p className="font-semibold text-heading-800">{transaction.transactionId}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Payment Status</p>
                            <Badge className={statusColor}>
                              {transaction.paymentStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Amount</p>
                            <p className="font-semibold text-heading-800 flex items-center gap-1">
                              ₱{Number(transaction.paymentAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Reference Number</p>
                            <p className="font-mono text-sm text-heading-700">{transaction.referenceNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Generated At</p>
                            <p className="text-sm text-heading-700">
                              {transaction.referenceNumberGeneratedAt
                                ? new Date(transaction.referenceNumberGeneratedAt).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                          onClick={() => onViewDetails(transaction)}
                        >
                          <FiEye className="mr-1" size={14} />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TabsContent>
  );
};

