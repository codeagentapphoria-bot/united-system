// React imports
import React, { useEffect, useState } from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { ServiceDataViewer } from '@/components/services/ServiceDataViewer';

// Hooks
import { useTransactionSocket } from '@/hooks/useTransactionSocket';

// Services
import { serviceService, type Service } from '@/services/api/service.service';
import type { Transaction } from '@/types/subscriber';

// Utils
import { cn } from '@/lib/utils';

// Icons
import { FiCalendar, FiFileText } from 'react-icons/fi';

interface DynamicServiceDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction;
  service?: Service;
}

export const DynamicServiceDetailsModal: React.FC<DynamicServiceDetailsModalProps> = ({
  open,
  onClose,
  transaction: initialTransaction,
  service: initialService,
}) => {
  const [transaction, setTransaction] = useState<Transaction | undefined>(initialTransaction);
  const { transactionUpdate, newNote, clearNewNote } = useTransactionSocket(
    open && transaction?.id ? transaction.id : null
  );
  const [service, setService] = useState<Service | null>(initialService || null);
  const [isLoadingService, setIsLoadingService] = useState(false);

  // Update transaction and service when props change
  useEffect(() => {
    setTransaction(initialTransaction);
    setService(initialService || null);
  }, [initialTransaction, initialService]);

  // Update transaction when WebSocket update arrives
  useEffect(() => {
    if (transactionUpdate && transaction && transactionUpdate.transactionId === transaction.id) {
      setTransaction((prev) => {
        if (!prev) return prev;
        const validAppointmentStatuses = ['PENDING', 'ACCEPTED', 'REQUESTED_UPDATE', 'DECLINED', 'CANCELLED'] as const;
        const newAppointmentStatus = transactionUpdate.appointmentStatus 
          ? (validAppointmentStatuses.includes(transactionUpdate.appointmentStatus as typeof validAppointmentStatuses[number])
              ? transactionUpdate.appointmentStatus as typeof validAppointmentStatuses[number]
              : prev.appointmentStatus)
          : prev.appointmentStatus;
        return {
          ...prev,
          status: transactionUpdate.status || prev.status,
          paymentStatus: transactionUpdate.paymentStatus || prev.paymentStatus,
          appointmentStatus: newAppointmentStatus,
          updatedAt: typeof transactionUpdate.updatedAt === 'string' 
            ? transactionUpdate.updatedAt 
            : transactionUpdate.updatedAt.toISOString(),
        };
      });
    }
  }, [transactionUpdate, transaction]);

  // Handle new note (could trigger a refresh or notification)
  useEffect(() => {
    if (newNote && transaction && newNote.transactionId === transaction.id) {
      // Note received via WebSocket - could show a notification or refresh messages
      clearNewNote();
    }
  }, [newNote, transaction, clearNewNote]);

  useEffect(() => {
    const serviceId = transaction?.serviceId;
    if (serviceId && open && !service) {
      fetchService(serviceId);
    } else if (transaction?.service) {
      // Service already included in transaction
      setService(transaction.service as Service);
    }
  }, [transaction?.serviceId, transaction?.service, open, service]);

  const fetchService = async (serviceId: string) => {
    if (!serviceId) return;

    try {
      setIsLoadingService(true);
      const fetchedService = await serviceService.getService(serviceId);
      setService(fetchedService);
    } catch (error) {
      // Silently fail - service info is optional
    } finally {
      setIsLoadingService(false);
    }
  };

  const formatPaymentStatus = (status: string): string => {
    if (!status) return 'N/A';
    // Replace underscores with spaces and capitalize each word
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatStatus = (status: string | undefined): string => {
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

  if (!transaction) {
    return null;
  }

  // Extract formFields from service - handle both { fields: [...] } and direct array formats
  const formFields = service?.formFields
    ? typeof service.formFields === 'object' && service.formFields !== null
      ? 'fields' in service.formFields && Array.isArray(service.formFields.fields)
        ? service.formFields.fields
        : Array.isArray(service.formFields)
          ? service.formFields
          : []
      : []
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-4xl max-h-[90vh] overflow-hidden p-0')}>
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className={cn('text-2xl font-semibold text-primary-600')}>
            Transaction Details
          </DialogTitle>
        </DialogHeader>

        <div className="h-full max-h-[calc(90vh-120px)] overflow-y-auto px-6 py-4">
          <div className="space-y-6">
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
                {transaction.paymentAmount && Number(transaction.paymentAmount) > 0 && (
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

            {/* Service Data */}
            {transaction.serviceData && (
              <>
                <Separator />
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-6 pb-2 border-b-2 border-primary-200">
                    <h3 className="text-lg font-bold text-heading-800 flex items-center gap-2">
                      <FiFileText size={18} /> Service Information
                    </h3>
                  </div>
                  {isLoadingService ? (
                    <p className="text-sm text-gray-500">Loading service information...</p>
                  ) : service && formFields.length > 0 ? (
                    <ServiceDataViewer
                      serviceData={transaction.serviceData}
                      formFields={formFields}
                      service={service}
                    />
                  ) : (
                    <ServiceDataViewer
                      serviceData={transaction.serviceData}
                      formFields={[]}
                      service={service || { id: '', name: 'Unknown Service', code: '' } as Service}
                    />
                  )}
                </div>
              </>
            )}

            {/* Appointment Information */}
            {(transaction.preferredAppointmentDate || transaction.scheduledAppointmentDate || transaction.appointmentStatus) && (
              <>
                <Separator />
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200 flex items-center gap-2">
                    <FiCalendar size={18} /> Appointment Information
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
                            {formatStatus(transaction.appointmentStatus)}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button variant="outline" className="hover:bg-primary-50" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
