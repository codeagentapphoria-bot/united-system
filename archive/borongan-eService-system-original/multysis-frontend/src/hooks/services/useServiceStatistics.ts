// React imports
import { useCallback, useEffect, useState } from 'react';

// Services
import { transactionService, type ServiceStatistics } from '@/services/api/transaction.service';

// Hooks
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/context/SocketContext';

// Types
import type { TransactionUpdatePayload, NewTransactionPayload } from '@/types/socket.types';

interface UseServiceStatisticsOptions {
  serviceCode: string;
  startDate?: string;
  endDate?: string;
  autoFetch?: boolean;
}

interface UseServiceStatisticsReturn {
  statistics: ServiceStatistics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setDateRange: (startDate?: string, endDate?: string) => void;
}

export const useServiceStatistics = ({
  serviceCode,
  startDate,
  endDate,
  autoFetch = true,
}: UseServiceStatisticsOptions): UseServiceStatisticsReturn => {
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();
  const [statistics, setStatistics] = useState<ServiceStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    if (!serviceCode) {
      setError('Service code is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await transactionService.getServiceStatistics(
        serviceCode,
        startDate,
        endDate
      );

      setStatistics(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch statistics';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [serviceCode, startDate, endDate, toast]);

  useEffect(() => {
    if (autoFetch && serviceCode) {
      fetchStatistics();
    }
  }, [autoFetch, serviceCode, fetchStatistics]);

  // Helper function to check if date is within range
  const isDateInRange = (date: Date | string): boolean => {
    if (!startDate && !endDate) return true; // No filter, include all
    
    const transactionDate = new Date(date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && transactionDate < start) return false;
    if (end) {
      // Include the entire end date
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (transactionDate > endOfDay) return false;
    }
    
    return true;
  };

  // Helper function to get date key for byDate array
  const getDateKey = (date: Date | string): string => {
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  // Listen for WebSocket events to update statistics incrementally
  useEffect(() => {
    if (!socket || !isConnected || !serviceCode || !autoFetch || !statistics) {
      return;
    }

    // Listen for new transactions - increment counters
    const handleNewTransaction = (data: NewTransactionPayload) => {
      // Only process if transaction is for this service
      if (data.serviceCode && data.serviceCode !== serviceCode) {
        return;
      }

      // Check if transaction date is within filter range
      if (data.createdAt && !isDateInRange(data.createdAt)) {
        return;
      }

      setStatistics((prev) => {
        if (!prev) return prev;

        const updated = { ...prev };
        
        // Increment total
        updated.total += 1;
        
        // Update status counters
        if (data.status) {
          const statusLower = data.status.toLowerCase();
          if (statusLower.includes('pending')) updated.pending += 1;
          else if (statusLower.includes('approved') || statusLower.includes('completed')) updated.approved += 1;
          else if (statusLower.includes('rejected')) updated.rejected += 1;
          else if (statusLower.includes('cancelled')) updated.cancelled += 1;
        } else {
          // Default to pending if no status
          updated.pending += 1;
        }
        
        // Update byPaymentStatus
        if (data.paymentStatus) {
          updated.byPaymentStatus[data.paymentStatus] = (updated.byPaymentStatus[data.paymentStatus] || 0) + 1;
        }
        
        // Update totalRevenue if payment is approved/released
        if (data.paymentAmount && data.paymentStatus && 
            (data.paymentStatus === 'APPROVED' || data.paymentStatus === 'RELEASED')) {
          updated.totalRevenue += data.paymentAmount;
        }
        
        // Update byDate array
        if (data.createdAt) {
          const dateKey = getDateKey(data.createdAt);
          const dateIndex = updated.byDate.findIndex((d) => d.date === dateKey);
          
          if (dateIndex >= 0) {
            updated.byDate[dateIndex] = {
              ...updated.byDate[dateIndex],
              count: updated.byDate[dateIndex].count + 1,
              revenue: updated.byDate[dateIndex].revenue + 
                ((data.paymentAmount && (data.paymentStatus === 'APPROVED' || data.paymentStatus === 'RELEASED')) 
                  ? data.paymentAmount : 0),
            };
          } else {
            // Add new date entry
            updated.byDate.push({
              date: dateKey,
              count: 1,
              revenue: (data.paymentAmount && (data.paymentStatus === 'APPROVED' || data.paymentStatus === 'RELEASED')) 
                ? data.paymentAmount : 0,
            });
            // Sort by date
            updated.byDate.sort((a, b) => a.date.localeCompare(b.date));
          }
        }
        
        return updated;
      });
    };

    // Listen for transaction updates - update counters based on status/payment changes
    const handleTransactionUpdate = (data: TransactionUpdatePayload) => {
      // Only process if transaction is for this service
      if (data.serviceCode && data.serviceCode !== serviceCode) {
        return;
      }

      setStatistics((prev) => {
        if (!prev) return prev;

        const updated = { ...prev };
        
        // Handle status changes
        if (data.status !== undefined && data.oldStatus !== undefined && data.status !== data.oldStatus) {
          // Decrement old status
          const oldStatusLower = data.oldStatus.toLowerCase();
          if (oldStatusLower.includes('pending')) updated.pending = Math.max(0, updated.pending - 1);
          else if (oldStatusLower.includes('approved') || oldStatusLower.includes('completed')) {
            updated.approved = Math.max(0, updated.approved - 1);
          }
          else if (oldStatusLower.includes('rejected')) updated.rejected = Math.max(0, updated.rejected - 1);
          else if (oldStatusLower.includes('cancelled')) updated.cancelled = Math.max(0, updated.cancelled - 1);
          
          // Increment new status
          const newStatusLower = data.status.toLowerCase();
          if (newStatusLower.includes('pending')) updated.pending += 1;
          else if (newStatusLower.includes('approved') || newStatusLower.includes('completed')) updated.approved += 1;
          else if (newStatusLower.includes('rejected')) updated.rejected += 1;
          else if (newStatusLower.includes('cancelled')) updated.cancelled += 1;
        }
        
        // Handle payment status changes
        if (data.paymentStatus !== undefined && data.oldPaymentStatus !== undefined && 
            data.paymentStatus !== data.oldPaymentStatus) {
          // Decrement old payment status
          if (updated.byPaymentStatus[data.oldPaymentStatus]) {
            updated.byPaymentStatus[data.oldPaymentStatus] = Math.max(0, updated.byPaymentStatus[data.oldPaymentStatus] - 1);
          }
          
          // Increment new payment status
          updated.byPaymentStatus[data.paymentStatus] = (updated.byPaymentStatus[data.paymentStatus] || 0) + 1;
          
          // Update revenue based on payment status changes
          if (data.paymentAmount) {
            // If moving to approved/released, add revenue
            if ((data.paymentStatus === 'APPROVED' || data.paymentStatus === 'RELEASED') &&
                (data.oldPaymentStatus !== 'APPROVED' && data.oldPaymentStatus !== 'RELEASED')) {
              updated.totalRevenue += data.paymentAmount;
            }
            // If moving away from approved/released, subtract revenue
            else if ((data.oldPaymentStatus === 'APPROVED' || data.oldPaymentStatus === 'RELEASED') &&
                     (data.paymentStatus !== 'APPROVED' && data.paymentStatus !== 'RELEASED')) {
              updated.totalRevenue = Math.max(0, updated.totalRevenue - data.paymentAmount);
            }
          }
        }
        
        return updated;
      });
    };

    socket.on('transaction:new', handleNewTransaction);
    socket.on('transaction:update', handleTransactionUpdate);

    return () => {
      socket.off('transaction:new', handleNewTransaction);
      socket.off('transaction:update', handleTransactionUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, serviceCode, autoFetch, statistics, startDate, endDate]);

  const refetch = async () => {
    await fetchStatistics();
  };

  const setDateRange = useCallback((_newStartDate?: string, _newEndDate?: string) => {
    // This function is kept for API compatibility but date range is now controlled by props
    // The parent component should update startDate/endDate props to change the range
    console.warn('setDateRange is deprecated. Update startDate/endDate props instead.');
  }, []);

  return {
    statistics,
    isLoading,
    error,
    refetch,
    setDateRange,
  };
};

