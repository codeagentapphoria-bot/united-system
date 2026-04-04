// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Custom Components
import { TransactionDetailsModal } from './TransactionDetailsModal';
import { TaxStatusBadge } from '@/components/tax/TaxStatusBadge';
import { TaxIndicator } from '@/components/tax/TaxIndicator';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActiveServices } from '@/hooks/useActiveServices';

// Services
import { transactionService, type Transaction } from '@/services/api/transaction.service';

// Utils
import { cn, formatDateWithoutTimezone } from '@/lib/utils';
import { FiCalendar, FiDownload, FiEye, FiFileText, FiMessageCircle, FiSearch, FiXCircle } from 'react-icons/fi';

export const MyApplications: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentUser = user;

  const { services: cachedServices } = useActiveServices();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [serviceFilter, setServiceFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const limit = 5;

  useEffect(() => {
    if (currentUser?.id) {
      fetchTransactions();
    }
  }, [currentUser, page, statusFilter, serviceFilter, searchQuery]);

  const fetchTransactions = async () => {
    if (!currentUser?.id) return;

    try {
      setIsLoading(true);
      const result = await transactionService.getTransactions(
        currentUser.id,
        serviceFilter,
        page,
        limit,
        statusFilter || undefined,
        searchQuery || undefined
      );

      const transactionsArray = result?.transactions || [];

      setTransactions(transactionsArray);
      setTotalPages(result?.pagination?.totalPages || 1);
      setTotal(result?.pagination?.total || 0);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch applications',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsModalOpen(true);
  };

  const handleDownload = async (transactionId: string) => {
    try {
      await transactionService.downloadTransaction(transactionId);
      toast({
        title: 'Success',
        description: 'Transaction document downloaded successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to download transaction document',
      });
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    switch (status.toUpperCase()) {
      case 'APPROVED':
      case 'COMPLETED':
      case 'RELEASED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
      case 'FOR_PRINTING':
      case 'FOR_PICK_UP':
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

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Rejected', label: 'Rejected' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const serviceOptions = [
    { value: '', label: 'All Services' },
    ...cachedServices.map((service) => ({
      value: service.id,
      label: service.name,
    })),
  ];

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view your applications.</p>
      </div>
    );
  }

  // Count transactions with pending updates
  const pendingUpdateCount = transactions.filter(
    (t) => t.updateRequestStatus === 'PENDING_PORTAL' || t.updateRequestStatus === 'PENDING_ADMIN'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-heading-700">My Applications</h2>
          {pendingUpdateCount > 0 && (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
              {pendingUpdateCount} Update{pendingUpdateCount !== 1 ? 's' : ''} Pending
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          View and track your service requests and applications
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Search by reference no., transaction ID, or service…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearchQuery(searchInput);
                      setPage(1);
                    }
                  }}
                  onBlur={() => {
                    if (searchInput !== searchQuery) {
                      setSearchQuery(searchInput);
                      setPage(1);
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <Select
                value={
                  statusFilter
                    ? statusOptions.find((opt) => opt.value === statusFilter) || null
                    : null
                }
                onChange={(option) => {
                  setStatusFilter(option?.value || undefined);
                  setPage(1);
                }}
                options={statusOptions}
                isClearable
                placeholder="All Statuses"
                className="mt-1"
                classNamePrefix="react-select"
              />
            </div>

            {/* Service Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Service</label>
              <Select
                value={
                  serviceFilter
                    ? serviceOptions.find((opt) => opt.value === serviceFilter) || null
                    : null
                }
                onChange={(option) => {
                  setServiceFilter(option?.value || undefined);
                  setPage(1);
                }}
                options={serviceOptions}
                isClearable
                placeholder="All Services"
                className="mt-1"
                classNamePrefix="react-select"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Loading applications...</p>
          </CardContent>
        </Card>
      ) : !transactions || transactions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FiXCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg font-medium">No applications found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchQuery || statusFilter || serviceFilter
                ? 'Try adjusting your filters'
                : "You haven't submitted any service requests yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {transactions.map((transaction) => (
              <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Service Name */}
                      <div className="flex items-center gap-2">
                        <FiFileText size={16} className="text-gray-400" />
                        <p className="text-sm text-heading-600">
                          Service: <span className="font-medium">{transaction.service?.name || 'N/A'}</span>
                        </p>
                      </div>

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

                      {/* Date and Amount */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <FiCalendar size={16} className="text-gray-400" />
                          <p className="text-sm text-heading-600">
                            Date: <span className="font-medium">{formatDateWithoutTimezone(transaction.createdAt)}</span>
                          </p>
                        </div>
                        {transaction.paymentAmount > 0 && (
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-heading-600">
                              Service: <span className="font-medium">₱{transaction.paymentAmount.toLocaleString()}</span>
                            </p>
                          </div>
                        )}
                        {hasTaxComputation(transaction) && (
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-heading-600">
                              Tax: <span className="font-medium">₱{getTaxAmount(transaction).toLocaleString()}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badges and Actions */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {hasTaxComputation(transaction) && (
                          <TaxIndicator taxAmount={getTaxAmount(transaction)} />
                        )}
                        {transaction.status && (
                          <Badge className={cn('text-xs font-medium', getStatusColor(transaction.status))}>
                            {transaction.status}
                          </Badge>
                        )}
                        {hasTaxComputation(transaction) && (
                          <TaxStatusBadge status={getTaxStatus(transaction)} />
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
                      <div className="flex gap-2">
                        <Button className=" hover:bg-primary-50" variant="outline" size="sm" onClick={() => handleViewDetails(transaction)}>
                          <FiEye size={16} className="mr-2" />
                          View Details
                        </Button>
                        {(transaction.status === 'Approved' || transaction.status === 'Completed' || transaction.status === 'Released') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDownload(transaction.id)}
                          >
                            <FiDownload size={16} className="mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total} application{total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500 px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          open={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
        />
      )}
    </div>
  );
};

