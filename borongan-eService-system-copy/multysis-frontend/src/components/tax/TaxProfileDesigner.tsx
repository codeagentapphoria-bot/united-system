// React imports
import React from 'react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

// Types
import type { FieldMetadata } from '@/services/api/service.service';
import type { TaxConfiguration } from '@/types/tax';

// Components
import { AdjustmentRulesBuilder } from './AdjustmentRulesBuilder';
import { FieldPathInput } from './FieldPathInput';

interface TaxProfileDesignerProps {
  configuration: TaxConfiguration;
  onChange: (configuration: TaxConfiguration) => void;
  onSave?: () => void;
  serviceFields?: FieldMetadata[];
}

export const TaxProfileDesigner: React.FC<TaxProfileDesignerProps> = ({
  configuration,
  onChange,
  serviceFields = [],
}) => {
  // const [sampleData, setSampleData] = useState<Record<string, number>>({});

  const updateInputs = (index: number, field: string, value: any) => {
    const newInputs = [...configuration.inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    onChange({ ...configuration, inputs: newInputs });
  };

  const addInput = () => {
    onChange({
      ...configuration,
      inputs: [
        ...configuration.inputs,
        { name: '', field: '', type: 'number', required: false },
      ],
    });
  };

  const removeInput = (index: number) => {
    const newInputs = configuration.inputs.filter((_, i) => i !== index);
    onChange({ ...configuration, inputs: newInputs });
  };

  const updateDerivedValue = (index: number, field: string, value: any) => {
    const newDerivedValues = [...configuration.derivedValues];
    newDerivedValues[index] = { ...newDerivedValues[index], [field]: value };
    onChange({ ...configuration, derivedValues: newDerivedValues });
  };

  const addDerivedValue = () => {
    onChange({
      ...configuration,
      derivedValues: [
        ...configuration.derivedValues,
        { name: '', formula: '', description: '' },
      ],
    });
  };

  const removeDerivedValue = (index: number) => {
    const newDerivedValues = configuration.derivedValues.filter((_, i) => i !== index);
    onChange({ ...configuration, derivedValues: newDerivedValues });
  };

  const updateFinalTax = (field: string, value: any) => {
    onChange({
      ...configuration,
      finalTax: { ...configuration.finalTax, [field]: value },
    });
  };

  const updateAdjustmentRules = (rules: any[]) => {
    onChange({
      ...configuration,
      adjustmentRules: rules,
    });
  };

  return (
    <div className="space-y-6">
      {/* Inputs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inputs</CardTitle>
            <Button size="sm" onClick={addInput}>
              Add Input
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field Name</TableHead>
                <TableHead>Field Path</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configuration.inputs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No inputs defined
                  </TableCell>
                </TableRow>
              ) : (
                configuration.inputs.map((input, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={input.name}
                        onChange={(e) => updateInputs(index, 'name', e.target.value)}
                        placeholder="e.g., Market Value"
                      />
                    </TableCell>
                    <TableCell>
                      <FieldPathInput
                        value={input.field}
                        onChange={(value) => updateInputs(index, 'field', value)}
                        availableFields={serviceFields}
                        expectedType={input.type}
                        required={input.required}
                        placeholder="e.g., marketValue or property.marketValue"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={input.type}
                        onChange={(e) => updateInputs(index, 'type', e.target.value)}
                        placeholder="number"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={input.required || false}
                        onChange={(e) => updateInputs(index, 'required', e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeInput(index)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Derived Values Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Derived Values</CardTitle>
            <Button size="sm" onClick={addDerivedValue}>
              Add Derived Value
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configuration.derivedValues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    No derived values defined
                  </TableCell>
                </TableRow>
              ) : (
                configuration.derivedValues.map((derived, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={derived.name}
                        onChange={(e) => updateDerivedValue(index, 'name', e.target.value)}
                        placeholder="e.g., Assessed Value"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={derived.formula}
                        onChange={(e) => updateDerivedValue(index, 'formula', e.target.value)}
                        placeholder="e.g., ${property.marketValue} * 0.2"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={derived.description || ''}
                        onChange={(e) => updateDerivedValue(index, 'description', e.target.value)}
                        placeholder="Optional description"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeDerivedValue(index)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Final Tax */}
      <Card>
        <CardHeader>
          <CardTitle>Final Tax Formula</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Formula</Label>
            <Input
              value={configuration.finalTax.formula}
              onChange={(e) => updateFinalTax('formula', e.target.value)}
              placeholder="e.g., ${assessedValue} * 0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={configuration.finalTax.description || ''}
              onChange={(e) => updateFinalTax('description', e.target.value)}
              placeholder="Description of the final tax calculation"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Rules */}
      <AdjustmentRulesBuilder
        rules={configuration.adjustmentRules || []}
        inputs={configuration.inputs}
        onChange={updateAdjustmentRules}
      />

      {/* {onSave && (
        <div className="flex justify-end">
          <Button onClick={onSave}>Save Configuration</Button>
        </div>
      )} */}
    </div>
  );
};

