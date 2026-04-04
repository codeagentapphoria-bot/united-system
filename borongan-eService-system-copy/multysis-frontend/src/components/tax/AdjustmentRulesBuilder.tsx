// React imports
import React, { useState } from 'react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
import type { AdjustmentRule } from '@/types/tax';

// Utils
import { FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';

interface AdjustmentRulesBuilderProps {
  rules: AdjustmentRule[];
  inputs: Array<{ name: string; field: string }>;
  onChange: (rules: AdjustmentRule[]) => void;
}

export const AdjustmentRulesBuilder: React.FC<AdjustmentRulesBuilderProps> = ({
  rules,
  inputs,
  onChange,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingRule, setEditingRule] = useState<Partial<AdjustmentRule> | null>(null);

  const addRule = () => {
    const newRule: AdjustmentRule = {
      type: 'DISCOUNT',
      name: '',
      description: '',
      priority: rules.length > 0 ? Math.max(...rules.map((r) => r.priority)) + 1 : 1,
      condition: {
        field: inputs[0]?.field || '',
        operator: '==',
        value: '',
      },
    };
    onChange([...rules, newRule]);
    setEditingIndex(rules.length);
    setEditingRule(newRule);
  };

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingRule(null);
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditingRule({ ...rules[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editingRule) return;

    const updatedRules = [...rules];
    updatedRules[editingIndex] = editingRule as AdjustmentRule;
    onChange(updatedRules);
    setEditingIndex(null);
    setEditingRule(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingRule(null);
  };

  const updateEditingRule = (updates: Partial<AdjustmentRule>) => {
    if (!editingRule) return;
    setEditingRule({ ...editingRule, ...updates });
  };

  const updateCondition = (updates: Partial<AdjustmentRule['condition']>) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      condition: { ...editingRule.condition!, ...updates },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Adjustment Rules</CardTitle>
          <Button onClick={addRule} size="sm" variant="outline">
            <FiPlus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No adjustment rules. Click "Add Rule" to create one.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Amount/Percentage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, index) => (
                <TableRow key={index}>
                  {editingIndex === index ? (
                    <>
                      <TableCell colSpan={6}>
                        <div className="space-y-4 p-4 border rounded-lg">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Type</Label>
                              <Select
                                value={editingRule?.type}
                                onValueChange={(value: any) =>
                                  updateEditingRule({ type: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="EXEMPTION">Exemption</SelectItem>
                                  <SelectItem value="DISCOUNT">Discount</SelectItem>
                                  <SelectItem value="PENALTY">Penalty</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Priority</Label>
                              <Input
                                type="number"
                                value={editingRule?.priority || 1}
                                onChange={(e) =>
                                  updateEditingRule({
                                    priority: parseInt(e.target.value) || 1,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={editingRule?.name || ''}
                              onChange={(e) =>
                                updateEditingRule({ name: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea
                              value={editingRule?.description || ''}
                              onChange={(e) =>
                                updateEditingRule({ description: e.target.value })
                              }
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Field</Label>
                              <Select
                                value={editingRule?.condition?.field || ''}
                                onValueChange={(value) =>
                                  updateCondition({ field: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {inputs.map((input) => (
                                    <SelectItem key={input.field} value={input.field}>
                                      {input.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Operator</Label>
                              <Select
                                value={editingRule?.condition?.operator || '=='}
                                onValueChange={(value: any) =>
                                  updateCondition({ operator: value })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="==">=</SelectItem>
                                  <SelectItem value="!=">!=</SelectItem>
                                  <SelectItem value=">">&gt;</SelectItem>
                                  <SelectItem value="<">&lt;</SelectItem>
                                  <SelectItem value=">=">&gt;=</SelectItem>
                                  <SelectItem value="<=">&lt;=</SelectItem>
                                  <SelectItem value="in">in</SelectItem>
                                  <SelectItem value="notIn">not in</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Value</Label>
                              <Input
                                value={editingRule?.condition?.value || ''}
                                onChange={(e) =>
                                  updateCondition({ value: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Amount (Fixed)</Label>
                              <Input
                                type="number"
                                value={editingRule?.amount || ''}
                                onChange={(e) =>
                                  updateEditingRule({
                                    amount: parseFloat(e.target.value) || undefined,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label>Percentage</Label>
                              <Input
                                type="number"
                                value={editingRule?.percentage || ''}
                                onChange={(e) =>
                                  updateEditingRule({
                                    percentage: parseFloat(e.target.value) || undefined,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Max Amount (for percentage)</Label>
                            <Input
                              type="number"
                              value={editingRule?.maxAmount || ''}
                              onChange={(e) =>
                                updateEditingRule({
                                  maxAmount: parseFloat(e.target.value) || undefined,
                                })
                              }
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={saveEdit} size="sm">
                              Save
                            </Button>
                            <Button onClick={cancelEdit} size="sm" variant="outline">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{rule.type}</TableCell>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>
                        {rule.condition.field} {rule.condition.operator}{' '}
                        {rule.condition.value}
                      </TableCell>
                      <TableCell>
                        {rule.amount
                          ? `₱${rule.amount}`
                          : rule.percentage
                          ? `${rule.percentage}%`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => startEdit(index)}
                            size="sm"
                            variant="ghost"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => removeRule(index)}
                            size="sm"
                            variant="ghost"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

