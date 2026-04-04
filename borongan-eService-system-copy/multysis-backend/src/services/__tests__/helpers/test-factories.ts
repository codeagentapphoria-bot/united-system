import { TaxConfiguration } from '../../tax-engine.service';

/**
 * Test data factories for tax engine tests
 */

export const createSampleTaxConfiguration = (): TaxConfiguration => ({
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
      formula: '${Market Value} * 0.2', // Use input name, not field path
      description: 'Assessed Value (20% of market value)',
    },
  ],
  finalTax: {
    formula: '${assessedValue} * 0.01',
    description: 'Basic Tax (1% of assessed value)',
  },
});

export const createComplexTaxConfiguration = (): TaxConfiguration => ({
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
  derivedValues: [
    {
      name: 'assessedValue',
      formula: '${Market Value} * 0.2', // Use input name
      description: 'Assessed Value',
    },
    {
      name: 'basicTax',
      formula: '${assessedValue} * 0.01',
      description: 'Basic Tax',
    },
    {
      name: 'sef',
      formula: '${basicTax} * 0.1',
      description: 'Special Education Fund',
    },
  ],
  finalTax: {
    formula: '${basicTax} + ${sef}',
    description: 'Total Tax',
  },
});

export const createSampleServiceData = () => ({
  marketValue: 500000,
  propertyType: 'Residential',
});

export const createNestedServiceData = () => ({
  property: {
    marketValue: 500000,
    area: 100,
  },
  applicant: {
    age: 30,
  },
});

// Dummy test to satisfy Jest when this helper file is treated as a test suite
describe('test-factories helpers', () => {
  it('should provide factory helpers', () => {
    expect(createSampleTaxConfiguration).toBeDefined();
    expect(createComplexTaxConfiguration).toBeDefined();
  });
});
