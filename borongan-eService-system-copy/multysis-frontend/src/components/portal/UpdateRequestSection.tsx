// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Custom Components
import { DynamicServiceForm } from './DynamicServiceForm';

// Services
import { serviceApi, serviceService, type AppointmentSlot, type Service } from '@/services/api/service.service';
import { transactionService, type Transaction } from '@/services/api/transaction.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Utils
import { cn } from '@/lib/utils';
import { FiAlertCircle, FiCalendar, FiCheck, FiEdit, FiX } from 'react-icons/fi';

interface UpdateRequestSectionProps {
  transaction: Transaction;
  onUpdate?: () => void;
}

const requestSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
});

type RequestFormData = z.infer<typeof requestSchema>;

export const UpdateRequestSection: React.FC<UpdateRequestSectionProps> = ({
  transaction,
  onUpdate,
}) => {
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [hasEditedData, setHasEditedData] = useState(false); // Track if user has edited data
  const [service, setService] = useState<Service | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(false);
  // Appointment date/time selection
  const [availability, setAvailability] = useState<AppointmentSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    transaction.preferredAppointmentDate ? new Date(transaction.preferredAppointmentDate) : undefined
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [appointmentStep, setAppointmentStep] = useState<'date' | 'time'>('date');

  const descriptionForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      description: '',
    },
  });

  // Extract update status early to avoid initialization errors
  const updateStatus = (transaction.updateRequestStatus as 'NONE' | 'PENDING_PORTAL' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED') || 'NONE';
  const updateRequestedBy = transaction.updateRequestedBy as 'PORTAL' | 'ADMIN' | undefined;
  const adminRequestDescription = transaction.adminUpdateRequestDescription;
  const updateRequestDescription = transaction.updateRequestDescription;

  // Load service for edit form - load when edit form is shown or when initiating a request
  useEffect(() => {
    if ((showEditForm || (showRequestForm && (updateStatus === 'NONE' || updateStatus === 'APPROVED' || updateStatus === 'REJECTED'))) && transaction.serviceId) {
      setIsLoadingService(true);
      serviceService
        .getService(transaction.serviceId)
        .then((s) => {
          setService(s);
          // If service requires appointment, fetch availability
          if (s?.requiresAppointment) {
            fetchAvailability(s.id);
          }
        })
        .catch((err) => {
          console.error('Failed to load service:', err);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load service information',
          });
        })
        .finally(() => setIsLoadingService(false));
    }
  }, [showEditForm, showRequestForm, updateStatus, transaction.serviceId, toast]);

  // Fetch appointment availability
  const fetchAvailability = async (serviceId: string) => {
    setLoadingAvailability(true);
    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const response = await serviceApi.getAppointmentAvailability(
        serviceId,
        startDate.toISOString(),
        endDate.toISOString()
      );
      setAvailability(response.data || []);
      
      // If transaction has existing appointment, try to set it
      if (transaction.preferredAppointmentDate && selectedDate) {
        const existingDate = new Date(transaction.preferredAppointmentDate);
        const timeStr = format(existingDate, 'HH:mm');
        const dateStr = format(existingDate, 'yyyy-MM-dd');
        const matchingSlot = response.data?.find(
          slot => slot.date === dateStr && slot.time === timeStr
        );
        if (matchingSlot) {
          setSelectedTimeSlot(timeStr);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch availability:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load appointment availability. Please try again.',
      });
    } finally {
      setLoadingAvailability(false);
    }
  };

  // Get time slots for selected date
  const getTimeSlotsForDate = (date: Date): AppointmentSlot[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return availability.filter(slot => slot.date === dateStr);
  };

  // Format time from HH:mm to 12-hour format with AM/PM
  const formatTime12Hour = (time24Hour: string): string => {
    const [hours, minutes] = time24Hour.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Extract formFields from service
  const formFields = service?.formFields
    ? Array.isArray(service.formFields)
      ? service.formFields
      : 'fields' in service.formFields && Array.isArray(service.formFields.fields)
        ? service.formFields.fields
        : []
    : [];

  // Create edit form with serviceData as default values
  const editForm = useForm({
    defaultValues: transaction.serviceData || {},
  });

  // Reset edit form when serviceData changes
  useEffect(() => {
    if (transaction.serviceData) {
      editForm.reset(transaction.serviceData);
    }
  }, [transaction.serviceData, editForm]);

  const handleRequestUpdate = async (data: RequestFormData) => {
    setIsRequesting(true);
    try {
      // Use edited data if user has edited, otherwise use original serviceData
      const updatedServiceData = (hasEditedData || showEditForm) ? editForm.getValues() : transaction.serviceData || {};
      
      // Prepare appointment date - use selected date/time if available
      let appointmentDate: string | undefined = undefined;
      if (service?.requiresAppointment && selectedDate && selectedTimeSlot) {
        // Combine date and time into ISO string
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const [hours, minutes] = selectedTimeSlot.split(':');
        const appointmentDateTime = new Date(`${dateStr}T${hours}:${minutes}:00`);
        appointmentDate = appointmentDateTime.toISOString();
      } else if (service?.requiresAppointment && !selectedDate) {
        // If appointment is required but no date selected, use original or null
        appointmentDate = transaction.preferredAppointmentDate || undefined;
      }
      
      // If admin requested update, apply it directly
      if (updateStatus === 'PENDING_ADMIN' && updateRequestedBy === 'ADMIN') {
        // Apply the update with edited serviceData and appointment date
        await transactionService.requestUpdate(transaction.id, {
          description: data.description,
          serviceData: updatedServiceData,
          preferredAppointmentDate: appointmentDate,
        });
        toast({
          title: 'Success',
          description: 'Update applied successfully',
        });
        setShowEditForm(false);
        setHasEditedData(false);
      } else {
        // Create a new update request (portal-initiated)
        await transactionService.requestUpdate(transaction.id, {
          description: data.description,
          serviceData: updatedServiceData,
          preferredAppointmentDate: appointmentDate,
        });
        toast({
          title: 'Success',
          description: 'Update request submitted. Waiting for admin approval.',
        });
      }
      setShowRequestForm(false);
      setHasEditedData(false);
      descriptionForm.reset();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to request update',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusBadge = () => {
    switch (updateStatus) {
      case 'PENDING_PORTAL':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending Your Update</Badge>;
      case 'PENDING_ADMIN':
        return <Badge className="bg-blue-100 text-blue-700">Admin Requested Update</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-700">Update Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-700">Update Rejected</Badge>;
      default:
        return null;
    }
  };

  // Portal can only update if admin requested it
  const canUpdate = updateStatus === 'PENDING_ADMIN' && updateRequestedBy === 'ADMIN';
  
  // Check if we should show the default request option
  // Only show for NONE status - APPROVED and REJECTED have their own sections
  const showDefaultRequest = !showRequestForm && !showEditForm && 
    (updateStatus === 'NONE' || !transaction.updateRequestStatus);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Update Request</h4>
        {getStatusBadge()}
      </div>
      
      {/* Always show the request option if no active status */}
      {showDefaultRequest && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-3">
            You can request updates to your application. You'll be able to edit your application data and provide a description. Your request will need admin approval.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowEditForm(true)}
            className="text-primary-600 border-primary-300 hover:bg-primary-50"
          >
            <FiEdit className="mr-2" size={14} />
            Request Update
          </Button>
        </div>
      )}

      {/* Show edit form for portal-initiated requests (when status is NONE) */}
      {showEditForm && updateStatus === 'NONE' && !canUpdate && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-semibold text-gray-700">Edit Application Information</h5>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowEditForm(false);
                setHasEditedData(false);
                editForm.reset(transaction.serviceData || {});
              }}
            >
              <FiX size={16} />
            </Button>
          </div>
          {isLoadingService ? (
            <p className="text-sm text-gray-500">Loading form fields...</p>
          ) : formFields.length > 0 ? (
            <FormProvider {...editForm}>
              <form>
                <DynamicServiceForm fields={formFields} />
              </form>
            </FormProvider>
          ) : (
            <p className="text-sm text-gray-500">No form fields available for editing.</p>
          )}
          
          {/* Appointment Date/Time Selection */}
          {service?.requiresAppointment && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-primary-600" size={18} />
                <Label className="text-sm font-semibold text-gray-700">Appointment Date & Time</Label>
              </div>
              
              {/* Step 1: Date Selection */}
              {appointmentStep === 'date' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select your preferred date. Green dates have available slots.
                  </p>
                  <div className="flex justify-center w-full">
                    <div className="w-full max-w-md">
                      <Calendar
                        value={selectedDate || null}
                        onChange={(date) => {
                          setSelectedDate(date as Date);
                          setSelectedTimeSlot('');
                          if (date) {
                            setAppointmentStep('time');
                          }
                        }}
                        disabled={({ date }) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (date < today) return true;
                          const day = date.getDay();
                          return day === 0 || day === 6;
                        }}
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDate(undefined);
                          setSelectedTimeSlot('');
                          setAppointmentStep('date');
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Time Selection */}
              {appointmentStep === 'time' && selectedDate && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Select your preferred time for <strong>{format(selectedDate, 'MMMM d, yyyy')}</strong>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="hover:bg-primary-50"
                      size="sm"
                      onClick={() => {
                        setAppointmentStep('date');
                        setSelectedTimeSlot('');
                      }}
                    >
                      Change Date
                    </Button>
                  </div>
                  {loadingAvailability ? (
                    <div className="text-center py-4 text-gray-500 text-sm">Loading time slots...</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                      {getTimeSlotsForDate(selectedDate).length === 0 ? (
                        <div className="col-span-4 text-sm text-gray-500 text-center py-4">
                          No time slots available for this date.
                        </div>
                      ) : (
                        getTimeSlotsForDate(selectedDate)
                          .filter(slot => slot.isAvailable)
                          .map((slot) => (
                            <button
                              key={`${slot.date}-${slot.time}`}
                              type="button"
                              onClick={() => {
                                setSelectedTimeSlot(slot.time);
                              }}
                              className={cn(
                                'px-3 py-2 text-xs rounded-md border transition-colors',
                                'bg-green-50 border-green-200 text-green-800 hover:bg-green-100 cursor-pointer',
                                selectedTimeSlot === slot.time
                                  ? 'ring-2 ring-primary-500 ring-offset-2 bg-primary-50 border-primary-300'
                                  : ''
                              )}
                            >
                              {formatTime12Hour(slot.time)}
                            </button>
                          ))
                      )}
                    </div>
                  )}
                  {selectedTimeSlot && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {format(selectedDate, 'MMMM d, yyyy')} at {formatTime12Hour(selectedTimeSlot)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2 pt-2 border-t">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setHasEditedData(true);
                setShowEditForm(false);
                setShowRequestForm(true);
              }}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Continue with Description
            </Button>
            <Button
              type="button"
              variant="outline"
              className="hover:bg-primary-50"
              size="sm"
              onClick={() => {
                setShowEditForm(false);
                setHasEditedData(false);
                editForm.reset(transaction.serviceData || {});
                setSelectedDate(transaction.preferredAppointmentDate ? new Date(transaction.preferredAppointmentDate) : undefined);
                setSelectedTimeSlot('');
                setAppointmentStep('date');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {updateStatus === 'PENDING_ADMIN' && updateRequestedBy === 'ADMIN' && adminRequestDescription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <FiAlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">Admin Requested Update</p>
              <p className="text-sm text-blue-800 whitespace-pre-wrap mb-3">{adminRequestDescription}</p>
              {!showEditForm && !showRequestForm && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    onClick={() => setShowEditForm(true)}
                  >
                    <FiEdit className="mr-2" size={14} />
                    Edit Application Data
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditForm && canUpdate && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-semibold text-gray-700">Edit Application Information</h5>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowEditForm(false);
                editForm.reset(transaction.serviceData || {});
              }}
            >
              <FiX size={16} />
            </Button>
          </div>
          {isLoadingService ? (
            <p className="text-sm text-gray-500">Loading form fields...</p>
          ) : formFields.length > 0 ? (
            <FormProvider {...editForm}>
              <form>
                <DynamicServiceForm fields={formFields} />
              </form>
            </FormProvider>
          ) : (
            <p className="text-sm text-gray-500">No form fields available for editing.</p>
          )}
          
          {/* Appointment Date/Time Selection */}
          {service?.requiresAppointment && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <FiCalendar className="text-primary-600" size={18} />
                <Label className="text-sm font-semibold text-gray-700">Appointment Date & Time</Label>
              </div>
              
              {/* Step 1: Date Selection */}
              {appointmentStep === 'date' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select your preferred date. Green dates have available slots.
                  </p>
                  <div className="flex justify-center w-full">
                    <div className="w-full max-w-md">
                      <Calendar
                        value={selectedDate || null}
                        onChange={(date) => {
                          setSelectedDate(date as Date);
                          setSelectedTimeSlot('');
                          if (date) {
                            setAppointmentStep('time');
                          }
                        }}
                        disabled={({ date }: { date: Date }) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (date < today) return true;
                          const day = date.getDay();
                          return day === 0 || day === 6;
                        }}
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="hover:bg-primary-50"
                        size="sm"
                        onClick={() => {
                          setSelectedDate(undefined);
                          setSelectedTimeSlot('');
                          setAppointmentStep('date');
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Time Selection */}
              {appointmentStep === 'time' && selectedDate && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Select your preferred time for <strong>{format(selectedDate, 'MMMM d, yyyy')}</strong>
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="hover:bg-primary-50"
                      size="sm"
                      onClick={() => {
                        setAppointmentStep('date');
                        setSelectedTimeSlot('');
                      }}
                    >
                      Change Date
                    </Button>
                  </div>
                  {loadingAvailability ? (
                    <div className="text-center py-4 text-gray-500 text-sm">Loading time slots...</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                      {getTimeSlotsForDate(selectedDate).length === 0 ? (
                        <div className="col-span-4 text-sm text-gray-500 text-center py-4">
                          No time slots available for this date.
                        </div>
                      ) : (
                        getTimeSlotsForDate(selectedDate)
                          .filter((slot: AppointmentSlot) => slot.isAvailable)
                          .map((slot: AppointmentSlot) => (
                            <button
                              key={`${slot.date}-${slot.time}`}
                              type="button"
                              onClick={() => {
                                setSelectedTimeSlot(slot.time);
                              }}
                              className={cn(
                                'px-3 py-2 text-xs rounded-md border transition-colors',
                                'bg-green-50 border-green-200 text-green-800 hover:bg-green-100 cursor-pointer',
                                selectedTimeSlot === slot.time
                                  ? 'ring-2 ring-primary-500 ring-offset-2 bg-primary-50 border-primary-300'
                                  : ''
                              )}
                            >
                              {formatTime12Hour(slot.time)}
                            </button>
                          ))
                      )}
                    </div>
                  )}
                  {selectedTimeSlot && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        <strong>Selected:</strong> {format(selectedDate, 'MMMM d, yyyy')} at {formatTime12Hour(selectedTimeSlot)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2 pt-2 border-t">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setHasEditedData(true);
                setShowEditForm(false);
                setShowRequestForm(true);
              }}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Continue with Description
            </Button>
            <Button
              type="button"
              variant="outline"
              className="hover:bg-primary-50"
              size="sm"
              onClick={() => {
                setShowEditForm(false);
                setHasEditedData(false);
                editForm.reset(transaction.serviceData || {});
                setSelectedDate(transaction.preferredAppointmentDate ? new Date(transaction.preferredAppointmentDate) : undefined);
                setSelectedTimeSlot('');
                setAppointmentStep('date');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {updateStatus === 'PENDING_PORTAL' && updateRequestDescription && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-900 mb-1">Your Update Request</p>
          <p className="text-sm text-yellow-800 whitespace-pre-wrap">{updateRequestDescription}</p>
          <p className="text-xs text-yellow-700 mt-2">Waiting for admin approval...</p>
        </div>
      )}

      {updateStatus === 'APPROVED' && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FiCheck className="text-green-600" size={18} />
              <p className="text-sm font-medium text-green-900">Update has been approved and applied</p>
            </div>
          </div>
          {!showRequestForm && !showEditForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                You can request another update to your application if needed.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditForm(true)}
                className="text-primary-600 border-primary-300 hover:bg-primary-50"
              >
                <FiEdit className="mr-2" size={14} />
                Request Another Update
              </Button>
            </div>
          )}
        </div>
      )}

      {updateStatus === 'REJECTED' && (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FiX className="text-red-600" size={18} />
              <p className="text-sm font-medium text-red-900">Your update request was rejected</p>
            </div>
          </div>
          {!showRequestForm && !showEditForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                You can request another update to your application. Make sure to address any issues mentioned in the rejection.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEditForm(true)}
                className="text-primary-600 border-primary-300 hover:bg-primary-50"
              >
                <FiEdit className="mr-2" size={14} />
                Request Another Update
              </Button>
            </div>
          )}
        </div>
      )}


      {showRequestForm && (
        <form onSubmit={descriptionForm.handleSubmit(handleRequestUpdate)} className="space-y-3 bg-white border border-gray-200 rounded-lg p-4">
          {(updateStatus === 'NONE' || updateStatus === 'APPROVED' || updateStatus === 'REJECTED') && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You've edited your application data. Please provide a description of the changes below.
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description of Changes *
            </Label>
            <Textarea
              {...descriptionForm.register('description')}
              id="description"
              placeholder={canUpdate ? "Describe the changes you're making..." : "Describe what changes you need and why..."}
              className={cn('mt-1 min-h-[100px]', descriptionForm.formState.errors.description && 'border-red-500')}
              disabled={isRequesting}
            />
            {descriptionForm.formState.errors.description && (
              <p className="text-red-500 text-sm mt-1">{descriptionForm.formState.errors.description.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Minimum 10 characters required. Explain what changes you made and why they're needed.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isRequesting}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isRequesting ? (canUpdate ? 'Applying...' : 'Submitting...') : (canUpdate ? 'Apply Update' : 'Submit Request')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="hover:bg-primary-50"
              onClick={() => {
                setShowRequestForm(false);
                descriptionForm.reset();
                // If this was a portal-initiated request, go back to edit form
                if (updateStatus === 'NONE') {
                  setShowEditForm(true);
                } else {
                  setHasEditedData(false);
                }
              }}
              disabled={isRequesting}
            >
              {updateStatus === 'NONE' ? 'Back to Edit' : 'Cancel'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

