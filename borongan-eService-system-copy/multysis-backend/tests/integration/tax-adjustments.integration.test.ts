import prisma from '../../src/config/database';
import { createTransaction } from '../../src/services/transaction.service';
import { computeTaxForTransaction } from '../../src/services/tax-computation.service';
import { createTaxProfile, createTaxProfileVersion, activateTaxProfileVersion } from '../../src/services/tax-profile.service';
import { approveExemption } from '../../src/services/exemption.service';
import { createExemptionRequest } from '../../src/services/exemption.service';
import { createSampleTaxConfiguration } from '../../src/services/__tests__/helpers/test-factories';

describe('Tax Adjustments Integration Tests', () => {
  let testServiceId: string;
  let testTaxProfileId: string;
  let testSubscriberId: string;
  let testNonCitizenId: string;
  const serviceCode = `RPTAX_ADJ_${Date.now()}`;

  beforeAll(async () => {
    // Create test service
    const service = await prisma.service.create({
      data: {
        code: serviceCode,
        name: 'Real Property Tax',
        description: 'Test service',
        isActive: true,
        defaultAmount: 0,
        paymentStatuses: ['PENDING', 'PAID'],
      },
    });
    testServiceId = service.id;

    // Create test subscriber and non-citizen
    const nonCitizen = await (prisma as any).nonCitizen.create({
      data: {
        firstName: 'Test',
        lastName: 'Subscriber',
        phoneNumber: '09171234567',
        status: 'ACTIVE',
        residentId: 'TEST-RES-001',
        residencyType: 'RESIDENT',
      },
    });
    testNonCitizenId = nonCitizen.id;

    const subscriber = await (prisma as any).subscriber.create({
      data: {
        type: 'SUBSCRIBER',
        nonCitizenId: testNonCitizenId,
        password: 'hashed_password',
      },
    });
    testSubscriberId = subscriber.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.taxComputation.deleteMany({
      where: {
        taxProfileVersion: {
          taxProfile: {
            serviceId: testServiceId,
          },
        },
      },
    });
    await prisma.taxProfileVersion.deleteMany({
      where: {
        taxProfile: {
          serviceId: testServiceId,
        },
      },
    });
    await prisma.taxProfile.deleteMany({
      where: {
        serviceId: testServiceId,
      },
    });
    await prisma.exemption.deleteMany({
      where: {
        transaction: {
          subscriberId: testSubscriberId,
        },
      },
    });
    await prisma.transaction.deleteMany({
      where: {
        subscriberId: testSubscriberId,
      },
    });
    await prisma.subscriber.deleteMany({
      where: {
        id: testSubscriberId,
      },
    });
    await prisma.nonCitizen.deleteMany({
      where: {
        id: testNonCitizenId,
      },
    });
    await prisma.service.delete({
      where: {
        id: testServiceId,
      },
    });
  });

  beforeEach(async () => {
    // Create tax profile for each test
    const taxProfile = await createTaxProfile({
      serviceId: testServiceId,
      name: 'RPTAX Residential',
      variant: 'Residential',
      isActive: true,
    });
    testTaxProfileId = taxProfile.id;
  });

  afterEach(async () => {
    // Cleanup tax profile and versions
    await prisma.taxComputation.deleteMany({
      where: {
        taxProfileVersion: {
          taxProfileId: testTaxProfileId,
        },
      },
    });
    await prisma.taxProfileVersion.deleteMany({
      where: {
        taxProfileId: testTaxProfileId,
      },
    });
    await prisma.taxProfile.delete({
      where: {
        id: testTaxProfileId,
      },
    });
  });

  describe('Priority Ordering', () => {
    it('should apply adjustments in priority order', async () => {
      // Create tax profile version with adjustment rules
      const configuration = {
        ...createSampleTaxConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT' as const,
            name: 'Discount 2',
            priority: 2,
            condition: {
              field: 'propertyType',
              operator: '==' as const,
              value: 'Residential',
            },
            percentage: 10,
          },
          {
            type: 'DISCOUNT' as const,
            name: 'Discount 1',
            priority: 1,
            condition: {
              field: 'propertyType',
              operator: '==' as const,
              value: 'Residential',
            },
            percentage: 5,
          },
        ],
      };

      const version = await createTaxProfileVersion(testTaxProfileId, {
        version: '1.0.0',
        effectiveFrom: new Date('2024-01-01'),
        changeReason: 'Initial version with adjustments',
        configuration,
        createdBy: 'test-user',
      });

      await activateTaxProfileVersion(version.id);

      // Create transaction
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      // Compute tax
      const computation = await computeTaxForTransaction(transaction.id);

      // Verify adjustments applied in order
      // Base tax: 2000 (from sample config)
      // Discount 1 (5%): 2000 * 0.05 = 100, new tax = 1900
      // Discount 2 (10%): 1900 * 0.10 = 190, new tax = 1710
      expect(Number(computation.adjustedTax)).toBe(1710);
      expect(computation.discountsApplied).toBeDefined();
      const discounts = computation.discountsApplied as string[];
      expect(discounts).toContain('Discount 1');
      expect(discounts).toContain('Discount 2');
    });
  });

  describe('Conditional Rules', () => {
    it('should apply rules that match conditions and skip others', async () => {
      const configuration = {
        ...createSampleTaxConfiguration(),
        adjustmentRules: [
          {
            type: 'DISCOUNT' as const,
            name: 'Residential Discount',
            priority: 1,
            condition: {
              field: 'propertyType',
              operator: '==' as const,
              value: 'Residential',
            },
            percentage: 10,
          },
          {
            type: 'DISCOUNT' as const,
            name: 'Commercial Discount',
            priority: 2,
            condition: {
              field: 'propertyType',
              operator: '==' as const,
              value: 'Commercial',
            },
            percentage: 15,
          },
        ],
      };

      const version = await createTaxProfileVersion(testTaxProfileId, {
        version: '1.0.0',
        effectiveFrom: new Date('2024-01-01'),
        changeReason: 'Test conditional rules',
        configuration,
        createdBy: 'test-user',
      });

      await activateTaxProfileVersion(version.id);

      // Create transaction with Residential property
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      const computation = await computeTaxForTransaction(transaction.id);

      // Only Residential discount should be applied
      expect(Number(computation.adjustedTax)).toBe(1800); // 2000 - 200
      const discounts = computation.discountsApplied as string[];
      expect(discounts).toContain('Residential Discount');
      expect(discounts).not.toContain('Commercial Discount');
    });
  });

  describe('Exemption Application', () => {
    it('should apply approved exemptions and ignore unapproved', async () => {
      const configuration = {
        ...createSampleTaxConfiguration(),
        adjustmentRules: [
          {
            type: 'EXEMPTION' as const,
            name: 'Senior Citizen Exemption',
            priority: 1,
            condition: {
              field: 'isSeniorCitizen',
              operator: '==' as const,
              value: true,
            },
            amount: 2000,
          },
        ],
      };

      const version = await createTaxProfileVersion(testTaxProfileId, {
        version: '1.0.0',
        effectiveFrom: new Date('2024-01-01'),
        changeReason: 'Test exemptions',
        configuration,
        createdBy: 'test-user',
      });

      await activateTaxProfileVersion(version.id);

      // Create transaction
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
          isSeniorCitizen: true,
        },
      });

      // Create exemption request
      const exemption = await createExemptionRequest({
        transactionId: transaction.id,
        exemptionType: 'SENIOR_CITIZEN',
        requestReason: 'I am a senior citizen',
        requestedBy: testSubscriberId,
      });

      // Approve exemption
      await approveExemption(exemption.id, {
        exemptionAmount: 2000,
        approvedBy: 'test-admin',
      });

      // Recompute tax (exemption approval triggers recomputation)
      const computation = await computeTaxForTransaction(transaction.id);

      // Exemption should be applied
      expect(Number(computation.adjustedTax)).toBe(0); // 2000 - 2000
      const exemptions = computation.exemptionsApplied as string[];
      expect(exemptions).toContain('Senior Citizen Exemption');
    });
  });

  describe('Multiple Adjustments', () => {
    it('should apply exemption, discount, and penalty in sequence', async () => {
      const configuration = {
        ...createSampleTaxConfiguration(),
        adjustmentRules: [
          {
            type: 'EXEMPTION' as const,
            name: 'Exemption',
            priority: 1,
            condition: {
              field: 'propertyType',
              operator: '==' as const,
              value: 'Residential',
            },
            amount: 1000,
          },
          {
            type: 'DISCOUNT' as const,
            name: 'Discount',
            priority: 2,
            condition: {
              field: 'propertyType',
              operator: '==' as const,
              value: 'Residential',
            },
            percentage: 10,
          },
          {
            type: 'PENALTY' as const,
            name: 'Penalty',
            priority: 3,
            condition: {
              field: 'propertyType',
              operator: '==' as const,
              value: 'Residential',
            },
            amount: 200,
          },
        ],
      };

      const version = await createTaxProfileVersion(testTaxProfileId, {
        version: '1.0.0',
        effectiveFrom: new Date('2024-01-01'),
        changeReason: 'Test multiple adjustments',
        configuration,
        createdBy: 'test-user',
      });

      await activateTaxProfileVersion(version.id);

      // Create transaction
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      // Create and approve exemption
      const exemption = await createExemptionRequest({
        transactionId: transaction.id,
        exemptionType: 'SENIOR_CITIZEN',
        requestReason: 'Test exemption',
        requestedBy: testSubscriberId,
      });

      await approveExemption(exemption.id, {
        exemptionAmount: 1000,
        approvedBy: 'test-admin',
      });

      // Compute tax
      const computation = await computeTaxForTransaction(transaction.id);

      // Exemption: 2000 - 1000 = 1000
      // Discount: 1000 - (1000 * 0.10) = 900
      // Penalty: 900 + 200 = 1100
      expect(Number(computation.adjustedTax)).toBe(1100);
      expect((computation.exemptionsApplied as string[]).length).toBeGreaterThan(0);
      expect((computation.discountsApplied as string[]).length).toBeGreaterThan(0);
      expect((computation.penaltiesApplied as string[]).length).toBeGreaterThan(0);
    });
  });
});

