import { evaluateCondition, evaluateConditions } from '../condition-evaluator.service';
import type { Condition } from '../condition-evaluator.service';

describe('Condition Evaluator Service', () => {
  describe('evaluateCondition', () => {
    const serviceData = {
      propertyType: 'Residential',
      marketValue: 1000000,
      area: 500,
      isSeniorCitizen: true,
      age: 65,
      status: 'active',
      tags: ['residential', 'urban'],
    };

    describe('Equality operators', () => {
      it('should evaluate == operator with string values', () => {
        const condition: Condition = {
          field: 'propertyType',
          operator: '==',
          value: 'Residential',
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should evaluate == operator with number values', () => {
        const condition: Condition = {
          field: 'marketValue',
          operator: '==',
          value: 1000000,
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should evaluate == operator with boolean values', () => {
        const condition: Condition = {
          field: 'isSeniorCitizen',
          operator: '==',
          value: true,
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should evaluate != operator correctly', () => {
        const condition: Condition = {
          field: 'propertyType',
          operator: '!=',
          value: 'Commercial',
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should handle type coercion in == operator', () => {
        const condition: Condition = {
          field: 'marketValue',
          operator: '==',
          value: '1000000', // String value
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });
    });

    describe('Comparison operators', () => {
      it('should evaluate > operator', () => {
        const condition: Condition = {
          field: 'marketValue',
          operator: '>',
          value: 500000,
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should evaluate < operator', () => {
        const condition: Condition = {
          field: 'marketValue',
          operator: '<',
          value: 2000000,
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should evaluate >= operator', () => {
        const condition: Condition = {
          field: 'age',
          operator: '>=',
          value: 65,
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should evaluate <= operator', () => {
        const condition: Condition = {
          field: 'age',
          operator: '<=',
          value: 65,
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should return false for > when value is less', () => {
        const condition: Condition = {
          field: 'marketValue',
          operator: '>',
          value: 2000000,
        };
        expect(evaluateCondition(condition, serviceData)).toBe(false);
      });
    });

    describe('Array operators', () => {
      it('should evaluate in operator', () => {
        const condition: Condition = {
          field: 'propertyType',
          operator: 'in',
          value: ['Residential', 'Commercial'],
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should evaluate notIn operator', () => {
        const condition: Condition = {
          field: 'propertyType',
          operator: 'notIn',
          value: ['Commercial', 'Industrial'],
        };
        expect(evaluateCondition(condition, serviceData)).toBe(true);
      });

      it('should return false for in when value not in array', () => {
        const condition: Condition = {
          field: 'propertyType',
          operator: 'in',
          value: ['Commercial', 'Industrial'],
        };
        expect(evaluateCondition(condition, serviceData)).toBe(false);
      });

      it('should throw error if in operator value is not an array', () => {
        const condition: Condition = {
          field: 'propertyType',
          operator: 'in',
          value: 'Residential', // Not an array
        };
        expect(() => evaluateCondition(condition, serviceData)).toThrow();
      });
    });

    describe('Null/undefined handling', () => {
      it('should handle null field value with == operator', () => {
        const data = { field: null };
        const condition: Condition = {
          field: 'field',
          operator: '==',
          value: null,
        };
        expect(evaluateCondition(condition, data)).toBe(true);
      });

      it('should handle undefined field value with == operator', () => {
        const data = { field: undefined };
        const condition: Condition = {
          field: 'field',
          operator: '==',
          value: undefined,
        };
        expect(evaluateCondition(condition, data)).toBe(true);
      });

      it('should return false for comparison operators with null/undefined', () => {
        const data = { field: null };
        const condition: Condition = {
          field: 'field',
          operator: '>',
          value: 0,
        };
        expect(evaluateCondition(condition, data)).toBe(false);
      });
    });

    describe('Nested field access', () => {
      it('should access nested fields', () => {
        const data = {
          property: {
            type: 'Residential',
            value: 1000000,
          },
        };
        const condition: Condition = {
          field: 'property.type',
          operator: '==',
          value: 'Residential',
        };
        expect(evaluateCondition(condition, data)).toBe(true);
      });

      it('should handle missing nested fields', () => {
        const data = {
          property: {
            type: 'Residential',
          },
        };
        const condition: Condition = {
          field: 'property.value',
          operator: '>',
          value: 0,
        };
        expect(evaluateCondition(condition, data)).toBe(false);
      });
    });

    describe('Error handling', () => {
      it('should throw error for unsupported operator', () => {
        const condition = {
          field: 'propertyType',
          operator: 'contains' as any,
          value: 'Residential',
        };
        expect(() => evaluateCondition(condition, serviceData)).toThrow();
      });
    });
  });

  describe('evaluateConditions', () => {
    const serviceData = {
      propertyType: 'Residential',
      marketValue: 1000000,
      age: 65,
    };

    it('should return true for empty conditions array', () => {
      expect(evaluateConditions([], serviceData)).toBe(true);
    });

    it('should evaluate AND logic (all conditions must pass)', () => {
      const conditions: Condition[] = [
        { field: 'propertyType', operator: '==', value: 'Residential' },
        { field: 'marketValue', operator: '>', value: 500000 },
        { field: 'age', operator: '>=', value: 65 },
      ];
      expect(evaluateConditions(conditions, serviceData, 'AND')).toBe(true);
    });

    it('should return false for AND if any condition fails', () => {
      const conditions: Condition[] = [
        { field: 'propertyType', operator: '==', value: 'Residential' },
        { field: 'marketValue', operator: '>', value: 2000000 }, // This fails
        { field: 'age', operator: '>=', value: 65 },
      ];
      expect(evaluateConditions(conditions, serviceData, 'AND')).toBe(false);
    });

    it('should evaluate OR logic (at least one condition must pass)', () => {
      const conditions: Condition[] = [
        { field: 'propertyType', operator: '==', value: 'Commercial' }, // Fails
        { field: 'marketValue', operator: '>', value: 500000 }, // Passes
        { field: 'age', operator: '<', value: 18 }, // Fails
      ];
      expect(evaluateConditions(conditions, serviceData, 'OR')).toBe(true);
    });

    it('should return false for OR if all conditions fail', () => {
      const conditions: Condition[] = [
        { field: 'propertyType', operator: '==', value: 'Commercial' },
        { field: 'marketValue', operator: '>', value: 2000000 },
        { field: 'age', operator: '<', value: 18 },
      ];
      expect(evaluateConditions(conditions, serviceData, 'OR')).toBe(false);
    });

    it('should default to AND logic', () => {
      const conditions: Condition[] = [
        { field: 'propertyType', operator: '==', value: 'Residential' },
        { field: 'marketValue', operator: '>', value: 500000 },
      ];
      expect(evaluateConditions(conditions, serviceData)).toBe(true);
    });
  });
});
