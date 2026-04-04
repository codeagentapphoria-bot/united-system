import { evaluate, create, all } from 'mathjs';

// Create a restricted mathjs instance with only safe operations
const math = create(all);

// Remove unsafe functions
const unsafeFunctions = ['import', 'createUnitClass', 'evaluate', 'parse', 'compile', 'replacer'];
unsafeFunctions.forEach((fn) => {
  delete (math as any)[fn];
});

// Only allow safe functions
const safeFunctions = ['min', 'max', 'round', 'floor', 'ceil', 'abs'];
const restrictedScope: Record<string, any> = {};

safeFunctions.forEach((fn) => {
  restrictedScope[fn] = math[fn as keyof typeof math];
});

export interface AdjustmentRule {
  type: 'EXEMPTION' | 'DISCOUNT' | 'PENALTY';
  name: string;
  description?: string;
  priority: number; // Lower = applied first
  condition: {
    field: string; // Field path in serviceData
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'notIn';
    value: any; // Value to compare against
  };
  amount?: number; // Fixed amount
  percentage?: number; // Percentage (for discounts/penalties)
  maxAmount?: number; // Cap for percentage-based adjustments
}

export interface AdjustmentBreakdown {
  applied: Array<{
    rule: AdjustmentRule;
    amount: number;
    description: string;
  }>;
  skipped: Array<{
    rule: AdjustmentRule;
    reason: string;
  }>;
}

export interface TaxComputationResult {
  inputs: Record<string, any>;
  derivedValues: Record<string, number>;
  breakdown: TaxBreakdown;
  totalTax: number;
  adjustedTax?: number; // Final tax after adjustments
  adjustments?: AdjustmentBreakdown; // Breakdown of applied adjustments
}

export interface TaxBreakdown {
  steps: Array<{
    description: string;
    calculation: string;
    amount: number;
  }>;
  totalTax: number;
}

export interface TaxConfiguration {
  inputs: Array<{
    name: string;
    field: string; // Field path in serviceData
    type: string;
    required?: boolean;
  }>;
  derivedValues: Array<{
    name: string;
    formula: string; // Formula expression
    description?: string;
  }>;
  finalTax: {
    formula: string; // Final tax calculation formula
    description?: string;
  };
  adjustmentRules?: AdjustmentRule[]; // Optional adjustment rules
}

/**
 * Finds the closest matching field name from available fields
 * Uses simple string similarity (Levenshtein-like) for suggestions
 */
function findClosestFieldName(missingPath: string, availableFields: string[]): string | null {
  if (availableFields.length === 0) {
    return null;
  }

  const baseFieldName = missingPath.split('.').pop() || missingPath;
  const baseFieldNameLower = baseFieldName.toLowerCase();

  // First, try exact match (case-insensitive)
  const exactMatch = availableFields.find((field) => field.toLowerCase() === baseFieldNameLower);
  if (exactMatch) {
    return exactMatch;
  }

  // Then try starts with match
  const startsWithMatch = availableFields.find(
    (field) =>
      field.toLowerCase().startsWith(baseFieldNameLower) ||
      baseFieldNameLower.startsWith(field.toLowerCase())
  );
  if (startsWithMatch) {
    return startsWithMatch;
  }

  // Then try contains match
  const containsMatch = availableFields.find(
    (field) =>
      field.toLowerCase().includes(baseFieldNameLower) ||
      baseFieldNameLower.includes(field.toLowerCase())
  );
  if (containsMatch) {
    return containsMatch;
  }

  // Simple Levenshtein distance approximation
  let closestField: string | null = null;
  let minDistance = Infinity;

  for (const field of availableFields) {
    const fieldLower = field.toLowerCase();
    // Calculate simple edit distance
    let distance = 0;
    const maxLen = Math.max(baseFieldNameLower.length, fieldLower.length);

    for (let i = 0; i < maxLen; i++) {
      if (
        baseFieldNameLower[i] !== fieldLower[i] &&
        i < baseFieldNameLower.length &&
        i < fieldLower.length
      ) {
        distance++;
      }
    }

    // Add length difference penalty
    distance += Math.abs(baseFieldNameLower.length - fieldLower.length);

    if (distance < minDistance && distance <= 3) {
      minDistance = distance;
      closestField = field;
    }
  }

  return closestField;
}

/**
 * Gets available field names from serviceData (flat structure only)
 */
function getAvailableFieldNames(serviceData: Record<string, any>): string[] {
  if (!serviceData || typeof serviceData !== 'object') {
    return [];
  }

  return Object.keys(serviceData).filter((key) => {
    const value = serviceData[key];
    // Only include primitive values and null for flat structures
    return value === null || typeof value !== 'object' || Array.isArray(value);
  });
}

