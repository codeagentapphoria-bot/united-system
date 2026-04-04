// React imports
import React, { useState, useEffect } from 'react';

// Third-party libraries
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';
import { NumberInput } from '@/components/common/NumberInput';
import { FormFieldsBuilder } from '@/components/services/FormFieldsBuilder';

// Hooks
import { useServiceForm } from '@/hooks/services/useServiceForm';

// Types and Schemas
import type { CreateServiceInput } from '@/services/api/service.service';

// Utils
import { cn } from '@/lib/utils';
import { FiInfo, FiLoader } from 'react-icons/fi';

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateServiceInput) => void;
  isLoading?: boolean;
  defaultOrder?: number;
}

const categoryOptions = [
  { value: 'Civil Registry', label: 'Civil Registry' },
  { value: 'Tax', label: 'Tax' },
  { value: 'Permit', label: 'Permit' },
  { value: 'Health', label: 'Health' },
  { value: 'Business', label: 'Business' },
  { value: 'Other', label: 'Other' },
];

const commonPaymentStatuses = [
  'PENDING',
  'APPROVED',
  'FOR_PRINTING',
  'FOR_PICK_UP',
  'RELEASED',
  'ASSESSED',
  'FOR_PAYMENT',
  'PAID',
  'ACKNOWLEDGED',
  'COMPLIED',
  'FOR_HEARING',
  'SETTLED',
  'ISSUED',
  'UNPAID',
  'WAIVED',
  'FOR_INSPECTION',
  'FOR_RELEASE',
  'REJECTED',
];

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  defaultOrder,
}) => {
  const form = useServiceForm(defaultOrder !== undefined ? { order: defaultOrder } : undefined);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);

  // Update order when defaultOrder changes or modal opens
  useEffect(() => {
    if (open && defaultOrder !== undefined) {
      form.setValue('order', defaultOrder);
    }
  }, [open, defaultOrder, form]);

  const selectedPaymentStatuses = form.watch('paymentStatuses') || [];

  const handleFormSubmit = (data: any) => {
    onSubmit(data as CreateServiceInput);
    // Don't reset or close here - let the parent handle it after successful submission
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const togglePaymentStatus = (status: string) => {
    const currentStatuses = selectedPaymentStatuses;
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s: string) => s !== status)
      : [...currentStatuses, status];
    form.setValue('paymentStatuses', newStatuses);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0")}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-semibold text-primary-600">
            Add New Service
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form id="add-service-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pb-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Service Code</CustomFormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="BIRTH_CERTIFICATE"
                          className="mt-1 uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''))}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        Unique code in uppercase letters and underscores only
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Service Name</CustomFormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Birth Certificate"
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel>Description</CustomFormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          placeholder="Enter service description"
                          rows={3}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <CustomFormLabel>Category</CustomFormLabel>
                        <FormControl>
                          <Select
                            value={categoryOptions.find(option => option.value === field.value)}
                            onChange={(selectedOption) => field.onChange(selectedOption?.value || '')}
                            options={categoryOptions}
                            placeholder="Select category"
                            className="mt-1"
                            classNamePrefix="react-select"
                            isClearable
                            styles={{
                              control: (base) => ({
                                ...base,
                                minHeight: '40px',
                                borderColor: form.formState.errors.category ? '#ef4444' : '#d1d5db',
                                '&:hover': {
                                  borderColor: form.formState.errors.category ? '#ef4444' : '#9ca3af',
                                },
                              }),
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="order"
                    render={({ field }) => (
                      <NumberInput
                        field={field}
                        label="Display Order"
                        placeholder="0"
                        description="Lower numbers appear first"
                        onBlurDefault={0}
                      />
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel>Icon</CustomFormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="FiFileText (react-icons icon name)"
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        Icon name from react-icons/fi (e.g., FiFileText)
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              {/* Payment Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-heading-700">Payment Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="requiresPayment"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Requires Payment</FormLabel>
                          <FormDescription>
                            Check if this service requires payment
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultAmount"
                    render={({ field }) => (
                      <NumberInput
                        field={field}
                        label="Default Amount"
                        placeholder="0.00"
                        step={0.01}
                        onBlurDefault={undefined}
                      />
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentStatuses"
                  render={() => (
                    <FormItem>
                      <CustomFormLabel>Payment Statuses</CustomFormLabel>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-40 overflow-y-auto border rounded-md p-4">
                        {commonPaymentStatuses.map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`status-${status}`}
                              checked={selectedPaymentStatuses.includes(status)}
                              onCheckedChange={() => togglePaymentStatus(status)}
                            />
                            <label
                              htmlFor={`status-${status}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {status.replace(/_/g, ' ')}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                      <FormDescription>
                        Select available payment statuses for this service
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              {/* Appointment Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-heading-700">Appointment Settings</h3>
                
                <FormField
                  control={form.control}
                  name="requiresAppointment"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Requires Appointment</FormLabel>
                        <FormDescription>
                          Enable if this service requires scheduling appointments
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch('requiresAppointment') && (
                  <FormField
                    control={form.control}
                    name="appointmentDuration"
                    render={({ field }) => (
                      <FormItem>
                        <CustomFormLabel>Appointment Duration (minutes)</CustomFormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="30"
                            className="mt-1"
                            value={field.value !== undefined && field.value !== null ? field.value : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '') {
                                field.onChange(undefined);
                              } else {
                                const numValue = parseInt(value);
                                if (!isNaN(numValue) && numValue >= 1) {
                                  field.onChange(numValue);
                                }
                              }
                            }}
                            onBlur={field.onBlur}
                          />
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          Duration of each appointment slot in minutes (e.g., 30, 60)
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Display Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-heading-700">Display Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="displayInSidebar"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Display in Sidebar</FormLabel>
                          <FormDescription>
                            Show this service in the e-government sidebar menu
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="displayInSubscriberTabs"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Display in Subscriber Tabs</FormLabel>
                          <FormDescription>
                            Show this service as a tab in subscriber information
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Only active services are available for use
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Form Fields Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-heading-700">Form Fields</h3>
                  <button
                    type="button"
                    onClick={() => setIsSampleModalOpen(true)}
                    className="text-primary-600 hover:text-primary-700 transition-colors"
                    title="View sample form fields"
                  >
                    <FiInfo size={18} />
                  </button>
                </div>
                <FormField
                  control={form.control}
                  name="formFields"
                  render={({ field }) => {
                    // Convert formFields to array format for FormFieldsBuilder
                    const fieldsArray = Array.isArray(field.value?.fields) 
                      ? field.value.fields 
                      : Array.isArray(field.value) 
                        ? field.value 
                        : [];

                    const handleFieldsChange = (fields: any[]) => {
                      // Convert array back to JSON format
                      field.onChange({ fields });
                    };

                    return (
                      <FormItem>
                        <FormControl>
                          <FormFieldsBuilder
                            fields={fieldsArray}
                            onChange={handleFieldsChange}
                          />
                        </FormControl>
                        <FormMessage />
                        <FormDescription>
                          Add form fields that will be displayed when creating transactions for this service
                        </FormDescription>
                      </FormItem>
                    );
                  }}
                />
              </div>

            </form>
          </Form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-service-form"
            className={cn("bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 disabled:cursor-not-allowed")}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FiLoader className="mr-2 animate-spin" size={16} />
                Creating...
              </>
            ) : (
              'Create Service'
            )}
          </Button>
        </div>
      </DialogContent>

      {/* Sample Form Fields Modal */}
      <Dialog open={isSampleModalOpen} onOpenChange={setIsSampleModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-primary-600 flex items-center gap-2">
              <FiInfo size={24} />
              Form Fields Sample
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Here are some examples of form fields you can add to your service. These fields will be displayed when users create transactions for this service.
              </p>
            </div>

            {/* Sample Examples */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Example 1: Text Field</h4>
                <div className="bg-white rounded p-3 text-sm">
                  <p className="font-mono text-gray-700">
                    {`Field Name: firstName`}<br/>
                    {`Field Type: Text`}<br/>
                    {`Label: First Name`}<br/>
                    {`Required: Yes`}
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Example 2: Select/Dropdown Field</h4>
                <div className="bg-white rounded p-3 text-sm">
                  <p className="font-mono text-gray-700">
                    {`Field Name: documentType`}<br/>
                    {`Field Type: Select`}<br/>
                    {`Label: Document Type`}<br/>
                    {`Options:`}<br/>
                    {`  - Value: "birth_cert", Label: "Birth Certificate"`}<br/>
                    {`  - Value: "death_cert", Label: "Death Certificate"`}<br/>
                    {`Required: Yes`}
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">Example 3: Number Field with Validation</h4>
                <div className="bg-white rounded p-3 text-sm">
                  <p className="font-mono text-gray-700">
                    {`Field Name: copies`}<br/>
                    {`Field Type: Number`}<br/>
                    {`Label: Number of Copies`}<br/>
                    {`Min Value: 1`}<br/>
                    {`Max Value: 10`}<br/>
                    {`Required: Yes`}
                  </p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-2">Example 4: Date Field</h4>
                <div className="bg-white rounded p-3 text-sm">
                  <p className="font-mono text-gray-700">
                    {`Field Name: dateOfBirth`}<br/>
                    {`Field Type: Date`}<br/>
                    {`Label: Date of Birth`}<br/>
                    {`Required: Yes`}
                  </p>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-900 mb-2">Example 5: File Upload Field</h4>
                <div className="bg-white rounded p-3 text-sm">
                  <p className="font-mono text-gray-700">
                    {`Field Name: supportingDocument`}<br/>
                    {`Field Type: File Upload`}<br/>
                    {`Label: Supporting Document`}<br/>
                    {`Required: No`}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Tips:</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Field Name should be in camelCase (e.g., firstName, dateOfBirth)</li>
                <li>Field Label is what users will see (e.g., "First Name", "Date of Birth")</li>
                <li>For Select fields, add options with both value and label</li>
                <li>Use validation rules to ensure data quality</li>
                <li>Mark fields as required if they are mandatory</li>
              </ul>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSampleModalOpen(false)}
                className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

