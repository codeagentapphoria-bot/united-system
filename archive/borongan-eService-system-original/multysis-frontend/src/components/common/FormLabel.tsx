import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import React from 'react';

interface FormLabelProps {
  children: React.ReactNode;
  required?: boolean;
}

const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={cn("flex items-center justify-between min-h-[20px]")}>
    <span>{children}</span>
    <span className={cn("text-red-600 text-xs italic")}>Required</span>
  </div>
);

const OptionalLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={cn("flex items-center justify-between min-h-[20px]")}>
    <span>{children}</span>
    <span className={cn("text-xs italic invisible")}>Required</span>
  </div>
);

export const FormLabel: React.FC<FormLabelProps> = ({ children, required = false }) => {
  return (
    <Label className={cn("text-sm font-medium text-gray-700") }>
      {required ? <RequiredLabel>{children}</RequiredLabel> : <OptionalLabel>{children}</OptionalLabel>}
    </Label>
  );
};


