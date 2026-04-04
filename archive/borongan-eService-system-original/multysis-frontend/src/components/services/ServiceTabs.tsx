// React imports
import React from 'react';

// Third-party libraries
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Types
import type { Service } from '@/services/api/service.service';

// Utils
import { cn } from '@/lib/utils';
import { FiEdit, FiEye, FiFileText, FiSettings, FiTrash2 } from 'react-icons/fi';
import { LuPhilippinePeso } from "react-icons/lu";

interface FormFieldConfig {
  name: string;
  type: 'text' | 'number' | 'select' | 'date' | 'file' | 'textarea' | 'checkbox';
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface FormFieldsPreviewProps {
  formFields: any;
}

const FormFieldsPreview: React.FC<FormFieldsPreviewProps> = ({ formFields }) => {
  // Extract fields array from formFields object
  const fieldsArray: FormFieldConfig[] = Array.isArray(formFields?.fields)
    ? formFields.fields
    : Array.isArray(formFields)
      ? formFields
      : [];

  if (fieldsArray.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No form fields configured.
      </div>
    );
  }

  const renderField = (field: FormFieldConfig, index: number) => {
    const fieldId = `preview-${field.name}-${index}`;

    switch (field.type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <div key={index} className="space-y-2">
            <CustomFormLabel required={field.required}>
              {field.label}
            </CustomFormLabel>
            <Input
              type={field.type}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              disabled
              className="bg-gray-50 cursor-not-allowed"
            />
            {field.validation && (
              <p className="text-xs text-gray-500">
                {field.validation.min && `Min: ${field.validation.min}`}
                {field.validation.min && field.validation.max && ' • '}
                {field.validation.max && `Max: ${field.validation.max}`}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={index} className="space-y-2">
            <CustomFormLabel required={field.required}>
              {field.label}
            </CustomFormLabel>
            <textarea
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              disabled
              className="w-full min-h-[100px] px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md cursor-not-allowed resize-none"
            />
            {field.validation && (
              <p className="text-xs text-gray-500">
                {field.validation.min && `Min length: ${field.validation.min}`}
                {field.validation.min && field.validation.max && ' • '}
                {field.validation.max && `Max length: ${field.validation.max}`}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={index} className="space-y-2">
            <CustomFormLabel required={field.required}>
              {field.label}
            </CustomFormLabel>
            <Select
              options={field.options || []}
              placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
              isDisabled
              className="react-select-container"
              classNamePrefix="react-select"
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '40px',
                  backgroundColor: '#f9fafb',
                  cursor: 'not-allowed',
                }),
              }}
            />
            {field.options && field.options.length > 0 && (
              <p className="text-xs text-gray-500">
                {field.options.length} option{field.options.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={index} className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              disabled
              className="cursor-not-allowed"
            />
            <Label htmlFor={fieldId} className="cursor-not-allowed">
              {field.label}
              {field.required && <span className="text-red-600 ml-1">*</span>}
            </Label>
          </div>
        );

      case 'file':
        return (
          <div key={index} className="space-y-2">
            <CustomFormLabel required={field.required}>
              {field.label}
            </CustomFormLabel>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
              <p className="text-sm text-gray-500">
                File upload field
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {field.placeholder || 'Click to upload file'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Preview of form fields that will be displayed when creating transactions for this service.
      </p>
      <div className="space-y-4 border rounded-lg p-6 bg-gray-50">
        {fieldsArray.map((field, index) => renderField(field, index))}
      </div>
    </div>
  );
};

interface ServiceTabsProps {
  selectedService: Service | null;
  onEdit: () => void;
  onDelete: () => void;
}

export const ServiceTabs: React.FC<ServiceTabsProps> = ({
  selectedService,
  onEdit,
  onDelete,
}) => {
  if (!selectedService) {
    return (
      <div className={cn("text-center py-12 text-gray-500")}>
        Select a service to view details
      </div>
    );
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="form-fields">Form Fields</TabsTrigger>
        <TabsTrigger value="payment">Payment</TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6 mt-6">
        {/* Service Overview */}
        <Card>
          <CardHeader>
            <div className={cn("flex items-center justify-between")}>
              <CardTitle className="text-xl text-heading-700 flex items-center gap-2">
                <FiFileText size={20} />
                Service Overview
              </CardTitle>
              {getStatusBadge(selectedService.isActive)}
            </div>
          </CardHeader>
          <CardContent className={cn("space-y-4")}>
            <div>
              <h3 className={cn("text-lg font-semibold text-heading-700")}>{selectedService.name}</h3>
              <p className={cn("text-gray-600 mt-1")}>{selectedService.description || 'No description'}</p>
            </div>
            
            <div className={cn("grid grid-cols-2 gap-4")}>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiSettings size={16} />
                  <span>Category</span>
                </div>
                <p className={cn("text-lg font-bold text-heading-700 mt-1")}>
                  {selectedService.category || 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiEye size={16} />
                  <span>Display Order</span>
                </div>
                <p className={cn("text-lg font-bold text-heading-700 mt-1")}>
                  {selectedService.order}
                </p>
              </div>
            </div>

            <div className={cn("flex gap-2")}>
              <Button 
                size="sm" 
                variant="outline"
                className={cn("text-primary-600 hover:text-primary-700 hover:bg-primary-50")}
                onClick={onEdit}
              >
                <FiEdit size={14} className="mr-1" />
                Edit Service
              </Button>
              <Button 
                size="sm" 
                className={cn("bg-red-600 hover:bg-red-700")}
                onClick={onDelete}
              >
                <FiTrash2 size={14} className="mr-1" />
                Delete Service
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-heading-700">Display Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-heading-700">Display in Sidebar</p>
                  <p className="text-sm text-gray-600">Show in e-government sidebar menu</p>
                </div>
                <Badge className={selectedService.displayInSidebar ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {selectedService.displayInSidebar ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-heading-700">Display in Subscriber Tabs</p>
                  <p className="text-sm text-gray-600">Show as a tab in subscriber information</p>
                </div>
                <Badge className={selectedService.displayInSubscriberTabs ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {selectedService.displayInSubscriberTabs ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-heading-700">Appointment Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-heading-700">Requires Appointment</p>
                  <p className="text-sm text-gray-600">Whether this service requires scheduling appointments</p>
                </div>
                <Badge className={selectedService.requiresAppointment ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}>
                  {selectedService.requiresAppointment ? 'Yes' : 'No'}
                </Badge>
              </div>
              {selectedService.requiresAppointment && selectedService.appointmentDuration && (
                <div className="p-3 border rounded-lg">
                  <p className="font-medium text-heading-700 mb-2">Appointment Duration</p>
                  <p className="text-2xl font-bold text-heading-700">
                    {selectedService.appointmentDuration} {selectedService.appointmentDuration === 1 ? 'minute' : 'minutes'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Duration of each appointment slot</p>
                </div>
              )}
              {selectedService.requiresAppointment && !selectedService.appointmentDuration && (
                <div className="text-center py-4 text-gray-500 text-sm border rounded-lg">
                  Appointment duration not configured
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Service Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-heading-700">Service Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Service Code:</span>
                <p className="text-gray-600 font-mono">{selectedService.code}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Icon:</span>
                <p className="text-gray-600">{selectedService.icon || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>
                <p className="text-gray-600">{new Date(selectedService.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <p className="text-gray-600">{new Date(selectedService.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Form Fields Tab */}
      <TabsContent value="form-fields" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-heading-700">Form Fields Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedService.formFields ? (
              <FormFieldsPreview formFields={selectedService.formFields} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                No form fields configured. Edit the service to add form fields.
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Payment Tab */}
      <TabsContent value="payment" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-heading-700 flex items-center gap-2">
              <LuPhilippinePeso className="text-primary-600" size={20} />
              Payment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-heading-700">Requires Payment</p>
                <p className="text-sm text-gray-600">Whether this service requires payment</p>
              </div>
              <Badge className={selectedService.requiresPayment ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                {selectedService.requiresPayment ? 'Yes' : 'No'}
              </Badge>
            </div>

            {selectedService.requiresPayment && (
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-heading-700 mb-2">Default Amount</p>
                <p className="text-2xl font-bold text-heading-700">
                  ₱{selectedService.defaultAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
            )}

            {selectedService.paymentStatuses && selectedService.paymentStatuses.length > 0 ? (
              <div>
                <p className="font-medium text-heading-700 mb-3">Available Payment Statuses</p>
                <div className="flex flex-wrap gap-2">
                  {selectedService.paymentStatuses.map((status: string) => (
                    <Badge key={status} variant="outline" className="text-xs">
                      {status.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No payment statuses configured
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

