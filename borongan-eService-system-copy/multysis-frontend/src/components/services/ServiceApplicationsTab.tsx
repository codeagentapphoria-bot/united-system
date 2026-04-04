// React imports
import React, { useEffect, useState } from 'react';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Custom Components
import { useServiceTransactions } from '@/hooks/services/useServiceTransactions';
import { ApplicationCard } from './ApplicationCard';
import { ApplicationDetailsModal } from './ApplicationDetailsModal';

// Services
import type { Service } from '@/services/api/service.service';
import { transactionNoteService } from '@/services/api/transaction-note.service';
import type { Transaction } from '@/services/api/transaction.service';

// Utils
import Select from 'react-select';

// Icons
import { FiSearch } from 'react-icons/fi';

interface ServiceApplicationsTabProps {
  serviceCode: string;
  service: Service;
}

export const ServiceApplicationsTab: React.FC<ServiceApplicationsTabProps> = ({ serviceCode, service }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [residentFilter, setResidentFilter] = useState<boolean | undefined>();
  const [serviceDataFilters, setServiceDataFilters] = useState<Record<string, string>>({});
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [transactionsWithUnreadCounts, setTransactionsWithUnreadCounts] = useState<Transaction[]>([]);

  const { transactions, pagination, isLoading, setFilters, setPage, refetch } = useServiceTransactions({
    serviceCode,
    filters: {
      search: searchQuery || undefined,
      paymentStatus: paymentStatusFilter,
      status: statusFilter,
      isLocalResident: residentFilter,
      serviceData: Object.keys(serviceDataFilters).length > 0 ? serviceDataFilters : undefined,
    },
    page: 1,
    limit: 10,
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setFilters({
      search: value || undefined,
      paymentStatus: paymentStatusFilter,
      status: statusFilter,
      isLocalResident: residentFilter,
    });
    setPage(1);
  };

  const handleFilterChange = (newFilters: {
    paymentStatus?: string;
    status?: string;
    isLocalResident?: boolean;
    serviceData?: Record<string, string>;
  }) => {
    setFilters({
      search: searchQuery || undefined,
      paymentStatus: paymentStatusFilter,
      status: statusFilter,
      isLocalResident: residentFilter,
      serviceData: Object.keys(serviceDataFilters).length > 0 ? serviceDataFilters : undefined,
      ...newFilters,
    });
    setPage(1);
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsModalOpen(true);
  };

  // Fetch unread counts for all transactions
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (transactions.length === 0) {
        setTransactionsWithUnreadCounts([]);
        return;
      }

      try {
        const transactionsWithCounts = await Promise.all(
          transactions.map(async (transaction) => {
            try {
              const unreadCount = await transactionNoteService.getUnreadCount(transaction.id);
              return {
                ...transaction,
                unreadMessageCount: unreadCount,
              };
            } catch (error) {
              // If fetching fails, use 0 or calculate from transactionNotes if available
              const countFromNotes = transaction.transactionNotes
                ? transaction.transactionNotes.filter((note) => !note.isRead && note.senderType === 'SUBSCRIBER').length
                : 0;
              return {
                ...transaction,
                unreadMessageCount: countFromNotes,
              };
            }
          })
        );
        setTransactionsWithUnreadCounts(transactionsWithCounts);
      } catch (error) {
        // Fallback: use transactions as-is, calculating from transactionNotes if available
        const transactionsWithCounts = transactions.map((transaction) => {
          const countFromNotes = transaction.transactionNotes
            ? transaction.transactionNotes.filter((note) => !note.isRead && note.senderType === 'SUBSCRIBER').length
            : 0;
          return {
            ...transaction,
            unreadMessageCount: countFromNotes,
          };
        });
        setTransactionsWithUnreadCounts(transactionsWithCounts);
      }
    };

    fetchUnreadCounts();
  }, [transactions]);

  // Helper function to format payment status label
  const formatPaymentStatusLabel = (status: string): string => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Helper function to format application status label
  const formatStatusLabel = (status: string): string => {
    return status
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get unique payment statuses from actual transaction data
  const uniquePaymentStatuses = new Set<string>();
  transactions.forEach((transaction) => {
    if (transaction.paymentStatus) {
      uniquePaymentStatuses.add(transaction.paymentStatus);
    }
  });

  // Create payment status options from unique payment statuses found in transactions
  const paymentStatusOptions = Array.from(uniquePaymentStatuses)
    .map((status) => ({
      value: status,
      label: formatPaymentStatusLabel(status),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Get unique application statuses from actual transaction data
  const uniqueStatuses = new Set<string>();
  transactions.forEach((transaction) => {
    if (transaction.status) {
      uniqueStatuses.add(transaction.status);
    }
  });

  // Create application status options from unique statuses found in transactions
  const statusOptions = Array.from(uniqueStatuses)
    .map((status) => ({
      value: status,
      label: formatStatusLabel(status),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Extract filterable formFields (select/dropdown types)
  const extractFilterableFields = () => {
    if (!service.formFields) return [];
    
    const fields = Array.isArray(service.formFields?.fields) 
      ? service.formFields.fields 
      : Array.isArray(service.formFields) 
        ? service.formFields 
        : [];
    
    return fields.filter((field: any) => field.type === 'select' && field.name);
  };

  const filterableFields = extractFilterableFields();

  // Get unique values for each filterable field from transaction serviceData
  const getFieldValues = (fieldName: string) => {
    const values = new Set<string>();
    transactions.forEach((transaction) => {
      if (transaction.serviceData && transaction.serviceData[fieldName]) {
        const value = transaction.serviceData[fieldName];
        if (typeof value === 'string' || typeof value === 'number') {
          values.add(String(value));
        }
      }
    });
    return Array.from(values).sort();
  };

  // Get field options from formFields config or from actual data
  const getFieldOptions = (field: any) => {
    // If field has predefined options, use those
    if (field.options && Array.isArray(field.options)) {
      return field.options;
    }
    
    // Otherwise, use values found in transaction data
    const values = getFieldValues(field.name);
    return values.map((value) => {
      // Try to find label from field options if available
      const option = field.options?.find((opt: any) => opt.value === value);
      return {
        value,
        label: option?.label || formatStatusLabel(value),
      };
    });
  };

  const handleServiceDataFilterChange = (fieldName: string, value: string | undefined) => {
    const newFilters = { ...serviceDataFilters };
    if (value) {
      newFilters[fieldName] = value;
    } else {
      delete newFilters[fieldName];
    }
    setServiceDataFilters(newFilters);
    handleFilterChange({
      serviceData: Object.keys(newFilters).length > 0 ? newFilters : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Search by reference number, transaction ID, or subscriber name..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Payment Status</label>
              <Select
                value={
                  paymentStatusFilter
                    ? paymentStatusOptions.find((opt) => opt.value === paymentStatusFilter) || null
                    : null
                }
                onChange={(option) => {
                  const newStatus = option?.value;
                  setPaymentStatusFilter(newStatus);
                  handleFilterChange({ paymentStatus: newStatus });
                }}
                options={[{ value: '', label: 'All' }, ...paymentStatusOptions]}
                isClearable
                placeholder="All"
                className="mt-1"
                classNamePrefix="react-select"
              />
            </div>

            {/* Application Status Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Application Status</label>
              <Select
                value={
                  statusFilter
                    ? statusOptions.find((opt) => opt.value === statusFilter) || null
                    : null
                }
                onChange={(option) => {
                  const newStatus = option?.value;
                  setStatusFilter(newStatus);
                  handleFilterChange({ status: newStatus });
                }}
                options={[{ value: '', label: 'All' }, ...statusOptions]}
                isClearable
                placeholder="All"
                className="mt-1"
                classNamePrefix="react-select"
              />
            </div>
            {/* Resident Filter */}
            <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Resident of Borongan</label>
                <Select
                value={
                    residentFilter !== undefined
                    ? { value: residentFilter.toString(), label: residentFilter ? 'Yes' : 'No' }
                    : null
                }
                onChange={(option) => {
                    const newValue = option?.value === 'true' ? true : option?.value === 'false' ? false : undefined;
                    setResidentFilter(newValue);
                    handleFilterChange({ isLocalResident: newValue });
                }}
                options={[
                    { value: '', label: 'All' },
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                ]}
                isClearable
                placeholder="All"
                className="mt-1"
                classNamePrefix="react-select"
                />
            </div>
          </div>


          {/* Dynamic Service Data Filters */}
          {filterableFields.length > 0 && (
            <div className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterableFields.map((field: any) => {
                  const fieldOptions = getFieldOptions(field);
                  if (fieldOptions.length === 0) return null;

                  return (
                    <div key={field.name}>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        {field.label || field.name}
                      </label>
                      <Select
                        value={
                          serviceDataFilters[field.name]
                            ? fieldOptions.find((opt: { value: string; label: string }) => opt.value === serviceDataFilters[field.name]) || null
                            : null
                        }
                        onChange={(option) => {
                          handleServiceDataFilterChange(field.name, option?.value);
                        }}
                        options={[{ value: '', label: 'All' }, ...fieldOptions]}
                        isClearable
                        placeholder="All"
                        className="mt-1"
                        classNamePrefix="react-select"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications List */}
      {isLoading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">Loading applications...</p>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No applications found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {(transactionsWithUnreadCounts.length > 0 ? transactionsWithUnreadCounts : transactions).map((transaction) => (
              <ApplicationCard
                key={transaction.id}
                transaction={transaction}
                onViewDetails={() => handleViewDetails(transaction)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} applications
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedTransaction && (
        <ApplicationDetailsModal
          open={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          service={service}
          onUpdate={async (updatedTransaction) => {
            // Update the selected transaction
            setSelectedTransaction(updatedTransaction);
            // Refresh the transactions list - this will trigger the useEffect to refresh unread counts
            await refetch();
          }}
        />
      )}
    </div>
  );
};

