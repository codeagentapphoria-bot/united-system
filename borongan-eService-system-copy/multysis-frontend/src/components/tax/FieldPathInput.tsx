// React imports
import React, { useEffect, useRef, useState } from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// Types
import type { FieldMetadata } from '@/services/api/service.service';

// Utils
import { cn } from '@/lib/utils';
import {
    checkTypeCompatibility,
    getFieldSuggestions,
    validateFieldPath,
    type ValidationResult,
} from '@/utils/tax-field-validation';

interface FieldPathInputProps {
  value: string;
  onChange: (value: string) => void;
  availableFields: FieldMetadata[];
  expectedType?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  text: 'bg-blue-100 text-blue-800',
  number: 'bg-green-100 text-green-800',
  date: 'bg-purple-100 text-purple-800',
  select: 'bg-yellow-100 text-yellow-800',
  checkbox: 'bg-pink-100 text-pink-800',
  textarea: 'bg-cyan-100 text-cyan-800',
  file: 'bg-gray-100 text-gray-800',
};

export const FieldPathInput: React.FC<FieldPathInputProps> = ({
  value,
  onChange,
  availableFields = [],
  expectedType,
  placeholder = 'e.g., marketValue',
  className,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const validation: ValidationResult = availableFields.length > 0
    ? validateFieldPath(value, availableFields)
    : { valid: true };

  const typeCompatible = expectedType && validation.valid && validation.field
    ? checkTypeCompatibility(value, expectedType, availableFields)
    : true;

  const suggestions = value && availableFields.length > 0
    ? getFieldSuggestions(value, availableFields)
    : availableFields.slice(0, 10); // Show first 10 fields when empty

  const selectedField = validation.field;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setFocusedIndex(-1);
  };

  const handleInputFocus = () => {
    if (availableFields.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow dropdown click
    setTimeout(() => {
      setIsOpen(false);
      setFocusedIndex(-1);
    }, 200);
  };

  const handleFieldSelect = (field: FieldMetadata) => {
    onChange(field.name);
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && suggestions[focusedIndex]) {
          handleFieldSelect(suggestions[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const getFieldTypeDisplay = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full',
          !validation.valid && 'border-red-500 focus-visible:ring-red-500',
          validation.valid && !typeCompatible && 'border-yellow-500 focus-visible:ring-yellow-500',
          validation.valid && typeCompatible && 'border-green-500 focus-visible:ring-green-500'
        )}
      />
      
      {/* Validation feedback */}
      {value && availableFields.length > 0 && (
        <div className="mt-1">
          {!validation.valid && (
            <p className="text-xs text-red-600">{validation.error}</p>
          )}
          {validation.valid && !typeCompatible && expectedType && (
            <p className="text-xs text-yellow-600">
              Type mismatch: field is of type "{selectedField?.type}", but "{expectedType}" is expected
            </p>
          )}
          {validation.valid && typeCompatible && selectedField && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-green-600">Valid field</p>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  TYPE_COLORS[selectedField.type] || 'bg-gray-100 text-gray-800'
                )}
              >
                {getFieldTypeDisplay(selectedField.type)}
              </Badge>
              {selectedField.label && (
                <span className="text-xs text-gray-500">{selectedField.label}</span>
              )}
              {selectedField.required && (
                <span className="text-xs text-red-500">Required</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Autocomplete dropdown */}
      {isOpen && availableFields.length > 0 && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((field, index) => (
            <button
              key={field.name}
              type="button"
              onClick={() => handleFieldSelect(field)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={cn(
                'w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors',
                focusedIndex === index && 'bg-gray-100',
                field.name === value && 'bg-primary-50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{field.name}</span>
                  {field.label && (
                    <span className="text-xs text-gray-500">{field.label}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      TYPE_COLORS[field.type] || 'bg-gray-100 text-gray-800'
                    )}
                  >
                    {getFieldTypeDisplay(field.type)}
                  </Badge>
                  {field.required && (
                    <span className="text-xs text-red-500">*</span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {suggestions.length === 0 && value && (
            <div className="px-3 py-2 text-sm text-gray-500">
              No matching fields found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
