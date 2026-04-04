// React imports
import React, { useEffect, useState } from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { ServiceDataViewer } from '@/components/services/ServiceDataViewer';
import { MessageComposer } from './MessageComposer';
import { TransactionMessages } from './TransactionMessages';
import { UpdateRequestSection } from './UpdateRequestSection';
import { TaxBreakdown } from './TaxBreakdown';
import { ExemptionManager } from '@/components/tax/ExemptionManager';

// Hooks
import { usePortalNotifications } from '@/hooks/notifications/usePortalNotifications';
import { useTransactionSocket } from '@/hooks/useTransactionSocket';

// Services
import { serviceService, type Service } from '@/services/api/service.service';
import { transactionNoteService } from '@/services/api/transaction-note.service';
import { transactionService, type Transaction } from '@/services/api/transaction.service';
import { taxComputationService, type TaxComputation } from '@/services/api/tax-computation.service';

// Utils
import { cn, formatDateWithoutTimezone } from '@/lib/utils';
import { FiCalendar, FiCheckCircle, FiClock, FiFileText, FiInfo, FiMessageCircle } from 'react-icons/fi';

interface TransactionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  open,
  onClose,
  transaction: initialTransaction,
}) => {
  const { refresh: refreshNotifications } = usePortalNotifications();
  const { transactionUpdate, newNote, clearNewNote } = useTransactionSocket(
    open ? initialTransaction.id : null
  );
  const [transaction, setTransaction] = useState<Transaction>(initialTransaction);
  const [service, setService] = useState<Service | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [messageRefreshTrigger, setMessageRefreshTrigger] = useState(0);
  const [taxComputation, setTaxComputation] = useState<TaxComputation | null>(null);
  const [isLoadingTax, setIsLoadingTax] = useState(false);

  // Update transaction when initialTransaction changes
  useEffect(() => {
    setTransaction(initialTransaction);
  }, [initialTransaction]);

  // Update transaction when WebSocket update arrives
  useEffect(() => {
    if (transactionUpdate && transactionUpdate.transactionId === transaction.id) {
      setTransaction((prev) => {
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
  }, [transactionUpdate, transaction.id]);

  // Add new note when received via WebSocket
  useEffect(() => {
    if (newNote && newNote.transactionId === transaction.id) {
      // Trigger refresh in TransactionMessages to show new note
      setMessageRefreshTrigger((prev) => prev + 1);
      clearNewNote();
    }
  }, [newNote, transaction.id, clearNewNote]);

  useEffect(() => {
    const serviceId = transaction.serviceId || transaction.service?.id;
    if (serviceId && open) {
      fetchService(serviceId);
    } else if (transaction.service) {
      // Service already included in transaction
      setService(transaction.service as Service);
    }
  }, [transaction.serviceId, transaction.service, open]);

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

  // Mark all notes as read when modal opens
  useEffect(() => {
    if (open && transaction.id) {
      const markAllNotesAsRead = async () => {
        try {
          await transactionNoteService.markAllAsRead(transaction.id);
          // Refresh unread count
          const count = await transactionNoteService.getUnreadCount(transaction.id);
          setUnreadMessageCount(count);
          // Refresh notification counts to update badge
          await refreshNotifications();
        } catch (error) {
          // Silently fail - marking as read is not critical
          console.error('Failed to mark notes as read:', error);
        }
      };
      markAllNotesAsRead();
    }
  }, [open, transaction.id, refreshNotifications]);

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
          <div className="flex items-center justify-between">
            <DialogTitle className={cn('text-2xl font-semibold text-primary-600')}>
              Transaction Details
            </DialogTitle>
            {unreadMessageCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                <FiMessageCircle className="mr-1" size={14} />
                {unreadMessageCount} unread
              </Badge>
            )}
          </div>
        </DialogHeader>
        <div className="h-full max-h-[calc(90vh-120px)] overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Reference Number</p>
                <p className="text-sm font-semibold text-heading-700">{transaction.referenceNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                <p className="text-sm font-mono text-heading-700">{transaction.transactionId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Service</p>
                <p className="text-sm text-heading-700">{transaction.service?.name || service?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Date Submitted</p>
                <p className="text-sm text-heading-700">
                  {formatDateWithoutTimezone(transaction.createdAt, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <Separator />

            {/* Statuses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Payment Status</p>
                <Badge className={cn('text-sm font-medium', getPaymentStatusColor(transaction.paymentStatus))}>
                  {transaction.paymentStatus.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Application Status</p>
                {transaction.status ? (
                  <Badge className={cn('text-sm font-medium', getStatusColor(transaction.status))}>
                    {transaction.status}
                  </Badge>
                ) : (
                  <p className="text-sm text-gray-500 italic">N/A</p>
                )}
              </div>
            </div>

            {transaction.paymentAmount > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Payment Amount</p>
                  <p className="text-sm font-semibold text-heading-700">
                    ₱{transaction.paymentAmount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </>
            )}

            {transaction.isResidentOfBorongan !== undefined && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Resident of Borongan</p>
                  <p className="text-sm text-heading-700">
                    {transaction.isResidentOfBorongan ? 'Yes' : 'No'}
                  </p>
                </div>
              </>
            )}

            {transaction.remarks && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-gray-500 mb-1">Remarks</p>
                  <p className="text-sm text-heading-700 whitespace-pre-wrap">{transaction.remarks}</p>
                </div>
              </>
            )}

            {/* Dynamic Service Data */}
            {transaction.serviceData && (
              <>
                <Separator />
                <h3 className="text-lg font-semibold text-heading-700 flex items-center gap-2">
                  <FiFileText size={18} /> Service Information
                </h3>
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
              </>
            )}

            {/* Transaction Timeline */}
            <Separator />
            <h3 className="text-lg font-semibold text-heading-700 flex items-center gap-2">
              <FiClock size={18} /> Transaction Timeline
            </h3>
            <div className="space-y-4">
              {/* Created */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <FiCheckCircle className="text-green-600" size={16} />
                  </div>
                  <div className="w-0.5 h-8 bg-gray-200 mt-1" />
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-heading-700">Request Submitted</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateWithoutTimezone(transaction.createdAt, {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Status: Pending</p>
                </div>
              </div>

              {/* Updated (if different from created) */}
              {transaction.updatedAt && 
               new Date(transaction.updatedAt).getTime() !== new Date(transaction.createdAt).getTime() && (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FiClock className="text-blue-600" size={16} />
                    </div>
                    <div className="w-0.5 h-4 bg-gray-200 mt-1" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium text-heading-700">Status Updated</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDateWithoutTimezone(transaction.updatedAt, {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      })}
                    </p>
                    {transaction.status && (
                      <p className="text-xs text-gray-600 mt-1">Current Status: {transaction.status}</p>
                    )}
                    {transaction.paymentStatus && (
                      <p className="text-xs text-gray-600 mt-1">
                        Payment Status: {transaction.paymentStatus.replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Current Status */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <FiInfo className="text-primary-600" size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-heading-700">Current Status</p>
                  <div className="flex gap-2 mt-2">
                    {transaction.status && (
                      <Badge className={cn('text-xs font-medium', getStatusColor(transaction.status))}>
                        {transaction.status}
                      </Badge>
                    )}
                    <Badge className={cn('text-xs font-medium', getPaymentStatusColor(transaction.paymentStatus))}>
                      {transaction.paymentStatus.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Information */}
            {(transaction.preferredAppointmentDate || transaction.scheduledAppointmentDate || transaction.appointmentStatus) && (
              <>
                <Separator />
                <h3 className="text-lg font-semibold text-heading-700 flex items-center gap-2">
                  <FiCalendar size={18} /> Appointment Information
                </h3>
                <div className="space-y-4">
                  {transaction.preferredAppointmentDate && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Preferred Date & Time</p>
                      <p className="text-sm text-heading-700">
                        {formatDateWithoutTimezone(transaction.preferredAppointmentDate, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {transaction.scheduledAppointmentDate && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Scheduled Date & Time</p>
                      <p className="text-sm font-semibold text-heading-700">
                        {formatDateWithoutTimezone(transaction.scheduledAppointmentDate, {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {transaction.appointmentStatus && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Appointment Status</p>
                      <Badge className={cn('text-sm font-medium', 
                        transaction.appointmentStatus === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                        transaction.appointmentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        transaction.appointmentStatus === 'REQUESTED_UPDATE' ? 'bg-blue-100 text-blue-700' :
                        transaction.appointmentStatus === 'DECLINED' || transaction.appointmentStatus === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {transaction.appointmentStatus.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}
                  {transaction.appointmentNotes && transaction.appointmentNotes.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Appointment Notes</p>
                      <div className="space-y-2">
                        {transaction.appointmentNotes.map((note) => (
                          <div key={note.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                            <div className="flex items-start justify-between mb-1">
                              <Badge variant="outline" className="text-xs">
                                {note.type.replace(/_/g, ' ')}
                              </Badge>
                              <p className="text-xs text-gray-500">
                                {formatDateWithoutTimezone(note.createdAt, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: 'numeric',
                                })}
                              </p>
                            </div>
                            <p className="text-sm text-heading-700 mt-2">{note.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Appointment Information Placeholder (if no appointment data) */}
            {!transaction.preferredAppointmentDate && !transaction.scheduledAppointmentDate && !transaction.appointmentStatus && (
              <>
                <Separator />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FiInfo className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Appointment Information</p>
                      <p className="text-blue-600">
                        {transaction.status === 'Pending' || transaction.status === 'Approved'
                          ? 'If an appointment is required, you will be notified to schedule one.'
                          : 'No appointment scheduled at this time.'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tax & Exemptions Section */}
            {taxComputation && (
              <>
                <Separator />
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-bold text-heading-800 mb-4 pb-2 border-b-2 border-primary-200">
                    Tax & Exemptions
                  </h3>
                  <div className="space-y-6">
                    {taxComputation && (
                      <TaxBreakdown computation={taxComputation} isLoading={isLoadingTax} />
                    )}
                    <ExemptionManager
                      transactionId={transaction.id}
                      mode="portal"
                      onExemptionApproved={loadTaxComputation}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Update Request Section */}
            <Separator />
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-bold text-heading-800 mb-4 pb-2 border-b-2 border-primary-200">
                Update Request
              </h3>
              <UpdateRequestSection
                transaction={transaction}
                onUpdate={async () => {
                  // Refresh transaction data without page reload
                  try {
                    const updated = await transactionService.getTransaction(transaction.id);
                    setTransaction(updated);
                  } catch (error) {
                    console.error('Failed to refresh transaction:', error);
                  }
                }}
              />
            </div>

            {/* Messages Section */}
            <Separator />
            <h3 className="text-lg font-semibold text-heading-700 flex items-center gap-2">
              <FiMessageCircle size={18} /> Messages
            </h3>
            <div className="space-y-4">
              <TransactionMessages
                transactionId={transaction.id}
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
        </div>
        <div className="flex justify-end p-4 border-t">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

