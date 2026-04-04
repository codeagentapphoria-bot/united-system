import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import ReactSelect from './react-select';

const ClassificationDetailsEditor = ({ details = [], onChange }) => {
  const [localDetails, setLocalDetails] = useState(details);

  // Field type options for React Select
  const fieldTypeOptions = [
    { value: "text", label: "Text Input" },
    { value: "select", label: "Dropdown" }
  ];

  const addDetail = () => {
    const newDetail = {
      key: '',
      label: '',
      type: 'text',
      options: []
    };
    const updatedDetails = [...localDetails, newDetail];
    setLocalDetails(updatedDetails);
    onChange(updatedDetails);
  };

  const removeDetail = (index) => {
    const updatedDetails = localDetails.filter((_, i) => i !== index);
    setLocalDetails(updatedDetails);
    onChange(updatedDetails);
  };

  const updateDetail = (index, field, value) => {
    const updatedDetails = localDetails.map((detail, i) => {
      if (i === index) {
        return { ...detail, [field]: value };
      }
      return detail;
    });
    setLocalDetails(updatedDetails);
    onChange(updatedDetails);
  };

  const addOption = (detailIndex) => {
    const updatedDetails = localDetails.map((detail, i) => {
      if (i === detailIndex) {
        return {
          ...detail,
          options: [...(detail.options || []), { value: '', label: '' }]
        };
      }
      return detail;
    });
    setLocalDetails(updatedDetails);
    onChange(updatedDetails);
  };

  const removeOption = (detailIndex, optionIndex) => {
    const updatedDetails = localDetails.map((detail, i) => {
      if (i === detailIndex) {
        return {
          ...detail,
          options: detail.options.filter((_, j) => j !== optionIndex)
        };
      }
      return detail;
    });
    setLocalDetails(updatedDetails);
    onChange(updatedDetails);
  };

  const updateOption = (detailIndex, optionIndex, field, value) => {
    const updatedDetails = localDetails.map((detail, i) => {
      if (i === detailIndex) {
        const updatedOptions = detail.options.map((option, j) => {
          if (j === optionIndex) {
            return { ...option, [field]: value };
          }
          return option;
        });
        return { ...detail, options: updatedOptions };
      }
      return detail;
    });
    setLocalDetails(updatedDetails);
    onChange(updatedDetails);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Form Fields</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addDetail}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {localDetails.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
          <p className="text-sm text-gray-500">No form fields added</p>
          <p className="text-xs text-gray-400 mt-1">Add fields to customize the classification form</p>
        </div>
      ) : (
        <div className="space-y-4">
          {localDetails.map((detail, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Field {index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeDetail(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`key-${index}`}>Field Key *</Label>
                    <Input
                      id={`key-${index}`}
                      value={detail.key}
                      onChange={(e) => updateDetail(index, 'key', e.target.value)}
                      placeholder="e.g., educationLevel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`label-${index}`}>Field Label *</Label>
                    <Input
                      id={`label-${index}`}
                      value={detail.label}
                      onChange={(e) => updateDetail(index, 'label', e.target.value)}
                      placeholder="e.g., Education Level"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`type-${index}`}>Field Type *</Label>
                    <ReactSelect
                      value={fieldTypeOptions.find(option => option.value === detail.type)}
                      onChange={(selectedOption) => updateDetail(index, 'type', selectedOption.value)}
                      options={fieldTypeOptions}
                      placeholder="Select field type"
                      isClearable={false}
                    />
                  </div>
                </div>

                {detail.type === 'select' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Dropdown Options</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(index)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-3 w-3" />
                        Add Option
                      </Button>
                    </div>
                    
                    {(!detail.options || detail.options.length === 0) ? (
                      <div className="text-center py-3 border border-dashed border-gray-300 rounded-lg">
                        <p className="text-sm text-gray-500">No options added</p>
                        <p className="text-xs text-gray-400 mt-1">Add options for the dropdown</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detail.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <Input
                              value={option.value}
                              onChange={(e) => updateOption(index, optionIndex, 'value', e.target.value)}
                              placeholder="Value"
                              className="flex-1"
                            />
                            <Input
                              value={option.label}
                              onChange={(e) => updateOption(index, optionIndex, 'label', e.target.value)}
                              placeholder="Label"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeOption(index, optionIndex)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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

export default ClassificationDetailsEditor;
