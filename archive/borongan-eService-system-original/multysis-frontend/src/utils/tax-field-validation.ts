import type { FieldMetadata } from '@/services/api/service.service';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  field?: FieldMetadata;
}

/**
 * Extracts the base field name from a field path
 * Handles nested paths: "property.marketValue" -> "marketValue"
 * Handles flat paths: "marketValue" -> "marketValue"
 */
export function extractFieldName(fieldPath: string): string {
  if (!fieldPath) return '';
  
  const parts = fieldPath.split('.');
  return parts[parts.length - 1];
}

/**
 * Validates if a field path exists in the service fields
 * Returns validation result with field metadata if valid
 */
export function validateFieldPath(
  fieldPath: string,
  serviceFields: FieldMetadata[]
): ValidationResult {
  if (!fieldPath || !fieldPath.trim()) {
    return {
      valid: false,
      error: 'Field path is required',
    };
  }

  // For flat paths, check if the field name exists
  const baseFieldName = extractFieldName(fieldPath);
  const field = serviceFields.find(f => f.name === baseFieldName);

  if (!field) {
    // Try to find similar field names for suggestion
    const suggestions = getFieldSuggestions(baseFieldName, serviceFields);
    const suggestionText = suggestions.length > 0
      ? ` Did you mean: ${suggestions.slice(0, 3).map(s => s.name).join(', ')}?`
      : '';

    return {
      valid: false,
      error: `Field "${baseFieldName}" not found in service fields.${suggestionText}`,
    };
  }

  return {
    valid: true,
    field,
  };
}

/**
 * Checks type compatibility between field path and expected type
 * Maps service field types to tax profile types
 */
export function checkTypeCompatibility(
  fieldPath: string,
  expectedType: string,
  serviceFields: FieldMetadata[]
): boolean {
  const validation = validateFieldPath(fieldPath, serviceFields);
  
  if (!validation.valid || !validation.field) {
    return false;
  }

  const fieldType = validation.field.type;
  const normalizedExpectedType = expectedType.toLowerCase();

  // Type mapping from service field types to tax profile types
  const typeMap: Record<string, string[]> = {
    number: ['number'],
    text: ['string', 'text'],
    textarea: ['string', 'text'],
    date: ['string', 'date'],
    select: ['string'],
    checkbox: ['boolean'],
    file: ['string'],
  };

  // Check if the field type is compatible with expected type
  const compatibleTypes = typeMap[fieldType] || [];
  
  return compatibleTypes.includes(normalizedExpectedType) || 
         fieldType === normalizedExpectedType;
}

/**
 * Gets field suggestions based on partial path input
 * Filters by name, label, or type using fuzzy matching
 */
export function getFieldSuggestions(
  partialPath: string,
  serviceFields: FieldMetadata[]
): FieldMetadata[] {
  if (!partialPath || !partialPath.trim()) {
    return serviceFields;
  }

  const searchTerm = partialPath.toLowerCase().trim();
  const baseFieldName = extractFieldName(searchTerm);

  // Simple string similarity matching
  const matches = serviceFields.filter(field => {
    const fieldName = field.name.toLowerCase();
    const fieldLabel = (field.label || '').toLowerCase();

    return (
      fieldName.includes(baseFieldName) ||
      fieldLabel.includes(searchTerm) ||
      fieldName.startsWith(baseFieldName) ||
      // Levenshtein distance-like check for close matches
      Math.abs(fieldName.length - baseFieldName.length) <= 2 &&
      (fieldName.includes(baseFieldName.slice(0, 3)) || baseFieldName.includes(fieldName.slice(0, 3)))
    );
  });

  // Sort by relevance (exact match > starts with > contains)
  return matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    if (aName === baseFieldName) return -1;
    if (bName === baseFieldName) return 1;
    if (aName.startsWith(baseFieldName) && !bName.startsWith(baseFieldName)) return -1;
    if (!aName.startsWith(baseFieldName) && bName.startsWith(baseFieldName)) return 1;
    
    return aName.localeCompare(bName);
  });
}

/**
 * Validates field path with type checking
 * Returns comprehensive validation result
 */
export function validateFieldPathWithType(
  fieldPath: string,
  expectedType: string | undefined,
  serviceFields: FieldMetadata[]
): ValidationResult {
  const basicValidation = validateFieldPath(fieldPath, serviceFields);
  
  if (!basicValidation.valid) {
    return basicValidation;
  }

  if (expectedType && basicValidation.field) {
    const typeCompatible = checkTypeCompatibility(fieldPath, expectedType, serviceFields);
    
    if (!typeCompatible) {
      return {
        valid: false,
        error: `Type mismatch: field "${basicValidation.field.name}" is of type "${basicValidation.field.type}", but "${expectedType}" is expected`,
        field: basicValidation.field,
      };
    }
  }

  return basicValidation;
}
