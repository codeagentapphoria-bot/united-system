// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { DynamicServiceForm } from './DynamicServiceForm';
import { TaxBreakdown } from './TaxBreakdown';
import { TaxPreview } from '@/components/tax/TaxPreview';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Services
import type { Service } from '@/services/api/service.service';
import { transactionService, type Transaction } from '@/services/api/transaction.service';
import { taxComputationService } from '@/services/api/tax-computation.service';

// Validations
import { createTransactionSchema, type CreateTransactionInput } from '@/validations/transaction.schema';

// Utils
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { FiCalendar, FiCheckCircle, FiChevronLeft, FiChevronRight, FiInfo } from 'react-icons/fi';

// Calendar Component
import { Calendar } from '@/components/ui/calendar';

// Services
import { serviceApi, type AppointmentSlot } from '@/services/api/service.service';

interface RequestServiceModalProps {
  open: boolean;
  onClose: () => void;
  service: Service | null;
  onSuccess?: () => void;
}

export const RequestServiceModal: React.FC<RequestServiceModalProps> = ({
  open,
  onClose,
  service,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const currentUser = user;
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdTransaction, setCreatedTransaction] = useState<Transaction | null>(null);
  const [taxComputation, setTaxComputation] = useState<any>(null);
  const [isLoadingTax, setIsLoadingTax] = useState(false);
  const [availability, setAvailability] = useState<AppointmentSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [appointmentStep, setAppointmentStep] = useState<'date' | 'time'>('date');
  const [currentFormStep, setCurrentFormStep] = useState<'appointment' | 'details'>('appointment');
  const [previewTaxComputation, setPreviewTaxComputation] = useState<any>(null);
  const [isLoadingPreviewTax, setIsLoadingPreviewTax] = useState(false);
  const [showTaxPreview, setShowTaxPreview] = useState(false);
  const [hasTaxProfile, setHasTaxProfile] = useState(false);

  // Extract form fields from service
  const formFields = service?.formFields
    ? Array.isArray(service.formFields?.fields)
      ? service.formFields.fields
      : Array.isArray(service.formFields)
        ? service.formFields
        : []
    : [];

  // Build dynamic schema based on form fields
  const buildDynamicSchema = () => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    formFields.forEach((field: any) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'number': {
          let numberSchema = z.number();
          if (field.validation?.min !== undefined) {
            numberSchema = numberSchema.min(field.validation.min, `Must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined) {
            numberSchema = numberSchema.max(field.validation.max, `Must be at most ${field.validation.max}`);
          }
          fieldSchema = field.required ? numberSchema : numberSchema.optional();
          break;
        }
        case 'checkbox':
          fieldSchema = field.required ? z.boolean() : z.boolean().optional();
          break;
        case 'date':
          fieldSchema = field.required ? z.string().min(1, `${field.label} is required`) : z.string().optional();
          break;
        case 'file':
          fieldSchema = field.required 
            ? z.string().url('File must be uploaded').min(1, `${field.label} is required`)
            : z.string().url('File must be uploaded').optional();
          break;
        default: {
          let stringSchema = z.string();
          if (field.validation?.pattern) {
            stringSchema = stringSchema.regex(
              new RegExp(field.validation.pattern),
              'Invalid format'
            );
          }
          fieldSchema = field.required 
            ? stringSchema.min(1, `${field.label} is required`)
            : stringSchema.optional();
          break;
        }
      }

      schemaFields[field.name] = fieldSchema;
    });

    return z.object(schemaFields);
  };

  const dynamicSchema = buildDynamicSchema();
  
  // Add appointment date requirement if service requires appointment
  let fullSchema = createTransactionSchema.merge(dynamicSchema);
  if (service?.requiresAppointment) {
    fullSchema = fullSchema.extend({
      preferredAppointmentDate: z.string().min(1, 'Preferred appointment date is required'),
    });
  }

  const form = useForm<CreateTransactionInput & Record<string, any>>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      subscriberId: currentUser?.id || '',
      serviceId: service?.id || '',
      serviceData: {},
      paymentAmount: service?.defaultAmount ? Number(service.defaultAmount) : undefined,
      isResidentOfBorongan: false,
      remarks: '',
      preferredAppointmentDate: '',
    },
  });

  // Fetch appointment availability when service changes
  useEffect(() => {
    if (service?.requiresAppointment && service.id) {
      fetchAvailability();
    } else {
      setAvailability([]);
      setSelectedDate(undefined);
      setSelectedTimeSlot('');
    }
  }, [service?.id, service?.requiresAppointment]);

  const fetchAvailability = async () => {
    if (!service?.id) return;
    
    setLoadingAvailability(true);
    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const response = await serviceApi.getAppointmentAvailability(
        service.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
      setAvailability(response.data || []);
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

  useEffect(() => {
    if (service) {
      form.reset({
        subscriberId: currentUser?.id || '',
        serviceId: service.id,
        serviceData: {},
        paymentAmount: service.defaultAmount ? Number(service.defaultAmount) : undefined,
        isResidentOfBorongan: false,
        remarks: '',
        preferredAppointmentDate: '',
      });
      setIsSuccess(false);
      setCreatedTransaction(null);
      setSelectedDate(undefined);
      setSelectedTimeSlot('');
      setAppointmentStep('date');
      // Set initial form step based on whether appointment is required
      setCurrentFormStep(service?.requiresAppointment ? 'appointment' : 'details');
      setPreviewTaxComputation(null);
      setShowTaxPreview(false);
      setHasTaxProfile(false);
    }
  }, [service, currentUser, form]);

  // Debounced tax preview computation
  const formValues = form.watch();
  useEffect(() => {
    if (!service || !open || currentFormStep !== 'details') {
      setPreviewTaxComputation(null);
      setIsLoadingPreviewTax(false);
      setHasTaxProfile(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const formData = form.getValues();
      const serviceData: Record<string, any> = {};
      
      formFields.forEach((field: any) => {
        const value = formData[field.name];
        if (value !== undefined && value !== null && value !== '') {
          serviceData[field.name] = value;
        }
      });

      // Only compute if we have some service data (at least one field filled)
      if (Object.keys(serviceData).length === 0) {
        setPreviewTaxComputation(null);
        setIsLoadingPreviewTax(false);
        setHasTaxProfile(false);
        return;
      }

      setIsLoadingPreviewTax(true);
      try {
        const preview = await taxComputationService.previewTax(
          service.id,
          serviceData
        );
        setPreviewTaxComputation(preview);
        setHasTaxProfile(true);
      } catch (error: any) {
        // Service might not have tax profile, which is fine
        setPreviewTaxComputation(null);
        setHasTaxProfile(false);
      } finally {
        setIsLoadingPreviewTax(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formValues, service, open, currentFormStep, formFields, form]);

  const onSubmit = async (data: CreateTransactionInput & Record<string, any>) => {
    if (!service || !currentUser) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Service or user information is missing',
      });
      return;
    }

    try {
      // Extract serviceData from form data (exclude transaction-specific fields)
      const serviceData: Record<string, any> = {};
      formFields.forEach((field: any) => {
        const value = data[field.name];
        if (value !== undefined && value !== null && value !== '') {
          serviceData[field.name] = value;
        }
      });

      const transactionData: CreateTransactionInput = {
        subscriberId: currentUser.id,
        serviceId: service.id,
        serviceData: Object.keys(serviceData).length > 0 ? serviceData : undefined,
        paymentAmount: data.paymentAmount,
        isResidentOfBorongan: data.isResidentOfBorongan,
        remarks: data.remarks,
        preferredAppointmentDate: service.requiresAppointment && data.preferredAppointmentDate
          ? data.preferredAppointmentDate
          : undefined,
      };

      const transaction = await transactionService.createTransaction(transactionData);

      setCreatedTransaction(transaction);
      setIsSuccess(true);
      
      // Load tax computation if available
      if (transaction.id) {
        setIsLoadingTax(true);
        try {
          const computation = await taxComputationService.getTaxComputation(transaction.id);
          setTaxComputation(computation);
        } catch (error) {
          // Tax computation may not exist, which is fine
          console.log('No tax computation found for this transaction');
        } finally {
          setIsLoadingTax(false);
        }
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to submit request',
      });
    }
  };

  if (!service) {
    return null;
  }

  const isSubmitting = form.formState.isSubmitting;

  const handleClose = () => {
    setIsSuccess(false);
    setCreatedTransaction(null);
    setTaxComputation(null);
    form.reset();
    onClose();
  };

  // Success State
  if (isSuccess && createdTransaction) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={cn('max-w-2xl')}>
          <DialogHeader>
            <DialogTitle className={cn('text-2xl font-semibold text-green-600 flex items-center gap-2')}>
              <FiCheckCircle size={28} />
              Request Submitted Successfully!
            </DialogTitle>
            <DialogDescription className={cn('text-base mt-2')}>
              Your service request has been received and is being processed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Transaction Info */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-green-700">Transaction Details</h3>
                <div className="space-y-1 text-sm text-green-600">
                  <p>
                    <span className="font-medium">Reference Number:</span> {createdTransaction.referenceNumber}
                  </p>
                  <p>
                    <span className="font-medium">Transaction ID:</span> {createdTransaction.transactionId}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiInfo className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                <div className="space-y-2 text-sm text-blue-800">
                  <p className="font-semibold">What happens next?</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Your request has been submitted successfully</li>
                    <li>Your application will be reviewed by our staff within 3-5 business days</li>
                    <li>You will receive notifications about your application status</li>
                    <li>You can track your application status in your Profile page under &quot;My Applications&quot;</li>
                    <li>If an appointment is required, you will be notified to schedule one</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Tax Breakdown */}
            {taxComputation && (
              <TaxBreakdown computation={taxComputation} isLoading={isLoadingTax} />
            )}

            <DialogFooter>
              <Button onClick={handleClose} className="bg-primary-600 hover:bg-primary-700 text-white">
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn('max-w-3xl max-h-[90vh] overflow-y-auto')}>
        <DialogHeader>
          <DialogTitle className={cn('text-2xl font-semibold text-primary-600')}>
            Request Service: {service.name}
          </DialogTitle>
          <DialogDescription className={cn('text-base mt-2')}>
            {service.description || 'Submit your request for this government service'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Before Submission Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FiInfo className="text-gray-600 mt-0.5 flex-shrink-0" size={20} />
              <div className="space-y-1 text-sm text-gray-700">
                <p className="font-semibold">About this service request:</p>
                <p>
                  {service.description || 
                    'Please fill out the form below to submit your request. All required fields must be completed before submission.'}
                </p>
              </div>
            </div>
          </div>
          {/* Service Information */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary-700">Service Information</h3>
              <div className="space-y-1 text-sm text-primary-600">
                <p>
                  <span className="font-medium">Service:</span> {service.name}
                </p>
                {service.category && (
                  <p>
                    <span className="font-medium">Category:</span> {service.category}
                  </p>
                )}
                {service.requiresPayment && (
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Payment Required:</span>{' '}
                    {service.defaultAmount && !isNaN(Number(service.defaultAmount))
                      ? `₱${Number(service.defaultAmount).toFixed(2)}`
                      : 'Amount to be determined'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Informational Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FiInfo className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
              <div className="space-y-2 text-sm text-blue-800">
                <p className="font-semibold">What happens after submission?</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Your request will be reviewed by our staff</li>
                  <li>You will receive updates within 3-5 business days</li>
                  <li>View your applications in your Profile page under &quot;My Applications&quot;</li>
                  {service.requiresAppointment && (
                    <li>An appointment will be scheduled based on your preferred date</li>
                  )}
                  {!service.requiresAppointment && (
                    <li>If an appointment is required, you will be notified to schedule one</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          {service.requiresAppointment && (
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                  currentFormStep === 'appointment' ? "bg-primary-600 text-white ring-4 ring-primary-200" : selectedTimeSlot ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                )}>
                  {selectedTimeSlot ? <FiCheckCircle size={18} /> : '1'}
                </div>
                <span className={cn("text-sm font-medium", currentFormStep === 'appointment' ? "text-primary-600" : selectedTimeSlot ? "text-green-600" : "text-gray-500")}>
                  Appointment
                </span>
              </div>
              <div className={cn("h-1 w-20 transition-all", selectedTimeSlot ? "bg-green-500" : "bg-gray-200")} />
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                  currentFormStep === 'details' ? "bg-primary-600 text-white ring-4 ring-primary-200" : "bg-gray-200 text-gray-600"
                )}>
                  2
                </div>
                <span className={cn("text-sm font-medium", currentFormStep === 'details' ? "text-primary-600" : "text-gray-500")}>
                  Details
                </span>
              </div>
            </div>
          )}

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Appointment Selection (if service requires appointment) */}
              {service.requiresAppointment && currentFormStep === 'appointment' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <FiCalendar className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                          Appointment Selection
                        </h3>
                        <p className="text-xs text-yellow-700 mb-4">
                          {service.appointmentDuration && (
                            <span className="block">
                              Estimated duration: {service.appointmentDuration} minutes
                            </span>
                          )}
                        </p>

                        {/* Appointment Sub-Steps Indicator */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                              appointmentStep === 'date' ? "bg-primary-600 text-white ring-2 ring-primary-200" : selectedDate ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                            )}>
                              {selectedDate ? <FiCheckCircle size={16} /> : '1'}
                            </div>
                            <span className={cn("text-xs font-medium", appointmentStep === 'date' ? "text-primary-600" : selectedDate ? "text-green-600" : "text-gray-500")}>
                              Date
                            </span>
                          </div>
                          <div className={cn("h-1 w-8 flex-shrink-0", selectedDate ? "bg-green-500" : "bg-gray-200")} />
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                              appointmentStep === 'time' ? "bg-primary-600 text-white ring-2 ring-primary-200" : selectedTimeSlot ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                            )}>
                              {selectedTimeSlot ? <FiCheckCircle size={16} /> : '2'}
                            </div>
                            <span className={cn("text-xs font-medium", appointmentStep === 'time' ? "text-primary-600" : selectedTimeSlot ? "text-green-600" : "text-gray-500")}>
                              Time
                            </span>
                          </div>
                        </div>

                        {/* Step 1: Date Selection */}
                        {appointmentStep === 'date' && (
                          <div className="space-y-4">
                            <p className="text-sm text-gray-700">
                              Select your preferred date. Green dates have available slots.
                            </p>
                            <div className="flex justify-center w-full">
                              <div className="w-full max-w-md">
                                <Calendar
                                  value={selectedDate || null}
                                  onChange={(date) => {
                                    setSelectedDate(date as Date);
                                    setSelectedTimeSlot('');
                                    form.setValue('preferredAppointmentDate', date ? (date as Date).toISOString() : '');
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
                                  tileClassName={({ date }) => {
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    const hasAvailableSlots = availability.some(
                                      slot => slot.date === dateStr && slot.isAvailable
                                    );
                                    if (hasAvailableSlots) {
                                      return 'bg-green-100 text-green-800 hover:bg-green-200 font-medium';
                                    }
                                    return '';
                                  }}
                                  minDate={new Date()}
                                  maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
                                  maxDetail="month"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                              <Button
                                type="button"
                                variant="outline"
                                className="hover:bg-primary-50"
                                onClick={() => {
                                  setSelectedDate(undefined);
                                  setSelectedTimeSlot('');
                                  form.setValue('preferredAppointmentDate', '');
                                }}
                                disabled={!selectedDate}
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Step 2: Time Selection */}
                        {appointmentStep === 'time' && selectedDate && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-700">
                                Select your preferred time for <strong>{format(selectedDate, 'MMMM d, yyyy')}</strong>
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                className="hover:bg-transparent hover:text-primary-600"
                                size="sm"
                                onClick={() => {
                                  setAppointmentStep('date');
                                  setSelectedTimeSlot('');
                                  form.setValue('preferredAppointmentDate', '');
                                }}
                              >
                                Change Date
                              </Button>
                            </div>
                            {loadingAvailability ? (
                              <div className="text-center py-8 text-gray-500">Loading time slots...</div>
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
                                        disabled={isSubmitting}
                                        onClick={() => {
                                          setSelectedTimeSlot(slot.time);
                                          form.setValue('preferredAppointmentDate', slot.datetime);
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
                              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-sm text-green-800">
                                  <strong>Selected:</strong> {format(selectedDate, 'MMMM d, yyyy')} at {selectedTimeSlot ? formatTime12Hour(selectedTimeSlot) : ''}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <FormField
                          control={form.control}
                          name="preferredAppointmentDate"
                          render={() => (
                            <FormItem className="mt-4">
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Form Details */}
              {(!service.requiresAppointment || currentFormStep === 'details') && (
                <>
                  {service.requiresAppointment && selectedTimeSlot && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">Appointment Selected</p>
                          <p className="text-xs text-green-700">
                            {format(selectedDate!, 'MMMM d, yyyy')} at {selectedTimeSlot ? formatTime12Hour(selectedTimeSlot) : ''}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentFormStep('appointment');
                            setAppointmentStep('time');
                          }}
                          className="text-green-700 hover:text-green-800 hover:bg-green-100"
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Dynamic Form Fields */}
                  {formFields.length > 0 ? (
                    <DynamicServiceForm fields={formFields} isLoading={isSubmitting} />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No additional information required for this service.</p>
                    </div>
                  )}

                  <Separator />

                  {/* Additional Fields */}
                  <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Additional Information</p>
                  <div className="space-y-4">
                    {/* Resident of Borongan */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isResidentOfBorongan"
                        {...form.register('isResidentOfBorongan')}
                        className="rounded border-gray-300"
                        disabled={isSubmitting}
                      />
                      <label
                        htmlFor="isResidentOfBorongan"
                        className="text-sm text-gray-700 cursor-pointer"
                      >
                        I am a resident of Borongan City
                      </label>
                    </div>

                    {/* Remarks */}
                    <div>
                      <label
                        htmlFor="remarks"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Remarks (Optional)
                      </label>
                      <textarea
                        id="remarks"
                        {...form.register('remarks')}
                        placeholder="Add any additional notes or information..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              </div>
                </>
              )}

              {/* Tax Preview Section */}
              {currentFormStep === 'details' && hasTaxProfile && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700">Tax Preview</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTaxPreview(!showTaxPreview)}
                        className="hover:bg-primary-50"
                      >
                        {showTaxPreview ? 'Hide Preview' : 'Show Preview'}
                      </Button>
                    </div>
                    {showTaxPreview && (
                      <TaxPreview preview={previewTaxComputation} isLoading={isLoadingPreviewTax} />
                    )}
                  </div>
                </>
              )}

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="hover:bg-primary-50"
                >
                  Cancel
                </Button>
                {service.requiresAppointment && currentFormStep === 'appointment' ? (
                  <Button
                    type="button"
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                    disabled={!selectedTimeSlot || isSubmitting}
                    onClick={() => {
                      if (selectedTimeSlot) {
                        setCurrentFormStep('details');
                      }
                    }}
                  >
                    Continue to Details
                    <FiChevronRight className="ml-2" size={18} />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    {service.requiresAppointment && (
                      <Button
                        type="button"
                        variant="outline"
                        className="hover:bg-primary-50"
                        onClick={() => setCurrentFormStep('appointment')}
                        disabled={isSubmitting}
                      >
                        <FiChevronLeft className="mr-2" size={18} />
                        Back
                      </Button>
                    )}
                    {hasTaxProfile && (
                      <Button
                        type="button"
                        variant="outline"
                        className="hover:bg-primary-50"
                        onClick={() => setShowTaxPreview(!showTaxPreview)}
                        disabled={isSubmitting || isLoadingPreviewTax}
                      >
                        {isLoadingPreviewTax ? 'Calculating...' : showTaxPreview ? 'Hide Tax Preview' : 'Preview Tax'}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      className="bg-primary-600 hover:bg-primary-700 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="mr-2">Submitting...</span>
                        </>
                      ) : (
                        <>
                          <FiCheckCircle className="mr-2" size={18} />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

