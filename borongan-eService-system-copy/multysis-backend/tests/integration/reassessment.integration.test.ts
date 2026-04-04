import prisma from '../../src/config/database';
import { createTransaction } from '../../src/services/transaction.service';
import { computeTaxForTransaction } from '../../src/services/tax-computation.service';
import { createTaxProfile, createTaxProfileVersion, activateTaxProfileVersion } from '../../src/services/tax-profile.service';
import { reassessTax, getReassessmentHistory, getReassessmentComparison } from '../../src/services/tax-reassessment.service';
import { createSampleTaxConfiguration } from '../../src/services/__tests__/helpers/test-factories';

describe('Reassessment Integration Tests', () => {
  let testServiceId: string;
  let testTaxProfileId: string;
  let testSubscriberId: string;
  let testNonCitizenId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test service
    const service = await prisma.service.create({
      data: {
        code: 'RPTAX_REASSESS',
        name: 'Real Property Tax Reassessment Test',
        description: 'Test service',
        isActive: true,
        defaultAmount: 0,
        paymentStatuses: ['PENDING', 'PAID'],
      },
    });
    testServiceId = service.id;

    // Create test subscriber
    const nonCitizen = await (prisma as any).nonCitizen.create({
      data: {
        firstName: 'Test',
        lastName: 'Subscriber',
        phoneNumber: '09171234570',
        status: 'ACTIVE',
        residentId: 'TEST-RES-004',
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

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'testadmin@example.com',
        password: 'hashedpassword',
        role: 'admin',
        name: 'Test Admin',
      },
    });
    testUserId = user.id;
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
    await prisma.user.deleteMany({
      where: {
        id: testUserId,
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

    // Create and activate version
    const version = await createTaxProfileVersion(testTaxProfileId, {
      version: '1.0.0',
      effectiveFrom: new Date('2024-01-01'),
      changeReason: 'Initial version',
      configuration: createSampleTaxConfiguration(),
      createdBy: testUserId,
    });
    await activateTaxProfileVersion(version.id);
  });

  afterEach(async () => {
    // Cleanup
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

  describe('Reassessment Flow', () => {
    it('should deactivate old computation and create new one with difference', async () => {
      // Create transaction and compute initial tax
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      const oldComputation = await computeTaxForTransaction(transaction.id);
      const oldTax = Number(oldComputation.adjustedTax ?? oldComputation.totalTax);

      // Update service data (simulating property value change)
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          serviceData: {
            propertyType: 'Residential',
            marketValue: 1200000, // Increased value
          },
        },
      });

      // Trigger reassessment
      const result = await reassessTax(transaction.id, {
        reason: 'Property value was reassessed',
        computedBy: testUserId,
      });

      // Verify old computation is deactivated
      const deactivatedComputation = await prisma.taxComputation.findUnique({
        where: { id: oldComputation.id },
      });
      expect(deactivatedComputation?.isActive).toBe(false);

      // Verify new computation is created
      expect(result.newComputation.id).toBeDefined();
      expect(result.newComputation.isReassessment).toBe(true);
      expect(result.newComputation.reassessmentReason).toBe('Property value was reassessed');
      expect(result.newComputation.previousComputationId).toBe(oldComputation.id);

      // Verify difference is calculated
      const newTax = Number(result.newComputation.adjustedTax ?? result.newComputation.totalTax);
      expect(result.differenceAmount).toBe(newTax - oldTax);
    });
  });

  describe('Reassessment History', () => {
    it('should return all computations in history', async () => {
      // Create transaction
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      // Initial computation
      await computeTaxForTransaction(transaction.id);

      // First reassessment
      await reassessTax(transaction.id, {
        reason: 'First reassessment',
        computedBy: testUserId,
      });

      // Second reassessment
      await reassessTax(transaction.id, {
        reason: 'Second reassessment',
        computedBy: testUserId,
      });

      // Get history
      const history = await getReassessmentHistory(transaction.id);

      expect(history.length).toBeGreaterThanOrEqual(3);
      // Should be ordered by computedAt desc
      expect(history[0].computedAt.getTime()).toBeGreaterThanOrEqual(
        history[1].computedAt.getTime()
      );
    });
  });

  describe('Reassessment Comparison', () => {
    it('should return comparison of old and new computations', async () => {
      // Create transaction
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      // Initial computation
      await computeTaxForTransaction(transaction.id);

      // Trigger reassessment
      const result = await reassessTax(transaction.id, {
        reason: 'Property reassessed',
        computedBy: testUserId,
      });

      // Get comparison
      const comparison = await getReassessmentComparison(result.newComputation.id);

      expect(comparison.oldComputation.id).toBe(result.oldComputation.id);
      expect(comparison.newComputation.id).toBe(result.newComputation.id);
      expect(Number(comparison.differenceAmount)).toBe(
        Number(result.differenceAmount)
      );
    });
  });
});

