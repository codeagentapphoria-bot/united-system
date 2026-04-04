import {
  resolveFieldReference,
  evaluateFormula,
  computeTax,
  TaxConfiguration,
} from '../tax-engine.service';
import {
  createSampleTaxConfiguration,
  createComplexTaxConfiguration,
  createSampleServiceData,
  createNestedServiceData,
} from './helpers/test-factories';

describe('Tax Engine Service', () => {
  describe('resolveFieldReference', () => {
    it('should resolve simple field', () => {
      const serviceData = { marketValue: 500000 };
      const result = resolveFieldReference('marketValue', serviceData);
      expect(result).toBe(500000);
    });

    it('should resolve nested field', () => {
      const serviceData = {
        property: {
          marketValue: 500000,
        },
      };
      const result = resolveFieldReference('property.marketValue', serviceData);
      expect(result).toBe(500000);
    });

    it('should resolve deeply nested field', () => {
      const serviceData = {
        property: {
          details: {
            value: 500000,
          },
        },
      };
      const result = resolveFieldReference('property.details.value', serviceData);
      expect(result).toBe(500000);
    });

    it('should return undefined for missing field', () => {
      const serviceData = { marketValue: 500000 };
      const result = resolveFieldReference('nonExistent', serviceData);
      expect(result).toBeUndefined();
    });

    it('should return undefined for missing nested field', () => {
      const serviceData = { property: { value: 500000 } };
      const result = resolveFieldReference('property.nonExistent', serviceData);
      expect(result).toBeUndefined();
    });

    it('should handle null values', () => {
      const serviceData = { property: null };
      const result = resolveFieldReference('property.marketValue', serviceData);
      expect(result).toBeUndefined();
    });

    it('should handle undefined values', () => {
      const serviceData = { property: undefined };
      const result = resolveFieldReference('property.marketValue', serviceData);
      expect(result).toBeUndefined();
    });

    it('should handle null serviceData', () => {
      const result = resolveFieldReference('marketValue', null as any);
      expect(result).toBeUndefined();
    });

    it('should handle empty serviceData', () => {
      const result = resolveFieldReference('marketValue', {});
      expect(result).toBeUndefined();
    });
  });

  describe('evaluateFormula', () => {
    it('should evaluate basic addition', () => {
      const context = { a: 10, b: 20 };
      const result = evaluateFormula('${a} + ${b}', context);
      expect(result).toBe(30);
    });

    it('should evaluate basic subtraction', () => {
      const context = { a: 20, b: 10 };
      const result = evaluateFormula('${a} - ${b}', context);
      expect(result).toBe(10);
    });

    it('should evaluate basic multiplication', () => {
      const context = { a: 10, b: 5 };
      const result = evaluateFormula('${a} * ${b}', context);
      expect(result).toBe(50);
    });

    it('should evaluate basic division', () => {
      const context = { a: 20, b: 4 };
      const result = evaluateFormula('${a} / ${b}', context);
      expect(result).toBe(5);
    });

    it('should evaluate modulo', () => {
      const context = { a: 20, b: 3 };
      const result = evaluateFormula('${a} % ${b}', context);
      expect(result).toBe(2);
    });

    it('should evaluate complex formula', () => {
      const context = { marketValue: 500000 };
      const result = evaluateFormula('${marketValue} * 0.2', context);
      expect(result).toBe(100000);
    });

    it('should use safe functions - min', () => {
      const context = { a: 10, b: 20 };
      const result = evaluateFormula('min(${a}, ${b})', context);
      expect(result).toBe(10);
    });

    it('should use safe functions - max', () => {
      const context = { a: 10, b: 20 };
      const result = evaluateFormula('max(${a}, ${b})', context);
      expect(result).toBe(20);
    });

    it('should use safe functions - round', () => {
      const context = { a: 10.7 };
      const result = evaluateFormula('round(${a})', context);
      expect(result).toBe(11);
    });

    it('should use safe functions - floor', () => {
      const context = { a: 10.7 };
      const result = evaluateFormula('floor(${a})', context);
      expect(result).toBe(10);
    });

    it('should use safe functions - ceil', () => {
      const context = { a: 10.3 };
      const result = evaluateFormula('ceil(${a})', context);
      expect(result).toBe(11);
    });

    it('should use safe functions - abs', () => {
      const context = { a: -10 };
      const result = evaluateFormula('abs(${a})', context);
      expect(result).toBe(10);
    });

    it('should handle multiple field references', () => {
      const context = { a: 10, b: 20, c: 30 };
      const result = evaluateFormula('${a} + ${b} + ${c}', context);
      expect(result).toBe(60);
    });

    it('should throw error for missing field reference', () => {
      const context = { a: 10 };
      expect(() => {
        evaluateFormula('${a} + ${b}', context);
      }).toThrow('Field reference "b" not found in context');
    });

    it('should throw error for null field reference', () => {
      const context = { a: 10, b: null };
      expect(() => {
        evaluateFormula('${a} + ${b}', context);
      }).toThrow('Field reference "b" not found in context');
    });

    it('should throw error for non-numeric field reference', () => {
      const context = { a: 10, b: 'not a number' };
      expect(() => {
        evaluateFormula('${a} + ${b}', context);
      }).toThrow('Field reference "b" is not a valid number');
    });

    it('should throw error for invalid formula', () => {
      const context = { a: 10 };
      expect(() => {
        evaluateFormula('${a} +', context);
      }).toThrow('Formula evaluation failed');
    });

    it('should throw error for empty formula', () => {
      const context = { a: 10 };
      expect(() => {
        evaluateFormula('', context);
      }).toThrow('Formula must be a non-empty string');
    });

    it('should throw error for non-string formula', () => {
      const context = { a: 10 };
      expect(() => {
        evaluateFormula(null as any, context);
      }).toThrow('Formula must be a non-empty string');
    });

    it('should handle division by zero', () => {
      const context = { a: 10, b: 0 };
      // Division by zero results in Infinity, which is considered invalid
      expect(() => {
        evaluateFormula('${a} / ${b}', context);
      }).toThrow();
    });

    it('should handle parentheses', () => {
      const context = { a: 10, b: 20, c: 30 };
      const result = evaluateFormula('(${a} + ${b}) * ${c}', context);
      expect(result).toBe(900);
    });
  });

  describe('computeTax', () => {
    it('should compute tax with simple formula', () => {
      const config = createSampleTaxConfiguration();
      const serviceData = createSampleServiceData();

      const result = computeTax(config, serviceData);

      expect(result.inputs['Market Value']).toBe(500000);
      expect(result.derivedValues.assessedValue).toBe(100000);
      expect(result.totalTax).toBe(1000);
      expect(result.breakdown.steps).toHaveLength(2); // 1 derived + 1 final
      expect(result.breakdown.totalTax).toBe(1000);
    });

    it('should compute tax with multiple derived values', () => {
      const config = createComplexTaxConfiguration();
      const serviceData = createSampleServiceData();

      const result = computeTax(config, serviceData);

      expect(result.inputs['Market Value']).toBe(500000);
      expect(result.derivedValues.assessedValue).toBe(100000);
      expect(result.derivedValues.basicTax).toBe(1000);
      expect(result.derivedValues.sef).toBe(100);
      expect(result.totalTax).toBe(1100);
      expect(result.breakdown.steps).toHaveLength(4); // 3 derived + 1 final
    });

    it('should handle formula dependencies', () => {
      const config: TaxConfiguration = {
        inputs: [
          {
            name: 'base',
            field: 'base',
            type: 'number',
            required: true,
          },
        ],
        derivedValues: [
          {
            name: 'double',
            formula: '${base} * 2', // Use input name
          },
          {
            name: 'triple',
            formula: '${double} * 1.5',
          },
        ],
        finalTax: {
          formula: '${triple}',
        },
      };

      const serviceData = { base: 100 };

      const result = computeTax(config, serviceData);

      expect(result.derivedValues.double).toBe(200);
      expect(result.derivedValues.triple).toBe(300);
      expect(result.totalTax).toBe(300);
    });

    it('should throw error for missing required input', () => {
      const config = createSampleTaxConfiguration();
      const serviceData = {};

      expect(() => {
        computeTax(config, serviceData);
      }).toThrow('Required input field "marketValue" is missing');
    });

    it('should handle optional input', () => {
      const config: TaxConfiguration = {
        inputs: [
          {
            name: 'Market Value',
            field: 'marketValue',
            type: 'number',
            required: true,
          },
          {
            name: 'Property Type',
            field: 'propertyType',
            type: 'string',
            required: false,
          },
        ],
        derivedValues: [],
        finalTax: {
          formula: '${Market Value} * 0.01', // Use input name
        },
      };

      const serviceData = { marketValue: 500000 };

      const result = computeTax(config, serviceData);

      expect(result.totalTax).toBe(5000);
    });

    it('should throw error for invalid formula in derived value', () => {
      const config: TaxConfiguration = {
        inputs: [
          {
            name: 'Market Value',
            field: 'marketValue',
            type: 'number',
            required: true,
          },
        ],
        derivedValues: [
          {
            name: 'assessedValue',
            formula: '${marketValue} *', // Invalid formula
          },
        ],
        finalTax: {
          formula: '${assessedValue} * 0.01',
        },
      };

      const serviceData = createSampleServiceData();

      expect(() => {
        computeTax(config, serviceData);
      }).toThrow('Failed to compute derived value "assessedValue"');
    });

    it('should throw error for invalid formula in final tax', () => {
      const config: TaxConfiguration = {
        inputs: [
          {
            name: 'Market Value',
            field: 'marketValue',
            type: 'number',
            required: true,
          },
        ],
        derivedValues: [],
        finalTax: {
          formula: '${marketValue} *', // Invalid formula
        },
      };

      const serviceData = createSampleServiceData();

      expect(() => {
        computeTax(config, serviceData);
      }).toThrow('Failed to compute final tax');
    });

    it('should handle zero tax result', () => {
      const config: TaxConfiguration = {
        inputs: [
          {
            name: 'Market Value',
            field: 'marketValue',
            type: 'number',
            required: true,
          },
        ],
        derivedValues: [],
        finalTax: {
          formula: '0',
        },
      };

      const serviceData = createSampleServiceData();

      const result = computeTax(config, serviceData);

      expect(result.totalTax).toBe(0);
    });

    it('should handle negative result', () => {
      const config: TaxConfiguration = {
        inputs: [
          {
            name: 'Market Value',
            field: 'marketValue',
            type: 'number',
            required: true,
          },
        ],
        derivedValues: [],
        finalTax: {
          formula: '-${Market Value}', // Use input name
        },
      };

      const serviceData = createSampleServiceData();

      const result = computeTax(config, serviceData);

      expect(result.totalTax).toBe(-500000);
    });

    it('should handle nested field paths', () => {
      const config: TaxConfiguration = {
        inputs: [
          {
            name: 'Market Value',
            field: 'property.marketValue',
            type: 'number',
            required: true,
          },
        ],
        derivedValues: [],
        finalTax: {
          formula: '${Market Value} * 0.01', // Use input name, not field path
        },
      };

      const serviceData = createNestedServiceData();

      const result = computeTax(config, serviceData);

      expect(result.totalTax).toBe(5000);
    });

    it('should include breakdown steps with descriptions', () => {
      const config = createSampleTaxConfiguration();
      const serviceData = createSampleServiceData();

      const result = computeTax(config, serviceData);

      expect(result.breakdown.steps).toHaveLength(2);
      expect(result.breakdown.steps[0].description).toBe('Assessed Value (20% of market value)');
      expect(result.breakdown.steps[0].calculation).toBe('${Market Value} * 0.2'); // Use input name
      expect(result.breakdown.steps[0].amount).toBe(100000);
      expect(result.breakdown.steps[1].description).toBe('Basic Tax (1% of assessed value)');
      expect(result.breakdown.steps[1].calculation).toBe('${assessedValue} * 0.01');
      expect(result.breakdown.steps[1].amount).toBe(1000);
    });
  });
});
