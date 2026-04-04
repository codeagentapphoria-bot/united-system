// React imports
import { useEffect, useState } from 'react';

// Services
import { transactionService, type GetTransactionsByServiceFilters, type PaginatedTransactions, type Transaction } from '@/services/api/transaction.service';

// Hooks
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/hooks/use-toast';

// Types
import type { NewTransactionPayload, TransactionUpdatePayload } from '@/types/socket.types';

interface UseServiceTransactionsOptions {
  serviceCode: string;
  filters?: GetTransactionsByServiceFilters;
  page?: number;
  limit?: number;
  autoFetch?: boolean;
}

interface UseServiceTransactionsReturn {
  transactions: Transaction[];
  pagination: PaginatedTransactions['pagination'];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setFilters: (filters: GetTransactionsByServiceFilters) => void;
  setPage: (page: number) => void;
}

export const useServiceTransactions = ({
  serviceCode,
  filters = {},
  page = 1,
  limit = 10,
  autoFetch = true,
}: UseServiceTransactionsOptions): UseServiceTransactionsReturn => {
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginatedTransactions['pagination']>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<GetTransactionsByServiceFilters>(filters);
  const [currentPage, setCurrentPage] = useState(page);

  const fetchTransactions = async () => {
    if (!serviceCode) {
      setError('Service code is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await transactionService.getTransactionsByService(
        serviceCode,
        currentFilters,
        currentPage,
        limit
      );

      setTransactions(result.transactions);
      setPagination(result.pagination);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch transactions';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoFetch && serviceCode) {
      fetchTransactions();
    }
  }, [serviceCode, currentFilters, currentPage, limit, autoFetch]);

  // Listen for WebSocket events to update transactions incrementally
  useEffect(() => {
    if (!socket || !isConnected || !serviceCode || !autoFetch) {
      return;
    }

    // Listen for new transactions - add to list if matches service and filters
    const handleNewTransaction = (data: NewTransactionPayload) => {
      // Only process if transaction is for this service
      if (data.serviceCode && data.serviceCode !== serviceCode) {
        return;
      }

      // Check if transaction matches current filters (basic check)
      // For complex filters, we might need to refetch, but for now we'll add optimistically
      const matchesFilters = !currentFilters.search && !currentFilters.paymentStatus && !currentFilters.status;

      // Only add to list if we're on page 1 and it matches filters
      if (currentPage === 1 && matchesFilters) {
        setTransactions((prev) => {
          // Check if transaction already exists (prevent duplicates)
          const exists = prev.some((t) => t.id === data.id || t.transactionId === data.transactionId);
          if (exists) return prev;

          // Create a minimal transaction object from the payload
          const newTransaction: Transaction = {
            id: data.id,
            subscriberId: data.subscriberId,
            serviceId: data.serviceId,
            transactionType: '', // Will be filled when fetched
            transactionId: data.transactionId,
            referenceNumber: data.referenceNumber || '',
            paymentStatus: data.paymentStatus || 'PENDING',
            paymentAmount: data.paymentAmount || 0,
            isResidentOfBorongan: false,
            isPosted: false,
            status: data.status,
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : data.createdAt.toISOString(),
            updatedAt: typeof data.createdAt === 'string' ? data.createdAt : data.createdAt.toISOString(),
            service: data.serviceCode ? { code: data.serviceCode, id: data.serviceId, name: '' } : undefined,
          } as Transaction;

          // Add to beginning of list
          return [newTransaction, ...prev];
        });

        // Update pagination total
        setPagination((prev) => ({
          ...prev,
          total: prev.total + 1,
        }));
      } else {
        // Update pagination total even if not adding to list
        setPagination((prev) => ({
          ...prev,
          total: prev.total + 1,
        }));
      }
    };

    // Listen for transaction updates - update specific transaction in list
    const handleTransactionUpdate = (data: TransactionUpdatePayload) => {
      // Only process if transaction is for this service
      if (data.serviceCode && data.serviceCode !== serviceCode) {
        return;
      }

      // Update the specific transaction in the current list
      setTransactions((prevTransactions) => {
        const index = prevTransactions.findIndex(
          (t) => t.id === data.transactionId || t.transactionId === data.transactionId
        );

        if (index === -1) {
          // Transaction not in current list, might be on another page or filtered out
          // Don't modify the list, but we could update pagination if needed
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

    socket.on('transaction:new', handleNewTransaction);
    socket.on('transaction:update', handleTransactionUpdate);

    return () => {
      socket.off('transaction:new', handleNewTransaction);
      socket.off('transaction:update', handleTransactionUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, serviceCode, autoFetch, currentPage, currentFilters]);

  const refetch = async () => {
    await fetchTransactions();
  };

  const setFilters = (newFilters: GetTransactionsByServiceFilters) => {
    setCurrentFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const setPage = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return {
    transactions,
    pagination,
    isLoading,
    error,
    refetch,
    setFilters,
    setPage,
  };
};

