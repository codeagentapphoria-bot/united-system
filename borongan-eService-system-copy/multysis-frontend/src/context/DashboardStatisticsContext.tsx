import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/query-keys';
import { dashboardService, type DashboardStatistics } from '@/services/api/dashboard.service';
import type { NewTransactionPayload, TransactionUpdatePayload } from '@/types/socket.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect } from 'react';

interface DashboardStatisticsContextType {
  statistics: DashboardStatistics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DashboardStatisticsContext = createContext<DashboardStatisticsContextType | undefined>(undefined);

export const DashboardStatisticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  const {
    data: statistics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dashboard.statistics,
    queryFn: ({ signal }) => dashboardService.getDashboardStatistics(signal),
    enabled: !!user && user.role === 'admin',
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch dashboard statistics';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    }
  }, [error, toast]);

  const isCurrentMonth = (date: Date | string): boolean => {
    const d = new Date(date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const getDateKey = (date: Date | string): string => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleNewTransaction = useCallback((data: NewTransactionPayload) => {
    queryClient.setQueryData<DashboardStatistics>(queryKeys.dashboard.statistics, (old) => {
      if (!old) return old;
      const updated = { ...old };
      const isThisMonth = data.createdAt && isCurrentMonth(data.createdAt);
      
      updated.totalTransactions += 1;
      if (isThisMonth) updated.totalTransactionsThisMonth += 1;
      
      if (data.status) {
        updated.transactionsByStatus[data.status] = (updated.transactionsByStatus[data.status] || 0) + 1;
      }
      
      if (data.paymentStatus) {
        updated.transactionsByPaymentStatus[data.paymentStatus] = 
          (updated.transactionsByPaymentStatus[data.paymentStatus] || 0) + 1;
      }
      
      if (data.serviceCode) {
        const sIdx = updated.transactionsByService.findIndex(s => s.serviceCode === data.serviceCode);
        if (sIdx >= 0) {
          updated.transactionsByService[sIdx] = {
            ...updated.transactionsByService[sIdx],
            count: updated.transactionsByService[sIdx].count + 1,
            revenue: updated.transactionsByService[sIdx].revenue + 
              ((data.paymentAmount && (data.paymentStatus === 'APPROVED' || data.paymentStatus === 'RELEASED')) 
                ? data.paymentAmount : 0),
          };
        }
      }
      
      if (data.paymentAmount && data.paymentStatus && 
          (data.paymentStatus === 'APPROVED' || data.paymentStatus === 'RELEASED')) {
        updated.totalRevenue += data.paymentAmount;
        if (isThisMonth) updated.totalRevenueThisMonth += data.paymentAmount;
      }
      
      if (data.createdAt) {
        const dateKey = getDateKey(data.createdAt);
        const tIdx = updated.transactionTrends.findIndex(t => t.date === dateKey);
        if (tIdx >= 0) {
          updated.transactionTrends[tIdx].count += 1;
          updated.transactionTrends[tIdx].revenue += 
            ((data.paymentAmount && (data.paymentStatus === 'APPROVED' || data.paymentStatus === 'RELEASED')) 
              ? data.paymentAmount : 0);
        } else {
          updated.transactionTrends.push({
            date: dateKey,
            count: 1,
            revenue: (data.paymentAmount && (data.paymentStatus === 'APPROVED' || data.paymentStatus === 'RELEASED')) 
              ? data.paymentAmount : 0,
          });
          updated.transactionTrends.sort((a, b) => a.date.localeCompare(b.date));
        }
      }
      
      return updated;
    });
  }, [queryClient]);

  const handleTransactionUpdate = useCallback((data: TransactionUpdatePayload) => {
    queryClient.setQueryData<DashboardStatistics>(queryKeys.dashboard.statistics, (old) => {
      if (!old) return old;
      const updated = { ...old };
      
      if (data.status !== undefined && data.oldStatus !== undefined && data.status !== data.oldStatus) {
        if (updated.transactionsByStatus[data.oldStatus]) {
          updated.transactionsByStatus[data.oldStatus] = Math.max(0, updated.transactionsByStatus[data.oldStatus] - 1);
        }
        updated.transactionsByStatus[data.status] = (updated.transactionsByStatus[data.status] || 0) + 1;
      }
      
      if (data.paymentStatus !== undefined && data.oldPaymentStatus !== undefined && 
          data.paymentStatus !== data.oldPaymentStatus) {
        if (updated.transactionsByPaymentStatus[data.oldPaymentStatus]) {
          updated.transactionsByPaymentStatus[data.oldPaymentStatus] = 
            Math.max(0, updated.transactionsByPaymentStatus[data.oldPaymentStatus] - 1);
        }
        updated.transactionsByPaymentStatus[data.paymentStatus] = 
          (updated.transactionsByPaymentStatus[data.paymentStatus] || 0) + 1;
        
        if (data.paymentAmount) {
          const wasApp = data.oldPaymentStatus === 'APPROVED' || data.oldPaymentStatus === 'RELEASED';
          const isNowApp = data.paymentStatus === 'APPROVED' || data.paymentStatus === 'RELEASED';
          if (!wasApp && isNowApp) updated.totalRevenue += data.paymentAmount;
          else if (wasApp && !isNowApp) updated.totalRevenue = Math.max(0, updated.totalRevenue - data.paymentAmount);
        }
      }
      
      return updated;
    });
  }, [queryClient]);

  useEffect(() => {
    if (!socket || !isConnected || !user || user.role !== 'admin') {
      return;
    }

    socket.on('transaction:new', handleNewTransaction);
    socket.on('transaction:update', handleTransactionUpdate);

    return () => {
      socket.off('transaction:new', handleNewTransaction);
      socket.off('transaction:update', handleTransactionUpdate);
    };
  }, [socket, isConnected, user, handleNewTransaction, handleTransactionUpdate]);

  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <DashboardStatisticsContext.Provider value={{ 
      statistics: statistics ?? null, 
      isLoading, 
      error: error?.message ?? null, 
      refetch: handleRefetch 
    }}>
      {children}
    </DashboardStatisticsContext.Provider>
  );
};

export const useDashboardStatisticsContext = () => {
  const context = useContext(DashboardStatisticsContext);
  if (context === undefined) {
    throw new Error('useDashboardStatisticsContext must be used within a DashboardStatisticsProvider');
  }
  return context;
};
