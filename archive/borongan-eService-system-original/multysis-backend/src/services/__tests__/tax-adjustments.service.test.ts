import { applyAdjustments } from '../tax-adjustments.service';
import type { TaxConfiguration, AdjustmentRule } from '../tax-engine.service';

describe('Tax Adjustments Service', () => {
  const baseTax = 10000;
  const serviceData = {
    propertyType: 'Residential',
    marketValue: 1000000,
    isSeniorCitizen: true,
    area: 500,
  };

  const createBaseConfiguration = (): TaxConfiguration => ({
    inputs: [],
    derivedValues: [],
    finalTax: { formula: '10000' },
  });

  describe('Priority ordering', () => {
    it('should apply adjustments in priority order (lower priority first)', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT',
            name: 'Discount 2',
            priority: 2,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            percentage: 10,
          },
          {
            type: 'DISCOUNT',
            name: 'Discount 1',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            percentage: 5,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      // First discount: 10000 * 0.05 = 500, new tax = 9500
      // Second discount: 9500 * 0.10 = 950, new tax = 8550
      expect(result.adjustedTax).toBe(8550);
      expect(result.discountsApplied).toHaveLength(2);
      expect(result.discountsApplied[0]).toBe('Discount 1');
      expect(result.discountsApplied[1]).toBe('Discount 2');
    });
  });

  describe('Condition evaluation', () => {
    it('should apply rule when condition passes', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT',
            name: 'Residential Discount',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            percentage: 10,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(9000);
      expect(result.breakdown.applied).toHaveLength(1);
      expect(result.breakdown.skipped).toHaveLength(0);
    });

    it('should skip rule when condition fails', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT',
            name: 'Commercial Discount',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Commercial' },
            percentage: 10,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(baseTax);
      expect(result.breakdown.applied).toHaveLength(0);
      expect(result.breakdown.skipped).toHaveLength(1);
      expect(result.breakdown.skipped[0].reason).toContain('Condition not met');
    });
  });

  describe('Exemption application', () => {
    it('should apply approved exemptions', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'EXEMPTION',
            name: 'Senior Citizen Exemption',
            priority: 1,
            condition: { field: 'isSeniorCitizen', operator: '==', value: true },
            amount: 2000,
          },
        ],
      };

      const approvedExemptions = [{ id: 'exemption-1', amount: 2000 }];

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
        approvedExemptions,
      });

      expect(result.adjustedTax).toBe(8000);
      expect(result.exemptionsApplied).toContain('Senior Citizen Exemption');
    });

    it('should skip exemption if not approved', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'EXEMPTION',
            name: 'Senior Citizen Exemption',
            priority: 1,
            condition: { field: 'isSeniorCitizen', operator: '==', value: true },
            amount: 2000,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
        approvedExemptions: [], // No approved exemptions
      });

      expect(result.adjustedTax).toBe(baseTax);
      expect(result.breakdown.skipped).toHaveLength(1);
      expect(result.breakdown.skipped[0].reason).toContain('Exemption not approved');
    });
  });

  describe('Discount application', () => {
    it('should apply percentage-based discount', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT',
            name: 'Early Payment Discount',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            percentage: 15,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(8500); // 10000 - (10000 * 0.15)
      expect(result.discountsApplied).toContain('Early Payment Discount');
    });

    it('should apply fixed amount discount', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT',
            name: 'Fixed Discount',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            amount: 1000,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(9000);
    });

    it('should apply max amount cap for percentage discount', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT',
            name: 'Capped Discount',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            percentage: 50, // Would be 5000
            maxAmount: 2000, // But capped at 2000
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(8000); // 10000 - 2000
    });

    it('should skip discount if neither percentage nor amount provided', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT',
            name: 'Invalid Discount',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
          } as AdjustmentRule,
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(baseTax);
      expect(result.breakdown.skipped).toHaveLength(1);
      expect(result.breakdown.skipped[0].reason).toContain('must have either percentage or amount');
    });
  });

  describe('Penalty application', () => {
    it('should apply percentage-based penalty', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'PENALTY',
            name: 'Late Payment Penalty',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            percentage: 10,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(11000); // 10000 + (10000 * 0.10)
      expect(result.penaltiesApplied).toContain('Late Payment Penalty');
    });

    it('should apply fixed amount penalty', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'PENALTY',
            name: 'Fixed Penalty',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            amount: 500,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(10500);
    });

    it('should apply max amount cap for percentage penalty', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'PENALTY',
            name: 'Capped Penalty',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            percentage: 50, // Would be 5000
            maxAmount: 1000, // But capped at 1000
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(11000); // 10000 + 1000
    });
  });

  describe('Multiple adjustments', () => {
    it('should apply exemption, discount, and penalty in sequence', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'EXEMPTION',
            name: 'Exemption',
            priority: 1,
            condition: { field: 'isSeniorCitizen', operator: '==', value: true },
            amount: 1000,
          },
          {
            type: 'DISCOUNT',
            name: 'Discount',
            priority: 2,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            percentage: 10,
          },
          {
            type: 'PENALTY',
            name: 'Penalty',
            priority: 3,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            amount: 200,
          },
        ],
      };

      const approvedExemptions = [{ id: 'exemption-1', amount: 1000 }];

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
        approvedExemptions,
      });

      // Exemption: 10000 - 1000 = 9000
      // Discount: 9000 - (9000 * 0.10) = 8100
      // Penalty: 8100 + 200 = 8300
      expect(result.adjustedTax).toBe(8300);
      expect(result.exemptionsApplied).toHaveLength(1);
      expect(result.discountsApplied).toHaveLength(1);
      expect(result.penaltiesApplied).toHaveLength(1);
    });
  });

  describe('Negative tax prevention', () => {
    it('should not allow tax to go below zero', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'EXEMPTION',
            name: 'Large Exemption',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            amount: 15000, // More than base tax
          },
        ],
      };

      const approvedExemptions = [{ id: 'exemption-1', amount: 15000 }];

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
        approvedExemptions,
      });

      expect(result.adjustedTax).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle condition evaluation errors gracefully', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT',
            name: 'Invalid Condition',
            priority: 1,
            condition: {
              field: 'nonExistent',
              operator: 'in' as any,
              value: 'not an array', // Will cause error
            },
            percentage: 10,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(baseTax);
      expect(result.breakdown.skipped).toHaveLength(1);
      expect(result.breakdown.skipped[0].reason).toContain('Error evaluating condition');
    });

    it('should skip unknown adjustment types', () => {
      const configuration: TaxConfiguration = {
        ...createBaseConfiguration(),
        adjustmentRules: [
          {
            type: 'UNKNOWN' as any,
            name: 'Unknown Type',
            priority: 1,
            condition: { field: 'propertyType', operator: '==', value: 'Residential' },
            amount: 1000,
          },
        ],
      };

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(baseTax);
      expect(result.breakdown.skipped).toHaveLength(1);
      expect(result.breakdown.skipped[0].reason).toContain('Unknown adjustment type');
    });
  });

  describe('Empty rules', () => {
    it('should return base tax when no adjustment rules', () => {
      const configuration = createBaseConfiguration();

      const result = applyAdjustments({
        baseTax,
        configuration,
        serviceData,
      });

      expect(result.adjustedTax).toBe(baseTax);
      expect(result.breakdown.applied).toHaveLength(0);
      expect(result.breakdown.skipped).toHaveLength(0);
    });
  });
});
