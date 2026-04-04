// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { MessageComposer } from './MessageComposer';
import { ServiceDataViewer } from './ServiceDataViewer';
import { TransactionMessages } from './TransactionMessages';
import { UpdateRequestSection } from './UpdateRequestSection';
import { TaxBreakdown } from '@/components/portal/TaxBreakdown';
import { ExemptionManager } from '@/components/tax/ExemptionManager';
import { PaymentRecorder } from '@/components/admin/PaymentRecorder';
import { TaxReassessment } from '@/components/admin/TaxReassessment';

// Services
import type { Service } from '@/services/api/service.service';
import { transactionService, type Transaction } from '@/services/api/transaction.service';
import { taxComputationService, type TaxComputation } from '@/services/api/tax-computation.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Utils
import { cn } from '@/lib/utils';

// Icons
import { FiEdit, FiMessageCircle, FiX } from 'react-icons/fi';

interface ApplicationDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
  service: Service;
  readOnly?: boolean;
  onUpdate?: (updatedTransaction: Transaction) => void;
}

export const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  open,
  onClose,
  transaction: initialTransaction,
  service,
  readOnly = false,
  onUpdate,
}) => {
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<Transaction>(initialTransaction);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [messageRefreshTrigger, setMessageRefreshTrigger] = useState(0);
  const [taxComputation, setTaxComputation] = useState<TaxComputation | null>(null);
  const [isLoadingTax, setIsLoadingTax] = useState(false);
  
  // Status editing state
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(transaction.status || '');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState(transaction.paymentStatus || '');

  // Update transaction when initialTransaction changes
  useEffect(() => {
    setTransaction(initialTransaction);
    setSelectedStatus(initialTransaction.status || '');
    setSelectedPaymentStatus(initialTransaction.paymentStatus || '');
  }, [initialTransaction]);

  // Load tax computation
  useEffect(() => {
    if (open && transaction.id) {
      loadTaxComputation();
    }
  }, [open, transaction.id]);

  const loadTaxComputation = async () => {
    setIsLoadingTax(true);
    try {
      const computation = await taxComputationService.getActiveTaxComputation(transaction.id);
      setTaxComputation(computation);
    } catch (error: any) {
      // Tax computation might not exist - that's okay
      setTaxComputation(null);
    } finally {
      setIsLoadingTax(false);
    }
  };

  // Status options
  const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const paymentStatusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'FOR_PRINTING', label: 'For Printing' },
    { value: 'FOR_PICK_UP', label: 'For Pick Up' },
    { value: 'RELEASED', label: 'Released' },
    { value: 'ASSESSED', label: 'Assessed' },
    { value: 'FOR_PAYMENT', label: 'For Payment' },
    { value: 'PAID', label: 'Paid' },
    { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
    { value: 'COMPLIED', label: 'Complied' },
    { value: 'FOR_HEARING', label: 'For Hearing' },
    { value: 'SETTLED', label: 'Settled' },
    { value: 'ISSUED', label: 'Issued' },
    { value: 'UNPAID', label: 'Unpaid' },
    { value: 'WAIVED', label: 'Waived' },
    { value: 'FOR_INSPECTION', label: 'For Inspection' },
    { value: 'FOR_RELEASE', label: 'For Release' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  // Handler for status update
  const handleStatusUpdate = async () => {
    setIsUpdating(true);
    try {
      const updated = await transactionService.updateTransaction(transaction.id, {
        status: selectedStatus || undefined,
        paymentStatus: selectedPaymentStatus || undefined,
      });
      setTransaction(updated);
      setIsEditingStatus(false);
      
      // Notify parent component to refresh the list
      if (onUpdate) {
        onUpdate(updated);
      }
      
      toast({
        title: 'Success',
        description: 'Application status updated successfully',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to update status',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getSubscriberName = () => {
    // v2: resident field or guest applicant name
    if (transaction.resident?.firstName && transaction.resident?.lastName) {
      return `${transaction.resident.firstName} ${transaction.resident.lastName}`;
    }
    if (transaction.applicantName) return transaction.applicantName;
    return 'Unknown';
  };

  const getSubscriberEmail = () => {
    return transaction.resident?.email || transaction.applicantEmail || 'N/A';
  };

  const getSubscriberPhone = () => {
    return transaction.resident?.contactNumber || transaction.applicantContact || 'N/A';
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-4xl max-h-[90vh] overflow-y-auto')}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className={cn('text-2xl font-semibold text-primary-600')}>
              Application Details
            </DialogTitle>
            {unreadMessageCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                <FiMessageCircle className="mr-1" size={14} />
                {unreadMessageCount} unread
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Transaction Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">
              Transaction Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Reference Number
                </label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {transaction.referenceNumber}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Transaction ID
                </label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-mono font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {transaction.transactionId}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Payment Status
                </label>
                <div className="min-h-[40px] flex items-center">
                  <Badge className={cn('text-xs', getPaymentStatusColor(transaction.paymentStatus))}>
                    {formatPaymentStatus(transaction.paymentStatus)}
                  </Badge>
                </div>
              </div>
              {transaction.status && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Application Status
                  </label>
                  <div className="min-h-[40px] flex items-center">
                    <Badge className={cn('text-xs', getStatusColor(transaction.status))}>
                      {formatStatus(transaction.status)}
                    </Badge>
                  </div>
                </div>
              )}
              {transaction.paymentAmount > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Payment Amount
                  </label>
                  <div className="min-h-[40px] flex items-center">
                    <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                      ₱{Number(transaction.paymentAmount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Created At
                </label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {new Date(transaction.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Updated At
                </label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {new Date(transaction.updatedAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Management Section - Only show if not read-only */}
          {!readOnly && (
            <>
              <Separator />
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-heading-800">Status Management</h3>
                  {!isEditingStatus && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingStatus(true)}
                      className="text-primary-600 border-primary-300 hover:bg-primary-50"
                    >
                      <FiEdit className="mr-2" size={14} />
                      Edit Status
                    </Button>
                  )}
                </div>

            {isEditingStatus ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Application Status
                  </Label>
                  <Select
                    value={statusOptions.find(opt => opt.value === selectedStatus) || null}
                    onChange={(option) => setSelectedStatus(option?.value || '')}
                    options={statusOptions}
                    placeholder="Select application status"
                    className="mt-1"
                    classNamePrefix="react-select"
                    isClearable
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '40px',
                        borderColor: '#d1d5db',
                        '&:hover': {
                          borderColor: '#9ca3af',
                        },
                      }),
                      option: (base, state) => ({
                        ...base,
                        padding: '12px',
                        backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                        color: state.isSelected ? 'white' : '#374151',
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                    }}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Payment Status
                  </Label>
                  <Select
                    value={paymentStatusOptions.find(opt => opt.value === selectedPaymentStatus) || null}
                    onChange={(option) => setSelectedPaymentStatus(option?.value || '')}
                    options={paymentStatusOptions}
                    placeholder="Select payment status"
                    className="mt-1"
                    classNamePrefix="react-select"
                    isClearable
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '40px',
                        borderColor: '#d1d5db',
                        '&:hover': {
                          borderColor: '#9ca3af',
                        },
                      }),
                      option: (base, state) => ({
                        ...base,
                        padding: '12px',
                        backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                        color: state.isSelected ? 'white' : '#374151',
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 9999,
                      }),
                    }}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={handleStatusUpdate}
                    disabled={isUpdating}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    {isUpdating ? 'Updating...' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="hover:bg-primary-50"
                    onClick={() => {
                      setIsEditingStatus(false);
                      setSelectedStatus(transaction.status || '');
                      setSelectedPaymentStatus(transaction.paymentStatus || '');
                    }}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700">Application Status:</span>
                  <Badge className={cn('text-xs', getStatusColor(transaction.status))}>
                    {formatStatus(transaction.status)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-gray-700">Payment Status:</span>
                  <Badge className={cn('text-xs', getPaymentStatusColor(transaction.paymentStatus))}>
                    {formatPaymentStatus(transaction.paymentStatus)}
                  </Badge>
                </div>
              </div>
            )}
          </div>
            </>
          )}

          {!readOnly && <Separator />}

          {/* Subscriber Information */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">
              Subscriber Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {getSubscriberName()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {getSubscriberPhone()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                <div className="min-h-[40px] flex items-center">
                  <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                    {getSubscriberEmail()}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Resident of Borongan
                </label>
                <div className="min-h-[40px] flex items-center">
                  <Badge className={(transaction.isLocalResident ?? transaction.isResidentOfBorongan) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>
                    {(transaction.isLocalResident ?? transaction.isResidentOfBorongan) ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Service Data */}
          {transaction.serviceData && (
            <>
              <Separator />
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-primary-200">
                  <h3 className="text-lg font-bold text-heading-800">
                    Service Data
                  </h3>
                  {transaction.pendingServiceData && (
                    <Badge className="bg-yellow-100 text-yellow-700">
                      Has Pending Updates
                    </Badge>
                  )}
                </div>
                <ServiceDataViewer
                  serviceData={transaction.serviceData}
                  formFields={service.formFields}
                  service={service}
                  pendingServiceData={transaction.pendingServiceData}
                />
              </div>
            </>
          )}

          {/* Appointment Information */}
          {(transaction.preferredAppointmentDate || transaction.scheduledAppointmentDate || transaction.appointmentStatus) && (
            <>
              <Separator />
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">
                  Appointment Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transaction.preferredAppointmentDate && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Preferred Date & Time
                      </label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                          {new Date(transaction.preferredAppointmentDate).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {transaction.scheduledAppointmentDate && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Scheduled Date & Time
                      </label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                          {new Date(transaction.scheduledAppointmentDate).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {transaction.appointmentStatus && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Appointment Status
                      </label>
                      <div className="min-h-[40px] flex items-center">
                        <Badge className={cn('text-xs', 
                          transaction.appointmentStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                          transaction.appointmentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          transaction.appointmentStatus === 'REQUESTED_UPDATE' ? 'bg-blue-100 text-blue-700' :
                          transaction.appointmentStatus === 'DECLINED' || transaction.appointmentStatus === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {transaction.appointmentStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Additional Fields */}
          {(transaction.remarks || transaction.validIdToPresent || transaction.permitType) && (
            <>
              <Separator />
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transaction.remarks && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Remarks</label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                          {transaction.remarks}
                        </p>
                      </div>
                    </div>
                  )}
                  {transaction.validIdToPresent && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Valid ID to Present
                      </label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                          {transaction.validIdToPresent}
                        </p>
                      </div>
                    </div>
                  )}
                  {transaction.permitType && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Permit Type
                      </label>
                      <div className="min-h-[40px] flex items-center">
                        <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                          {transaction.permitType}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Tax & Payments Section */}
          {taxComputation && (
            <>
              <Separator />
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">
                  Tax & Payments
                </h3>
                <div className="space-y-6">
                  {taxComputation && (
                    <TaxBreakdown computation={taxComputation} isLoading={isLoadingTax} />
                  )}
                  {taxComputation && (
                    <PaymentRecorder
                      transactionId={transaction.id}
                      onPaymentRecorded={async () => {
                        await loadTaxComputation();
                        // Refresh transaction to update payment status
                        try {
                          const updated = await transactionService.getTransaction(transaction.id);
                          setTransaction(updated);
                        } catch (error) {
                          console.error('Failed to refresh transaction:', error);
                        }
                      }}
                    />
                  )}
                  <ExemptionManager
                    transactionId={transaction.id}
                    mode="admin"
                    onExemptionApproved={async () => {
                      await loadTaxComputation();
                      // Refresh transaction
                      try {
                        const updated = await transactionService.getTransaction(transaction.id);
                        setTransaction(updated);
                      } catch (error) {
                        console.error('Failed to refresh transaction:', error);
                      }
                    }}
                  />
                  {taxComputation && (
                    <TaxReassessment
                      transactionId={transaction.id}
                      onReassessmentComplete={async () => {
                        await loadTaxComputation();
                        // Refresh transaction
                        try {
                          const updated = await transactionService.getTransaction(transaction.id);
                          setTransaction(updated);
                        } catch (error) {
                          console.error('Failed to refresh transaction:', error);
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Update Request Section - Only show if not read-only */}
          {!readOnly && (
            <>
              <Separator />
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">
                  Update Request
                </h3>
                <UpdateRequestSection
                  transaction={transaction}
                  onUpdate={async () => {
                    // Refresh transaction data without page reload
                    try {
                      const { transactionService } = await import('@/services/api/transaction.service');
                      const updated = await transactionService.getTransaction(transaction.id);
                      setTransaction(updated);
                    } catch (error) {
                      console.error('Failed to refresh transaction:', error);
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* Messages Section - Only show if not read-only */}
          {!readOnly && (
            <>
              <Separator />
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200 flex items-center gap-2">
                  <FiMessageCircle size={18} />
                  Messages
                </h3>
                <div className="space-y-4">
                  <TransactionMessages
                    transactionId={transaction.id}
                    subscriberName={getSubscriberName()}
                    onUnreadCountChange={setUnreadMessageCount}
                    refreshTrigger={messageRefreshTrigger}
                  />
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Send a Message</p>
                    <MessageComposer
                      transactionId={transaction.id}
                      onMessageSent={() => {
                        // Trigger refresh in TransactionMessages
                        setMessageRefreshTrigger((prev) => prev + 1);
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose} variant="outline" className="text-primary-600 hover:text-primary-700 hover:bg-primary-50">
            <FiX size={16} className="mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

