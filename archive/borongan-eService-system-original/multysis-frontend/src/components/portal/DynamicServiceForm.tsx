// React imports
import React, { useState } from 'react';

// Third-party libraries
import { useFormContext } from 'react-hook-form';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Services
import { uploadService } from '@/services/api/upload.service';

// Utils
import { FiFile, FiX } from 'react-icons/fi';

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

interface DynamicServiceFormProps {
  fields: FormFieldConfig[];
  isLoading?: boolean;
}

export const DynamicServiceForm: React.FC<DynamicServiceFormProps> = ({
  fields,
  isLoading = false,
}) => {
  const form = useFormContext();
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [uploadedFileNames, setUploadedFileNames] = useState<Record<string, string>>({});

  const handleFileUpload = async (fieldName: string, file: File) => {
    setUploadingFiles((prev) => ({ ...prev, [fieldName]: true }));

    try {
      const response = await uploadService.uploadTransactionDocument(file);
      setUploadedFiles((prev) => ({ ...prev, [fieldName]: response.url }));
      setUploadedFileNames((prev) => ({ ...prev, [fieldName]: file.name }));
      form.setValue(fieldName, response.url);
      form.clearErrors(fieldName);
    } catch (error: any) {
      form.setError(fieldName, {
        type: 'manual',
        message: error.message || 'Failed to upload file',
      });
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleFileRemove = (fieldName: string) => {
    setUploadedFiles((prev) => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
    setUploadedFileNames((prev) => {
      const newState = { ...prev };
      delete newState[fieldName];
      return newState;
    });
    form.setValue(fieldName, '');
  };

  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No form fields configured for this service.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fields.map((field) => (
        <FormField
          key={field.name}
          control={form.control}
          name={field.name}
          render={({ field: formField }) => {
            // File upload field
            if (field.type === 'file') {
              return (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {uploadedFiles[field.name] ? (
                        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FiFile size={18} className="text-gray-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 truncate">
                                {uploadedFileNames[field.name] || 'File uploaded'}
                              </p>
                              <a
                                href={uploadedFiles[field.name]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
                              >
                                View file
                              </a>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFileRemove(field.name)}
                            disabled={isLoading || uploadingFiles[field.name]}
                            className="flex-shrink-0"
                          >
                            <FiX size={16} />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(field.name, file);
                              }
                            }}
                            disabled={isLoading || uploadingFiles[field.name]}
                            className="cursor-pointer"
                          />
                          {uploadingFiles[field.name] && (
                            <p className="text-xs text-gray-500 mt-1">Uploading...</p>
                          )}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }

            // Select/Dropdown field
            if (field.type === 'select') {
              return (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={
                        field.options?.find((opt) => opt.value === formField.value) || null
                      }
                      onChange={(option) => {
                        formField.onChange(option?.value || '');
                      }}
                      options={field.options || []}
                      placeholder={field.placeholder || 'Select an option'}
                      isDisabled={isLoading}
                      className="mt-1"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '40px',
                        }),
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }

            // Checkbox field
            if (field.type === 'checkbox') {
              return (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={formField.value || false}
                      onCheckedChange={formField.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }

            // Textarea field
            if (field.type === 'textarea') {
              return (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...formField}
                      placeholder={field.placeholder}
                      disabled={isLoading}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }

            // Date field
            if (field.type === 'date') {
              return (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...formField}
                      type="date"
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }

            // Number field
            if (field.type === 'number') {
              return (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...formField}
                      type="number"
                      placeholder={field.placeholder}
                      disabled={isLoading}
                      min={field.validation?.min}
                      max={field.validation?.max}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : Number(e.target.value);
                        formField.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }

            // Text field (default)
            return (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    {...formField}
                    type="text"
                    placeholder={field.placeholder}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      ))}
    </div>
  );
};