/**
 * Resolves a field reference from serviceData
 * Supports nested field access (e.g., "property.marketValue")
 */
export function resolveFieldReference(fieldPath: string, serviceData: Record<string, any>): any {
  if (!serviceData) {
    return undefined;
  }

  const parts = fieldPath.split('.');
  let value: any = serviceData;

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[part];
  }

  return value;
}

/**
 * Evaluates a formula safely using mathjs with restricted scope
 * Supports field references from serviceData
 */
export function evaluateFormula(formula: string, context: Record<string, any>): number {
  if (!formula || typeof formula !== 'string') {
    throw new Error('Formula must be a non-empty string');
  }

  // Replace field references with actual values
  // Field references are in the format: ${fieldPath}
  let processedFormula = formula;
  const fieldRegex = /\$\{([^}]+)\}/g;
  const matches = formula.matchAll(fieldRegex);

  for (const match of matches) {
    const fieldPath = match[1];
    const value = resolveFieldReference(fieldPath, context);

    if (value === undefined || value === null) {
      // Get available fields for better error message
      const availableFields = getAvailableFieldNames(context);
      const suggestion = findClosestFieldName(fieldPath, availableFields);

      let errorMessage = `Field reference "${fieldPath}" not found in context`;

      if (availableFields.length > 0) {
        errorMessage += `. Available fields: ${availableFields.slice(0, 10).join(', ')}${availableFields.length > 10 ? '...' : ''}`;
      }

      if (suggestion) {
        errorMessage += `. Did you mean "${suggestion}"?`;
      } else if (value === null) {
        errorMessage += ` (field exists but is null)`;
      } else {
        errorMessage += ` (field does not exist)`;
      }

      throw new Error(errorMessage);
    }

    // Convert to number if possible
    const numValue = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(numValue)) {
      const valueType = Array.isArray(value) ? 'array' : typeof value;
      throw new Error(
        `Field reference "${fieldPath}" is not a valid number (got type: ${valueType}, value: ${JSON.stringify(value)})`
      );
    }

    processedFormula = processedFormula.replace(match[0], String(numValue));
  }

  try {
    // Evaluate using restricted scope
    const result = evaluate(processedFormula, restrictedScope);

    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      throw new Error('Formula evaluation resulted in invalid number');
    }

    return result;
  } catch (error: any) {
    throw new Error(`Formula evaluation failed: ${error.message}`);
  }
}

/**
 * Computes tax based on tax profile version configuration
 */
export function computeTax(
  configuration: TaxConfiguration,
  serviceData: Record<string, any>
): TaxComputationResult {
  const inputs: Record<string, any> = {};
  const derivedValues: Record<string, number> = {};
  const breakdownSteps: Array<{ description: string; calculation: string; amount: number }> = [];

  // Step 1: Extract inputs from serviceData
  for (const input of configuration.inputs) {
    const value = resolveFieldReference(input.field, serviceData);

    if (input.required && (value === undefined || value === null)) {
      const availableFields = getAvailableFieldNames(serviceData);
      const suggestion = findClosestFieldName(input.field, availableFields);

      let errorMessage = `Required input field "${input.field}" is missing`;

      if (value === null) {
        errorMessage += ' (field exists but is null)';
      } else {
        errorMessage += ' (field does not exist)';
      }

      if (availableFields.length > 0) {
        errorMessage += `. Available fields: ${availableFields.slice(0, 10).join(', ')}${availableFields.length > 10 ? '...' : ''}`;
      }

      if (suggestion) {
        errorMessage += `. Did you mean "${suggestion}"?`;
      }

      throw new Error(errorMessage);
    }

    inputs[input.name] = value;
  }

  // Step 2: Compute derived values
  const computationContext: Record<string, any> = { ...inputs, ...derivedValues };

  for (const derived of configuration.derivedValues) {
    try {
      const value = evaluateFormula(derived.formula, computationContext);
      derivedValues[derived.name] = value;
      computationContext[derived.name] = value;

      breakdownSteps.push({
        description: derived.description || derived.name,
        calculation: derived.formula,
        amount: value,
      });
    } catch (error: any) {
      throw new Error(`Failed to compute derived value "${derived.name}": ${error.message}`);
    }
  }

  // Step 3: Compute final tax
  let totalTax: number;
  try {
    totalTax = evaluateFormula(configuration.finalTax.formula, computationContext);
  } catch (error: any) {
    throw new Error(`Failed to compute final tax: ${error.message}`);
  }

  breakdownSteps.push({
    description: configuration.finalTax.description || 'Total Tax',
    calculation: configuration.finalTax.formula,
    amount: totalTax,
  });

  const breakdown: TaxBreakdown = {
    steps: breakdownSteps,
    totalTax,
  };

  return {
    inputs,
    derivedValues,
    breakdown,
    totalTax,
  };
}
