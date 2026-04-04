// React imports
import React, { useState } from 'react';

// Third-party libraries
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Utils
import { cn } from '@/lib/utils';
import { FiPlus, FiTrash2 } from 'react-icons/fi';

interface FormField {
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

interface FormFieldsBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const fieldTypeOptions = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select/Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File Upload' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'checkbox', label: 'Checkbox' },
];

export const FormFieldsBuilder: React.FC<FormFieldsBuilderProps> = ({
  fields,
  onChange,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addField = () => {
    const newField: FormField = {
      name: '',
      type: 'text',
      label: '',
      required: false,
    };
    onChange([...fields, newField]);
    setEditingIndex(fields.length);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = fields.map((field, i) =>
      i === index ? { ...field, ...updates } : field
    );
    onChange(updatedFields);
  };

  const addOption = (index: number) => {
    const field = fields[index];
    const newOptions = [...(field.options || []), { value: '', label: '' }];
    updateField(index, { options: newOptions });
  };

  const updateOption = (fieldIndex: number, optionIndex: number, updates: { value?: string; label?: string }) => {
    const field = fields[fieldIndex];
    const updatedOptions = (field.options || []).map((opt, i) =>
      i === optionIndex ? { ...opt, ...updates } : opt
    );
    updateField(fieldIndex, { options: updatedOptions });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    const updatedOptions = (field.options || []).filter((_, i) => i !== optionIndex);
    updateField(fieldIndex, { options: updatedOptions });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          size="sm"
          onClick={addField}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <FiPlus size={16} className="mr-1" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border rounded-lg">
          No form fields added. Click "Add Field" to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <Card key={index} className={cn(editingIndex === index && "border-primary-500")}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Field {index + 1}: {field.label || 'Unnamed Field'}
                  </CardTitle>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => removeField(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <FiTrash2 size={14} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <CustomFormLabel required>Field Name</CustomFormLabel>
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                      placeholder="fieldName"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <CustomFormLabel required>Field Type</CustomFormLabel>
                    <Select
                      value={fieldTypeOptions.find(opt => opt.value === field.type)}
                      onChange={(selected) => updateField(index, { type: selected?.value as FormField['type'] || 'text' })}
                      options={fieldTypeOptions}
                      className="mt-1"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '40px',
                        }),
                      }}
                    />
                  </div>
                </div>

                <div>
                  <CustomFormLabel required>Field Label</CustomFormLabel>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(index, { label: e.target.value })}
                    placeholder="Field Label"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Placeholder</Label>
                    <Input
                      value={field.placeholder || ''}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                      placeholder="Enter placeholder text"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox
                      id={`required-${index}`}
                      checked={field.required || false}
                      onCheckedChange={(checked) => updateField(index, { required: !!checked })}
                    />
                    <Label htmlFor={`required-${index}`} className="cursor-pointer">
                      Required Field
                    </Label>
                  </div>
                </div>

                {/* Options for select fields */}
                {field.type === 'select' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Options</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addOption(index)}
                        className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      >
                        <FiPlus size={14} className="mr-1" />
                        Add Option
                      </Button>
                    </div>
                    {field.options && field.options.length > 0 ? (
                      <div className="space-y-2 border rounded-lg p-3">
                        {field.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <Input
                              value={option.value}
                              onChange={(e) => updateOption(index, optIndex, { value: e.target.value })}
                              placeholder="Value"
                              className="flex-1"
                            />
                            <Input
                              value={option.label}
                              onChange={(e) => updateOption(index, optIndex, { label: e.target.value })}
                              placeholder="Label"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => removeOption(index, optIndex)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <FiTrash2 size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No options added</p>
                    )}
                  </div>
                )}

                {/* Validation rules */}
                {(field.type === 'text' || field.type === 'number') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Min Length/Value</Label>
                      <Input
                        type="number"
                        value={field.validation?.min || ''}
                        onChange={(e) => updateField(index, {
                          validation: {
                            ...field.validation,
                            min: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })}
                        placeholder="Min"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Max Length/Value</Label>
                      <Input
                        type="number"
                        value={field.validation?.max || ''}
                        onChange={(e) => updateField(index, {
                          validation: {
                            ...field.validation,
                            max: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })}
                        placeholder="Max"
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

