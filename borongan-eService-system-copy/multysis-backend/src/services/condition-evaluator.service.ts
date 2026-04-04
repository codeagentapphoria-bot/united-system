import { resolveFieldReference } from './tax-engine.service';

export interface Condition {
  field: string; // Field path in serviceData
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'notIn';
  value: any; // Value to compare against
}

/**
 * Evaluates a single condition against serviceData
 * Supports field references and nested field access
 */
export function evaluateCondition(condition: Condition, serviceData: Record<string, any>): boolean {
  const { field, operator, value } = condition;

  // Resolve field value from serviceData
  const fieldValue = resolveFieldReference(field, serviceData);

  // Validate array requirement upfront for in/notIn to ensure errors surface even when field is missing
  if (operator === 'in' || operator === 'notIn') {
    if (!Array.isArray(value)) {
      throw new Error(`Operator "${operator}" requires value to be an array`);
    }
  }

  // Handle null/undefined field values
  if (fieldValue === null || fieldValue === undefined) {
    // For == and != operators, we can still evaluate
    if (operator === '==') {
      return value === null || value === undefined;
    }
    if (operator === '!=') {
      return value !== null && value !== undefined;
    }
    // For other operators, null/undefined means condition fails
    return false;
  }

  // Evaluate based on operator
  switch (operator) {
    case '==':
      return fieldValue == value; // Use == for type coercion (e.g., "5" == 5)

    case '!=':
      return fieldValue != value;

    case '>':
      return Number(fieldValue) > Number(value);

    case '<':
      return Number(fieldValue) < Number(value);

    case '>=':
      return Number(fieldValue) >= Number(value);

    case '<=':
      return Number(fieldValue) <= Number(value);

    case 'in':
      // Value should be an array
      if (!Array.isArray(value)) {
        throw new Error('Operator "in" requires value to be an array');
      }
      return value.includes(fieldValue);

    case 'notIn':
      // Value should be an array
      if (!Array.isArray(value)) {
        throw new Error('Operator "notIn" requires value to be an array');
      }
      return !value.includes(fieldValue);

    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

/**
 * Evaluates multiple conditions with AND/OR logic
 * This will be used in Phase 3 for complex condition evaluation
 * For now, we support simple AND logic (all conditions must pass)
 */
export function evaluateConditions(
  conditions: Condition[],
  serviceData: Record<string, any>,
  logic: 'AND' | 'OR' = 'AND'
): boolean {
  if (conditions.length === 0) {
    return true; // No conditions means always true
  }

  if (logic === 'AND') {
    // All conditions must pass
    return conditions.every((condition) => evaluateCondition(condition, serviceData));
  } else {
    // OR: At least one condition must pass
    return conditions.some((condition) => evaluateCondition(condition, serviceData));
  }
}
