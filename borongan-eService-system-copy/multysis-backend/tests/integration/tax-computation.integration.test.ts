/**
 * Integration tests for tax computation flow
 * These tests require a test database connection
 * 
 * To run these tests:
 * 1. Set up a test database (e.g., DATABASE_URL_TEST)
 * 2. Run migrations on test database
 * 3. Run: npm test -- tax-computation.integration.test.ts
 */

import prisma from '../../src/config/database';
import {
  createTaxProfile,
  createTaxProfileVersion,
  activateTaxProfileVersion,
} from '../../src/services/tax-profile.service';
import { computeTaxForTransaction } from '../../src/services/tax-computation.service';
import { TaxConfiguration } from '../../src/services/tax-engine.service';

// Skip integration tests if TEST_DATABASE_URL is not set
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe('Tax Computation Integration Tests', () => {
  let testServiceId: string;
  let testTaxProfileId: string;
  let testSubscriberId: string;

  beforeAll(async () => {
    if (!TEST_DATABASE_URL) {
      console.warn('TEST_DATABASE_URL not set, skipping integration tests');
      return;
    }

    // Create test service
    const service = await prisma.service.create({
      data: {
        code: 'RPTAX_TEST',
        name: 'Real Property Tax (Test)',
        description: 'Test service for tax computation',
        order: 1,
        isActive: true,
        requiresPayment: true,
        defaultAmount: 0,
        displayInSidebar: false,
        displayInSubscriberTabs: false,
      },
    });
    testServiceId = service.id;

    // Create test non-citizen first
    const nonCitizen = await (prisma as any).nonCitizen.create({
      data: {
        firstName: 'Test',
        lastName: 'Subscriber',
        phoneNumber: '09179999999',
        status: 'ACTIVE',
        residentId: 'TEST-RES-001',
        residencyType: 'RESIDENT',
      },
    });

    // Create test subscriber
    const subscriber = await (prisma as any).subscriber.create({
      data: {
        type: 'SUBSCRIBER',
        nonCitizenId: nonCitizen.id,
        password: 'hashed_password',
      },
    });
    testSubscriberId = subscriber.id;

    // Create tax profile in beforeAll so all tests can use it
    const taxProfile = await createTaxProfile({
      serviceId: testServiceId,
      name: 'RPTAX Residential Integration Test',
      variant: 'Residential',
      isActive: true,
    });
    testTaxProfileId = taxProfile.id;
  });

  afterAll(async () => {
    if (!TEST_DATABASE_URL) {
      return;
    }

    // Clean up test data
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

    await prisma.transaction.deleteMany({
      where: {
        serviceId: testServiceId,
      },
    });

    // Delete subscriber and non-citizen
    const subscriber = await (prisma as any).subscriber.findUnique({
      where: { id: testSubscriberId },
    });
    if (subscriber?.nonCitizenId) {
      await (prisma as any).nonCitizen.delete({
        where: { id: subscriber.nonCitizenId },
      });
    }
    await (prisma as any).subscriber.delete({
      where: { id: testSubscriberId },
    });

    await prisma.service.delete({
      where: { id: testServiceId },
    });

    await prisma.$disconnect();
  });

  describe('Full Tax Computation Flow', () => {
    it('should complete full flow: service → profile → version → transaction → computation', async () => {
      if (!TEST_DATABASE_URL) {
        console.warn('Skipping test: TEST_DATABASE_URL not set');
        return;
      }

      // Use tax profile created in beforeAll
      expect(testTaxProfileId).toBeDefined();

      // Step 1: Create tax profile version
      const configuration: TaxConfiguration = {
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
      };

      const version = await createTaxProfileVersion(testTaxProfileId, {
        effectiveFrom: new Date('2026-01-01'),
        changeReason: 'Initial version for integration test',
        configuration,
        createdBy: 'test-user',
      });

      expect(version).toHaveProperty('id');
      expect(version.version).toBe('1.0.0');
      expect(version.status).toBe('DRAFT');

      // Step 3: Activate version
      const activatedVersion = await activateTaxProfileVersion(version.id);
      expect(activatedVersion.status).toBe('ACTIVE');

      // Step 4: Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          subscriberId: testSubscriberId,
          serviceId: testServiceId,
          transactionId: 'TEST-' + Date.now(),
          referenceNumber: 'REF-' + Date.now(),
          paymentStatus: 'UNPAID',
          paymentAmount: 0,
          isResidentOfBorongan: true,
          serviceData: {
            marketValue: 500000,
          },
          applicationDate: new Date('2026-06-15'),
          status: 'Pending',
          isPosted: false,
        },
      });

      expect(transaction).toHaveProperty('id');

      // Step 5: Compute tax
      const computation = await computeTaxForTransaction(transaction.id, 'test-user');

      expect(computation).toHaveProperty('id');
      expect(computation.transactionId).toBe(transaction.id);
      expect(computation.taxProfileVersionId).toBe(activatedVersion.id);
      expect(computation.isActive).toBe(true);
      // totalTax is Decimal type from Prisma, convert to number for comparison
      expect(Number(computation.totalTax)).toBe(1000); // 500000 * 0.2 * 0.01 = 1000
      expect(computation.inputs).toHaveProperty('Market Value');
      expect(computation.derivedValues).toHaveProperty('assessedValue');
      expect(computation.breakdown).toBeDefined();
      const breakdown = computation.breakdown as any;
      expect(breakdown.steps).toBeDefined();
      expect(breakdown.steps.length).toBeGreaterThan(0);
    });

    it('should select correct version based on application date', async () => {
      if (!TEST_DATABASE_URL) {
        console.warn('Skipping test: TEST_DATABASE_URL not set');
        return;
      }

      // Clean up any existing versions from previous tests to avoid interference
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

      // Create version 1 with 1% rate (effective from 2026-01-01)
      const config1: TaxConfiguration = {
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
            formula: '${Market Value} * 0.2',
            description: 'Assessed Value',
          },
        ],
        finalTax: {
          formula: '${assessedValue} * 0.01', // 1% rate
          description: 'Basic Tax',
        },
      };

      const version1 = await createTaxProfileVersion(testTaxProfileId, {
        effectiveFrom: new Date('2026-01-01'),
        changeReason: 'Version 1 for date selection test',
        configuration: config1,
        createdBy: 'test-user',
      });

      await activateTaxProfileVersion(version1.id);

      // Create version 2 with 2% rate (effective from 2026-07-01)
      const config2: TaxConfiguration = {
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
          formula: '${Market Value} * 0.02', // 2% rate
        },
      };

      const version2 = await createTaxProfileVersion(testTaxProfileId, {
        effectiveFrom: new Date('2026-07-01'),
        changeReason: 'Rate change for integration test',
        configuration: config2,
        createdBy: 'test-user',
      });

      await activateTaxProfileVersion(version2.id);

      // Verify version 1 was archived correctly
      const archivedVersion1 = await prisma.taxProfileVersion.findUnique({
        where: { id: version1.id },
      });
      expect(archivedVersion1?.status).toBe('ARCHIVED');
      expect(archivedVersion1?.effectiveTo).not.toBeNull();
      // effectiveTo should be 2026-06-30 (day before version 2's effectiveFrom)
      // Check that it's on or before 2026-06-30
      const maxEffectiveTo = new Date('2026-06-30T23:59:59.999Z');
      expect(archivedVersion1?.effectiveTo?.getTime()).toBeLessThanOrEqual(maxEffectiveTo.getTime());

      // Verify version 2 is active and has correct effectiveFrom
      const activeVersion2 = await prisma.taxProfileVersion.findUnique({
        where: { id: version2.id },
      });
      expect(activeVersion2?.status).toBe('ACTIVE');
      expect(activeVersion2?.effectiveTo).toBeNull();
      // Version 2's effectiveFrom should be 2026-07-01, which is AFTER 2026-06-15
      expect(activeVersion2?.effectiveFrom.getTime()).toBeGreaterThan(new Date('2026-06-15').getTime());

      // Version 1 should now have effectiveTo set to 2026-06-30
      // Create transaction with date before version 2 (should use version 1)
      const transaction1 = await prisma.transaction.create({
        data: {
          subscriberId: testSubscriberId,
          serviceId: testServiceId,
          transactionId: 'TEST-DATE1-' + Date.now(),
          referenceNumber: 'REF-DATE1-' + Date.now(),
          paymentStatus: 'UNPAID',
          paymentAmount: 0,
          isResidentOfBorongan: true,
          serviceData: {
            marketValue: 500000,
          },
          applicationDate: new Date('2026-06-15'), // Before version 2, within version 1 range
          status: 'Pending',
          isPosted: false,
        },
      });

      const computation1 = await computeTaxForTransaction(transaction1.id);

      // Verify which version was used
      const usedVersion = await prisma.taxProfileVersion.findUnique({
        where: { id: computation1.taxProfileVersionId },
      });
      
      // Should use version 1 (archived, covers 2026-06-15)
      expect(usedVersion?.id).toBe(version1.id);
      expect(usedVersion?.version).toBe('1.0.0');
      
      // Should use version 1's formula: assessedValue * 0.01 where assessedValue = Market Value * 0.2
      // 500000 * 0.2 = 100000, then 100000 * 0.01 = 1000
      expect(Number(computation1.totalTax)).toBe(1000);

      // Create transaction with date after version 2 (should use version 2)
      const transaction2 = await prisma.transaction.create({
        data: {
          subscriberId: testSubscriberId,
          serviceId: testServiceId,
          transactionId: 'TEST-DATE2-' + Date.now(),
          referenceNumber: 'REF-DATE2-' + Date.now(),
          paymentStatus: 'UNPAID',
          paymentAmount: 0,
          isResidentOfBorongan: true,
          serviceData: {
            marketValue: 500000,
          },
          applicationDate: new Date('2026-08-01'), // After version 2
          status: 'Pending',
          isPosted: false,
        },
      });

      const computation2 = await computeTaxForTransaction(transaction2.id);

      // Should use version 2 (2% rate)
      expect(Number(computation2.totalTax)).toBe(10000); // 500000 * 0.02
    });

    it('should handle transaction without tax profile', async () => {
      if (!TEST_DATABASE_URL) {
        console.warn('Skipping test: TEST_DATABASE_URL not set');
        return;
      }

      // Create service without tax profile
      const serviceWithoutTax = await prisma.service.create({
        data: {
          code: 'NO_TAX_TEST',
          name: 'No Tax Service (Test)',
          order: 1,
          isActive: true,
          requiresPayment: true,
          defaultAmount: 100,
          displayInSidebar: false,
          displayInSubscriberTabs: false,
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          subscriberId: testSubscriberId,
          serviceId: serviceWithoutTax.id,
          transactionId: 'TEST-NO-TAX-' + Date.now(),
          referenceNumber: 'REF-NO-TAX-' + Date.now(),
          paymentStatus: 'UNPAID',
          paymentAmount: 100,
          isResidentOfBorongan: true,
          serviceData: {},
          status: 'Pending',
          isPosted: false,
        },
      });

      // Should throw error when trying to compute tax
      await expect(computeTaxForTransaction(transaction.id)).rejects.toThrow(
        'Service does not have an active tax profile'
      );

      // Cleanup
      await prisma.transaction.delete({ where: { id: transaction.id } });
      await prisma.service.delete({ where: { id: serviceWithoutTax.id } });
    });

    it('should deactivate previous computation when computing new one', async () => {
      if (!TEST_DATABASE_URL) {
        console.warn('Skipping test: TEST_DATABASE_URL not set');
        return;
      }

      // Ensure we have an active version for the test date
      // Create a version that's active for the test date
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
            formula: '${Market Value} * 0.2',
            description: 'Assessed Value',
          },
        ],
        finalTax: {
          formula: '${assessedValue} * 0.01',
          description: 'Basic Tax',
        },
      };

      const testVersion = await createTaxProfileVersion(testTaxProfileId, {
        effectiveFrom: new Date('2026-01-01'),
        changeReason: 'Version for reassessment test',
        configuration: config,
        createdBy: 'test-user',
      });

      await activateTaxProfileVersion(testVersion.id);

      const transaction = await prisma.transaction.create({
        data: {
          subscriberId: testSubscriberId,
          serviceId: testServiceId,
          transactionId: 'TEST-REASSESS-' + Date.now(),
          referenceNumber: 'REF-REASSESS-' + Date.now(),
          paymentStatus: 'UNPAID',
          paymentAmount: 0,
          isResidentOfBorongan: true,
          serviceData: {
            marketValue: 500000,
          },
          applicationDate: new Date('2026-06-15'),
          status: 'Pending',
          isPosted: false,
        },
      });

      // First computation
      const computation1 = await computeTaxForTransaction(transaction.id);
      expect(computation1.isActive).toBe(true);

      // Second computation (reassessment)
      const computation2 = await computeTaxForTransaction(transaction.id);
      expect(computation2.isActive).toBe(true);

      // First computation should be deactivated
      const deactivatedComputation = await prisma.taxComputation.findUnique({
        where: { id: computation1.id },
      });
      expect(deactivatedComputation?.isActive).toBe(false);
    });
  });
});

