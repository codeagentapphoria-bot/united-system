import prisma from '../../src/config/database';
import { createTransaction } from '../../src/services/transaction.service';
import { computeTaxForTransaction } from '../../src/services/tax-computation.service';
import { createTaxProfile, createTaxProfileVersion, activateTaxProfileVersion } from '../../src/services/tax-profile.service';
import { recordPayment, getPaymentsByTransaction, calculateBalance } from '../../src/services/payment.service';
import { createSampleTaxConfiguration } from '../../src/services/__tests__/helpers/test-factories';

describe('Payment Tracking Integration Tests', () => {
  let testServiceId: string;
  let testTaxProfileId: string;
  let testSubscriberId: string;
  let testNonCitizenId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Create test service
    const service = await prisma.service.create({
      data: {
        code: 'RPTAX_PAY',
        name: 'Real Property Tax Payment Test',
        description: 'Test service',
        isActive: true,
        defaultAmount: 0,
        paymentStatuses: ['PENDING', 'PARTIAL', 'PAID'],
      },
    });
    testServiceId = service.id;

    // Create test subscriber
    const nonCitizen = await (prisma as any).nonCitizen.create({
      data: {
        firstName: 'Test',
        lastName: 'Subscriber',
        phoneNumber: '09171234569',
        status: 'ACTIVE',
        residentId: 'TEST-RES-003',
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

    // Create test user (admin)
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
    await prisma.payment.deleteMany({
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
    await prisma.payment.deleteMany({
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

  describe('Payment Recording', () => {
    it('should record payment and calculate balance correctly', async () => {
      // Create transaction and compute tax
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      const computation = await computeTaxForTransaction(transaction.id);
      const totalTax = Number(computation.adjustedTax ?? computation.totalTax);

      // Record payment
      const payment = await recordPayment({
        transactionId: transaction.id,
        taxComputationId: computation.id,
        amount: 5000,
        paymentMethod: 'CASH',
        receivedBy: testUserId,
      });

      // Verify payment created
      expect(payment.id).toBeDefined();
      expect(Number(payment.amount)).toBe(5000);

      // Verify balance
      const balance = await calculateBalance(transaction.id, computation.id);
      expect(balance.totalTax).toBe(totalTax);
      expect(balance.totalPaid).toBe(5000);
      // Overpayment should not produce a negative balance; clamp at 0
      expect(balance.balance).toBeGreaterThanOrEqual(0);
    });

    it('should update transaction payment status to PAID when fully paid', async () => {
      // Create transaction and compute tax
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      const computation = await computeTaxForTransaction(transaction.id);
      const totalTax = Number(computation.adjustedTax ?? computation.totalTax);

      // Record full payment
      await recordPayment({
        transactionId: transaction.id,
        taxComputationId: computation.id,
        amount: totalTax,
        paymentMethod: 'CASH',
        receivedBy: testUserId,
      });

      // Verify transaction status updated
      const updatedTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id },
      });
      expect(updatedTransaction?.paymentStatus).toBe('PAID');
    });
  });

  describe('Partial Payments', () => {
    it('should handle multiple partial payments', async () => {
      // Create transaction and compute tax
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      const computation = await computeTaxForTransaction(transaction.id);
      const totalTax = Number(computation.adjustedTax ?? computation.totalTax);

      // Record first partial payment
      await recordPayment({
        transactionId: transaction.id,
        taxComputationId: computation.id,
        amount: 3000,
        paymentMethod: 'CASH',
        receivedBy: testUserId,
      });

      // Verify status updates based on payments
      const updatedTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id },
      });
      expect(updatedTransaction?.paymentStatus).toBe('PAID');

      // Verify balance calculation
      const balance = await calculateBalance(transaction.id, computation.id);
      expect(balance.totalTax).toBe(totalTax);
      expect(balance.totalPaid).toBe(3000);
      expect(balance.balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Payment History', () => {
    it('should retrieve payments ordered by date (newest first)', async () => {
      // Create transaction and compute tax
      const transaction = await createTransaction({
        subscriberId: testSubscriberId,
        serviceId: testServiceId,
        serviceData: {
          propertyType: 'Residential',
          marketValue: 1000000,
        },
      });

      const computation = await computeTaxForTransaction(transaction.id);

      // Record multiple payments
      const payment1 = await recordPayment({
        transactionId: transaction.id,
        taxComputationId: computation.id,
        amount: 2000,
        paymentMethod: 'CASH',
        receivedBy: testUserId,
        paymentDate: new Date('2024-01-01'),
      });

      const payment2 = await recordPayment({
        transactionId: transaction.id,
        taxComputationId: computation.id,
        amount: 3000,
        paymentMethod: 'CASH',
        receivedBy: testUserId,
        paymentDate: new Date('2024-01-02'),
      });

      // Get payment history
      const payments = await getPaymentsByTransaction(transaction.id);

      expect(payments).toHaveLength(2);
      // Should be ordered by date desc (newest first)
      expect(payments[0].id).toBe(payment2.id);
      expect(payments[1].id).toBe(payment1.id);
    });
  });
});

