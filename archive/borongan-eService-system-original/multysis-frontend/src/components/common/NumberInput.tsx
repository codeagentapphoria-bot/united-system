// React imports
import React, { useState, useEffect } from 'react';

// UI Components (shadcn/ui)
import { Input } from '@/components/ui/input';
import { FormControl, FormItem, FormMessage, FormDescription } from '@/components/ui/form';
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

interface NumberInputProps {
  field: any;
  label: string;
  placeholder?: string;
  min?: number;
  step?: number;
  description?: string;
  onBlurDefault?: number | undefined;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  field,
  label,
  placeholder = "0",
  min = 0,
  step,
  description,
  onBlurDefault = 0,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    field.value !== undefined && field.value !== null ? field.value.toString() : ''
  );

  // Sync display value when field value changes externally (e.g., form reset)
  useEffect(() => {
    if (field.value !== undefined && field.value !== null) {
      setDisplayValue(field.value.toString());
    } else {
      setDisplayValue('');
    }
  }, [field.value]);

  return (
    <FormItem>
      <CustomFormLabel>{label}</CustomFormLabel>
      <FormControl>
        <Input
          type="number"
          min={min}
          step={step}
          placeholder={placeholder}
          className="mt-1"
          value={displayValue}
          onChange={(e) => {
            const value = e.target.value;
            setDisplayValue(value);
            // Only update form value if there's a valid number
            if (value !== '') {
              const numValue = step ? parseFloat(value) : parseInt(value);
              if (!isNaN(numValue)) {
                field.onChange(numValue);
              }
            }
            // Don't update form value when empty - let it stay as is until blur
          }}
          onBlur={(e) => {
            field.onBlur();
            const value = e.target.value;
            if (value === '') {
              if (onBlurDefault !== undefined) {
                setDisplayValue(onBlurDefault.toString());
                field.onChange(onBlurDefault);
              } else {
                setDisplayValue('');
                field.onChange(undefined);
              }
            } else {
              const numValue = step ? parseFloat(value) : parseInt(value);
              if (!isNaN(numValue)) {
                setDisplayValue(numValue.toString());
                field.onChange(numValue);
              }
            }
          }}
        />
      </FormControl>
      <FormMessage />
      {description && <FormDescription>{description}</FormDescription>}
    </FormItem>
  );
};

