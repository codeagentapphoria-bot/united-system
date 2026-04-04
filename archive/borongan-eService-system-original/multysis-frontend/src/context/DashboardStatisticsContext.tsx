import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/hooks/use-toast';
import { dashboardService, type DashboardStatistics } from '@/services/api/dashboard.service';
import type { NewTransactionPayload, TransactionUpdatePayload } from '@/types/socket.types';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchStatistics = useCallback(async (forced = false) => {
    if (!user || user.role !== 'admin') return;
    if (isFetchingRef.current && !forced) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const result = await dashboardService.getDashboardStatistics();
      setStatistics(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch dashboard statistics';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, toast]);

  // Initial fetch
  useEffect(() => {
    if (user && user.role === 'admin' && !statistics) {
      fetchStatistics();
    }
  }, [user, statistics, fetchStatistics]);

  // Helper helpers
  const isCurrentMonth = (date: Date | string): boolean => {
    const d = new Date(date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const getDateKey = (date: Date | string): string => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Socket listeners for incremental updates
  useEffect(() => {
    if (!socket || !isConnected || !user || user.role !== 'admin' || !statistics) {
      return;
    }

    const handleNewTransaction = (data: NewTransactionPayload) => {
      setStatistics((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
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
    };

    const handleTransactionUpdate = (data: TransactionUpdatePayload) => {
      setStatistics((prev) => {
        if (!prev) return prev;
        const updated = { ...prev };
        
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
    };

    socket.on('transaction:new', handleNewTransaction);
    socket.on('transaction:update', handleTransactionUpdate);

    return () => {
      socket.off('transaction:new', handleNewTransaction);
      socket.off('transaction:update', handleTransactionUpdate);
    };
  }, [socket, isConnected, user, statistics]);

  const refetch = useCallback(async () => {
    await fetchStatistics(true);
  }, [fetchStatistics]);

  return (
    <DashboardStatisticsContext.Provider value={{ statistics, isLoading, error, refetch }}>
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
