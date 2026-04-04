// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';

// Services
import type { Service } from '@/services/api/service.service';

// Utils
import { cn } from '@/lib/utils';

interface ServiceDataViewerProps {
  serviceData: any;
  formFields?: any;
  service: Service;
  pendingServiceData?: any;
}

export const ServiceDataViewer: React.FC<ServiceDataViewerProps> = ({ 
  serviceData, 
  formFields, 
  service: _service,
  pendingServiceData
}) => {
  if (!serviceData || typeof serviceData !== 'object') {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border">
        <p className="text-sm text-gray-500 italic">No service data available</p>
      </div>
    );
  }

  // Helper function to check if a field has changed
  const isFieldChanged = (fieldName: string): boolean => {
    if (!pendingServiceData) return false;
    const currentValue = serviceData[fieldName];
    const pendingValue = pendingServiceData[fieldName];
    
    // Handle different value types
    if (currentValue === pendingValue) return false;
    if (currentValue === undefined && pendingValue === null) return false;
    if (currentValue === null && pendingValue === undefined) return false;
    if (String(currentValue) === String(pendingValue)) return false;
    
    return true;
  };

  // Extract fields array from formFields (could be array or object with fields property)
  const fieldsArray: any[] = Array.isArray(formFields)
    ? formFields
    : formFields?.fields && Array.isArray(formFields.fields)
      ? formFields.fields
      : [];

  // If formFields schema is available, use it to render fields in order
  if (fieldsArray.length > 0) {
    return (
      <div className="space-y-4">
        {fieldsArray.map((field: any, index: number) => {
          const fieldName = field.name || field.fieldName;
          const fieldLabel = field.label || fieldName;
          const fieldType = field.type || 'text';
          const value = serviceData[fieldName];

          // Format value based on field type
          const formatValue = () => {
            if (fieldType === 'file' && typeof value === 'string') {
              return (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  View File
                </a>
              );
            }
            if (fieldType === 'date') {
              try {
                return new Date(value).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });
              } catch {
                return String(value);
              }
            }
            if (fieldType === 'textarea') {
              return <pre className="whitespace-pre-wrap font-sans">{String(value)}</pre>;
            }
            if (fieldType === 'select' && field.options && Array.isArray(field.options)) {
              // Try to find matching option
              const option = field.options.find((opt: any) => {
                if (typeof opt === 'object') {
                  return opt.value === value || opt.value === String(value);
                }
                return opt === value || String(opt) === String(value);
              });
              
              if (option) {
                return typeof option === 'object' ? option.label : String(option);
              }
              
              // Fallback: format the value (replace underscores, capitalize)
              return String(value)
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
            }
            
            // Format other values (replace underscores, capitalize)
            return String(value)
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase());
          };

          const hasChanged = isFieldChanged(fieldName);
          const pendingValue = pendingServiceData?.[fieldName];
          
          // Format pending value
          const formatPendingValue = () => {
            if (pendingValue === undefined || pendingValue === null || pendingValue === '') {
              return 'Not provided';
            }
            
            if (fieldType === 'file' && typeof pendingValue === 'string') {
              return (
                <a
                  href={pendingValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 underline"
                >
                  View File
                </a>
              );
            }
            if (fieldType === 'date') {
              try {
                return new Date(pendingValue).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });
              } catch {
                return String(pendingValue);
              }
            }
            if (fieldType === 'textarea') {
              return <pre className="whitespace-pre-wrap font-sans">{String(pendingValue)}</pre>;
            }
            if (fieldType === 'select' && field.options && Array.isArray(field.options)) {
              const option = field.options.find((opt: any) => {
                if (typeof opt === 'object') {
                  return opt.value === pendingValue || opt.value === String(pendingValue);
                }
                return opt === pendingValue || String(opt) === String(pendingValue);
              });
              
              if (option) {
                return typeof option === 'object' ? option.label : String(option);
              }
              
              return String(pendingValue)
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
            }
            
            return String(pendingValue)
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase());
          };

          return (
            <div key={index} className={cn("space-y-2", hasChanged && "bg-yellow-50 p-3 rounded-lg border border-yellow-200")}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {fieldLabel}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {hasChanged && (
                  <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                    Updated
                  </Badge>
                )}
              </div>
              
              {/* Current Value */}
              <div className="space-y-1">
                <div className="text-xs text-gray-500 mb-1">Current Value:</div>
                <div className="min-h-[40px] flex items-center">
                  {value !== undefined && value !== null && value !== '' ? (
                    <div className={cn(
                      "text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full",
                      hasChanged && "line-through text-gray-400"
                    )}>
                      {formatValue()}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">
                      Not provided
                    </p>
                  )}
                </div>
              </div>
              
              {/* Pending Value (if changed) */}
              {hasChanged && (
                <div className="space-y-1">
                  <div className="text-xs text-yellow-700 font-medium mb-1">Pending Update:</div>
                  <div className="min-h-[40px] flex items-center">
                    {pendingValue !== undefined && pendingValue !== null && pendingValue !== '' ? (
                      <div className="text-sm font-medium text-yellow-900 bg-yellow-100 px-3 py-2 rounded border border-yellow-300 w-full">
                        {formatPendingValue()}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">
                        Not provided
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: render all serviceData fields
  return (
    <div className="space-y-4">
      {Object.entries(serviceData).map(([key, value], index) => {
        const hasChanged = isFieldChanged(key);
        const pendingValue = pendingServiceData?.[key];
        
        return (
          <div key={index} className={cn("space-y-2", hasChanged && "bg-yellow-50 p-3 rounded-lg border border-yellow-200")}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
              </label>
              {hasChanged && (
                <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                  Updated
                </Badge>
              )}
            </div>
            
            {/* Current Value */}
            <div className="space-y-1">
              <div className="text-xs text-gray-500 mb-1">Current Value:</div>
              <div className="min-h-[40px] flex items-center">
                {value !== undefined && value !== null && value !== '' ? (
                  <div className={cn(
                    "text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full",
                    hasChanged && "line-through text-gray-400"
                  )}>
                    {typeof value === 'object' ? (
                      <pre className="whitespace-pre-wrap font-sans text-xs">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    ) : typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')) ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 underline"
                      >
                        {value}
                      </a>
                    ) : (
                      typeof value === 'string' && value.includes('_')
                        ? value.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                        : String(value)
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">
                    Not provided
                  </p>
                )}
              </div>
            </div>
            
            {/* Pending Value (if changed) */}
            {hasChanged && (
              <div className="space-y-1">
                <div className="text-xs text-yellow-700 font-medium mb-1">Pending Update:</div>
                <div className="min-h-[40px] flex items-center">
                  {pendingValue !== undefined && pendingValue !== null && pendingValue !== '' ? (
                    <div className="text-sm font-medium text-yellow-900 bg-yellow-100 px-3 py-2 rounded border border-yellow-300 w-full">
                      {typeof pendingValue === 'object' ? (
                        <pre className="whitespace-pre-wrap font-sans text-xs">
                          {JSON.stringify(pendingValue, null, 2)}
                        </pre>
                      ) : typeof pendingValue === 'string' && (pendingValue.startsWith('http://') || pendingValue.startsWith('https://')) ? (
                        <a
                          href={pendingValue}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 underline"
                        >
                          {pendingValue}
                        </a>
                      ) : (
                        typeof pendingValue === 'string' && pendingValue.includes('_')
                          ? pendingValue.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                          : String(pendingValue)
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">
                      Not provided
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

