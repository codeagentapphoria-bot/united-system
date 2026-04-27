/**
 * ResidentClassificationsForm.tsx
 *
 * Classification assignment form used in the admin registration workflow.
 * Mirrors the BIMS ResidentClassificationsForm.jsx, ported to TypeScript
 * with E-Service UI components and hooks.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClassificationTypes } from '@/hooks/useClassificationTypes';
import { useAmeliorationSettings } from '@/hooks/useAmeliorationSettings';
import ClassificationGuide from '@/components/ui/ClassificationGuide';
import { BadgeCheck, User } from 'lucide-react';

// =============================================================================
// FORM SCHEMA
// =============================================================================

const classificationsSchema = z.object({
  classifications: z.array(z.string()).optional(),
  classificationDetails: z.record(z.any()).optional(),
});

type ClassificationsFormValues = z.infer<typeof classificationsSchema>;

// =============================================================================
// TYPES
// =============================================================================

export interface ResidentInfo {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  barangay?: {
    id?: number;
    name?: string;
    municipality?: {
      id?: number;
      name?: string;
    };
  };
  classifications?: Array<{
    classification_id?: number;
    classification_type?: string;
    classification?: string;
    classification_details?: string | Record<string, unknown>;
  }>;
}

export interface ClassificationTypeOption {
  key: string;
  label: string;
  color: string;
  description: string;
  details: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'amelioration_select' | 'amelioration_multiselect';
    options?: Array<{ value: string; label: string }>;
    settingType?: string;
    filterIds?: string[];
  }>;
}

interface ResidentClassificationsFormProps {
  /** The resident to classify */
  resident: ResidentInfo;
  /** Callback when form is submitted with validated data */
  onSubmit: (data: { classifications: Array<{ type: string; details: Record<string, unknown> | null }> }) => Promise<void>;
  /** Callback when Cancel is clicked */
  onCancel: () => void;
  /** Pass pre-fetched classification options (optional) */
  classificationOptions?: ClassificationTypeOption[];
  /** Municipality ID for fetching classification types */
  municipalityId: number;
  /** Show the resident info card (hide when modal already displays name) */
  showResidentInfo?: boolean;
  /** Show action buttons */
  showActions?: boolean;
  /** Optional form id for external submission */
  formId?: string;
  /** Loading state (e.g. parent is submitting) */
  loading?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

