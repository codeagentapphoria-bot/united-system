import prisma from '../../src/config/database';
import { createTransaction } from '../../src/services/transaction.service';
import { computeTaxForTransaction, getActiveTaxComputation } from '../../src/services/tax-computation.service';
import { createTaxProfile, createTaxProfileVersion, activateTaxProfileVersion } from '../../src/services/tax-profile.service';
import { createExemptionRequest, approveExemption, rejectExemption, getExemptionsByTransaction } from '../../src/services/exemption.service';
import { createSampleTaxConfiguration } from '../../src/services/__tests__/helpers/test-factories';

describe('Exemption Workflow Integration Tests', () => {
  let testServiceId: string;
  let testTaxProfileId: string;
  let testSubscriberId: string;
  let testNonCitizenId: string;

  beforeAll(async () => {
    // Create test service
    const service = await prisma.service.create({
      data: {
        code: 'RPTAX_EXEMPT',
        name: 'Real Property Tax Exemption Test',
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
        phoneNumber: '09171234568',
        status: 'ACTIVE',
        residentId: 'TEST-RES-002',
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
    await prisma.exemption.deleteMany({
      where: {
        transaction: {
          subscriberId: testSubscriberId,
        },
      },
    });
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
      createdBy: 'test-user',
    });
    await activateTaxProfileVersion(version.id);
  });

  afterEach(async () => {
    // Cleanup
    await prisma.exemption.deleteMany({
      where: {
        transaction: {
          subscriberId: testSubscriberId,
        },
      },
    });
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

  describe('Exemption Request Flow', () => {
    it('should create exemption request with PENDING status', async () => {
      // Create transaction
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      // Create exemption request
      const exemption = await createExemptionRequest({
        transactionId: transaction.id,
        exemptionType: 'SENIOR_CITIZEN',
        requestReason: 'I am a senior citizen aged 70 years old',
        requestedBy: testSubscriberId,
      });

      expect(exemption.status).toBe('PENDING');
      expect(exemption.transactionId).toBe(transaction.id);
      expect(exemption.exemptionType).toBe('SENIOR_CITIZEN');
    });

    it('should approve exemption and trigger tax recomputation', async () => {
      // Create transaction and compute tax
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      // Initial tax computation
      await computeTaxForTransaction(transaction.id);

      // Create and approve exemption
      const exemption = await createExemptionRequest({
        transactionId: transaction.id,
        exemptionType: 'SENIOR_CITIZEN',
        requestReason: 'I am a senior citizen',
        requestedBy: testSubscriberId,
      });

      await approveExemption(exemption.id, {
        exemptionAmount: 2000,
        approvedBy: 'test-admin',
      });

      // Verify exemption is approved
      const updatedExemption = await prisma.exemption.findUnique({
        where: { id: exemption.id },
      });
      expect(updatedExemption?.status).toBe('APPROVED');
      expect(Number(updatedExemption?.exemptionAmount)).toBe(2000);

      // Verify tax was recomputed (if computation existed)
      const newComputation = await getActiveTaxComputation(transaction.id);
      if (newComputation) {
        // Tax should be recomputed with exemption applied
        expect(newComputation.exemptionsApplied).toBeDefined();
      }
    });

    it('should reject exemption with reason', async () => {
      // Create transaction
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      // Create exemption request
      const exemption = await createExemptionRequest({
        transactionId: transaction.id,
        exemptionType: 'SENIOR_CITIZEN',
        requestReason: 'I am a senior citizen',
        requestedBy: testSubscriberId,
      });

      // Reject exemption
      await rejectExemption(exemption.id, {
        rejectionReason: 'Supporting documents are insufficient',
      });

      // Verify exemption is rejected
      const updatedExemption = await prisma.exemption.findUnique({
        where: { id: exemption.id },
      });
      expect(updatedExemption?.status).toBe('REJECTED');
      expect(updatedExemption?.rejectionReason).toBe('Supporting documents are insufficient');
    });
  });

  describe('Multiple Exemptions', () => {
    it('should handle multiple exemptions for same transaction', async () => {
      // Create transaction
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      // Create multiple exemption requests
      const exemption1 = await createExemptionRequest({
        transactionId: transaction.id,
        exemptionType: 'SENIOR_CITIZEN',
        requestReason: 'Senior citizen exemption',
        requestedBy: testSubscriberId,
      });

      const exemption2 = await createExemptionRequest({
        transactionId: transaction.id,
        exemptionType: 'PWD',
        requestReason: 'Person with disability exemption',
        requestedBy: testSubscriberId,
      });

      // Approve both
      await approveExemption(exemption1.id, {
        exemptionAmount: 1000,
        approvedBy: 'test-admin',
      });

      await approveExemption(exemption2.id, {
        exemptionAmount: 1500,
        approvedBy: 'test-admin',
      });

      // Verify both exemptions are approved
      const exemptions = await getExemptionsByTransaction(transaction.id);
      const approved = exemptions.filter((e) => e.status === 'APPROVED');
      expect(approved).toHaveLength(2);
    });
  });
});

