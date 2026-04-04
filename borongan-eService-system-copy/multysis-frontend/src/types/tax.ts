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

export interface TaxBreakdown {
  steps: Array<{
    description: string;
    calculation: string;
    amount: number;
  }>;
  totalTax: number;
}