const ResidentClassificationsForm = ({
  resident,
  onSubmit,
  onCancel,
  classificationOptions,
  municipalityId,
  showResidentInfo = true,
  showActions = true,
  formId,
  loading = false,
}: ResidentClassificationsFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localClassificationOptions, setLocalClassificationOptions] = useState<ClassificationTypeOption[]>([]);

  const { classificationTypes, loading: typesLoading } = useClassificationTypes(municipalityId);
  const { getSettingsByType } = useAmeliorationSettings();

  const form = useForm<ClassificationsFormValues>({
    resolver: zodResolver(classificationsSchema),
    defaultValues: {
      classifications: [],
      classificationDetails: {},
    },
    mode: 'onTouched',
  });

  // Populate classification options from prop or from API
  useEffect(() => {
    if (classificationOptions && classificationOptions.length > 0) {
      setLocalClassificationOptions(classificationOptions);
      return;
    }

    if (classificationTypes && classificationTypes.length > 0) {
      const options: ClassificationTypeOption[] = classificationTypes.map((type) => ({
        key: type.key,
        label: type.label,
        color: type.color,
        description: type.description,
        details: type.details ?? [],
      }));
      setLocalClassificationOptions(options);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classificationTypes]);

  // Normalize a classification value against available options
  const normalizeClassificationValue = (value: string, options: ClassificationTypeOption[]): string => {
    if (!value) return '';
    const normalizedValue = value.toLowerCase();
    const matchingOption = options.find(
      (opt) => opt.key.toLowerCase() === normalizedValue || opt.label.toLowerCase() === normalizedValue
    );
    return matchingOption ? matchingOption.key : value;
  };

  // Populate form when resident data changes
  useEffect(() => {
    if (!resident || !resident.classifications || resident.classifications.length === 0) return;

    const currentClassifications = (resident.classifications as Array<{ classification_type?: string; classification?: string }>).map((c) => {
      const classificationValue = c.classification_type || c.classification || (c as unknown as string);
      return normalizeClassificationValue(classificationValue, localClassificationOptions);
    });

    // Extract classification details
    const classificationDetails: Record<string, Record<string, unknown>> = {};
    (resident.classifications as Array<{ classification_type?: string; classification?: string; classification_details?: string | Record<string, unknown> }>).forEach((c) => {
      const classificationKey = c.classification_type || c.classification || (c as unknown as string);
      const normalizedKey = normalizeClassificationValue(classificationKey, localClassificationOptions);

      if (c.classification_details) {
        if (typeof c.classification_details === 'string') {
          // Handle pipe-separated string format
          const detailsArray = c.classification_details.split('|').map((s) => s.trim());
          const option = localClassificationOptions.find((opt) => opt.key === normalizedKey);
          if (option?.details) {
            option.details.forEach((detail, index) => {
              if (detailsArray[index]) {
                if (!classificationDetails[normalizedKey]) {
                  classificationDetails[normalizedKey] = {};
                }
                classificationDetails[normalizedKey][detail.key] = detailsArray[index];
              }
            });
          }
        } else if (typeof c.classification_details === 'object') {
          // Handle object format
          if (!classificationDetails[normalizedKey]) {
            classificationDetails[normalizedKey] = {};
          }
          Object.assign(classificationDetails[normalizedKey], c.classification_details);
        }
      }
    });

    form.reset({
      classifications: currentClassifications,
      classificationDetails: classificationDetails,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resident, localClassificationOptions]);

  const handleSubmit = async (data: ClassificationsFormValues) => {
    setIsSubmitting(true);
    try {
      const transformedData = {
        classifications: (data.classifications ?? []).map((classification) => {
          const details = data.classificationDetails?.[classification] ?? {};
          const option = localClassificationOptions.find((opt) => opt.key === classification);
          return {
            type: option ? option.label : classification,
            details: Object.keys(details).length > 0 ? details : null,
          };
        }),
      };
      await onSubmit(transformedData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClassificationChange = (classification: string, checked: boolean) => {
    const currentClassifications = form.watch('classifications') ?? [];
    const currentDetails = form.watch('classificationDetails') ?? {};

    if (checked) {
      form.setValue('classifications', [...currentClassifications, classification], { shouldValidate: true });
      if (!currentDetails[classification]) {
        form.setValue('classificationDetails', {
          ...currentDetails,
          [classification]: {},
        });
      }
    } else {
      form.setValue(
        'classifications',
        currentClassifications.filter((c) => c !== classification)
      );
      const newDetails = { ...currentDetails };
      delete newDetails[classification];
      form.setValue('classificationDetails', newDetails);
    }
  };

  const handleDetailChange = (classification: string, detailKey: string, value: unknown) => {
    const currentDetails = form.watch('classificationDetails') ?? {};
    form.setValue('classificationDetails', {
      ...currentDetails,
      [classification]: {
        ...currentDetails[classification],
        [detailKey]: value,
      },
    });
  };

  const renderDetailField = (classification: string, detail: ClassificationTypeOption['details'][number]) => {
    const currentDetails = form.watch('classificationDetails') ?? {};
    const currentValue = currentDetails[classification]?.[detail.key];

    // Dropdown loaded from social_amelioration_settings (single select)
    if (detail.type === 'amelioration_select' && detail.settingType) {
      const allOptions = getSettingsByType(detail.settingType as 'DISABILITY_TYPE' | 'GRADE_LEVEL' | 'SOLO_PARENT_CATEGORY' | 'PENSION_TYPE');
      const options = detail.filterIds
        ? allOptions.filter((opt) => detail.filterIds?.includes(opt.id))
        : allOptions;
      return (
        <Select
          value={(currentValue as string) ?? ''}
          onValueChange={(value) => handleDetailChange(classification, detail.key, value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${detail.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Checkbox list loaded from social_amelioration_settings (multi-select)
    if (detail.type === 'amelioration_multiselect' && detail.settingType) {
      const options = getSettingsByType(detail.settingType as 'DISABILITY_TYPE' | 'GRADE_LEVEL' | 'SOLO_PARENT_CATEGORY' | 'PENSION_TYPE');
      const selectedIds = Array.isArray(currentValue) ? currentValue : [];
      return (
        <div className="grid grid-cols-1 gap-2 pt-1">
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center space-x-2">
              <Checkbox
                id={`${classification}-${detail.key}-${opt.id}`}
                checked={selectedIds.includes(opt.id)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selectedIds, opt.id]
                    : selectedIds.filter((v) => v !== opt.id);
                  handleDetailChange(classification, detail.key, next);
                }}
              />
              <Label
                htmlFor={`${classification}-${detail.key}-${opt.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {opt.name}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    // Static options select (e.g. disability level)
    if (detail.type === 'select' && detail.options) {
      return (
        <Select
          value={(currentValue as string) ?? ''}
          onValueChange={(value) => handleDetailChange(classification, detail.key, value)}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${detail.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {detail.options.map((option) => {
              const val = typeof option === 'string' ? option : option.value;
              const lbl = typeof option === 'string' ? option : option.label;
              return (
                <SelectItem key={val} value={val}>
                  {lbl}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      );
    }

    // Text input (default)
    return (
      <Input
        placeholder={`Enter ${detail.label.toLowerCase()}`}
        value={(currentValue as string) ?? ''}
        onChange={(e) => handleDetailChange(classification, detail.key, e.target.value)}
      />
    );
  };

  const selectedClassifications = form.watch('classifications') ?? [];

  return (
    <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Resident Info Card */}
      {showResidentInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Resident Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Name</Label>
                <p className="font-medium">
                  {[resident.firstName, resident.middleName, resident.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim()}
                  {resident.suffix ? ` ${resident.suffix}` : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classifications Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" />
            Resident Classifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Select the classifications that apply to this resident. You can select multiple
              classifications.
            </p>

            {/* Classification Checkboxes */}
            {localClassificationOptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localClassificationOptions.map((option) => {
                  const isChecked = selectedClassifications.includes(option.key) ?? false;

                  return (
                    <div key={option.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.key}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleClassificationChange(option.key, !!checked)}
                      />
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: option.color || '#4CAF50' }}
                        />
                        <Label htmlFor={option.key} className="text-sm font-normal cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !typesLoading ? (
              <ClassificationGuide />
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="mt-2 text-gray-600">Loading classification types...</p>
              </div>
            )}

            {/* Classification Detail Fields */}
            {selectedClassifications.map((classification) => {
              const option = localClassificationOptions.find((opt) => opt.key === classification);
              if (!option || !option.details || option.details.length === 0) return null;

              return (
                <Card key={classification} className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">{option.label} Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {option.details.map((detail) => (
                        <div key={detail.key} className="space-y-2">
                          <Label htmlFor={`${classification}-${detail.key}`}>{detail.label}</Label>
                          {renderDetailField(classification, detail)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Selected Classifications Badges */}
            {selectedClassifications.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Selected Classifications:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedClassifications.map((classification) => {
                    const option = localClassificationOptions.find((opt) => opt.key === classification);
                    return option ? (
                      <Badge
                        key={classification}
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: option.color || '#4CAF50',
                          color: 'white',
                        }}
                      >
                        <BadgeCheck className="h-3 w-3 mr-1" />
                        {option.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="default" disabled={isSubmitting || loading}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </form>
  );
};

export default ResidentClassificationsForm;
