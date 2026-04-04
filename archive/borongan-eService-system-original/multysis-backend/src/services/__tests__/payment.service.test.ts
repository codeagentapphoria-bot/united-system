import {
  recordPayment,
  getPaymentsByTransaction,
  calculateBalance,
  updateTransactionPaymentStatus,
  getPayment,
} from '../payment.service';
import prisma from '../../config/database';

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    taxComputation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Payment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('recordPayment', () => {
    it('should create a payment and update transaction status', async () => {
      const transactionId = 'transaction-1';
      const taxComputationId = 'computation-1';
      const paymentData = {
        transactionId,
        taxComputationId,
        amount: 5000,
        paymentMethod: 'CASH' as const,
        receivedBy: 'user-1',
      };

      (mockedPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: transactionId,
      } as any);

      (mockedPrisma.taxComputation.findUnique as jest.Mock).mockResolvedValue({
        id: taxComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: null,
        isActive: true,
      } as any);
      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValue({
        id: taxComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: null,
        isActive: true,
      } as any);

      (mockedPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment-1',
        ...paymentData,
        paymentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      (mockedPrisma.payment.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'payment-1',
          amount: 5000,
        },
      ] as any);

      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({
        id: transactionId,
        paymentStatus: 'PARTIAL',
      } as any);

      const result = await recordPayment(paymentData);

      expect(mockedPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
      expect(mockedPrisma.payment.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('balance');
    });

    it('should throw error if transaction not found', async () => {
      (mockedPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        recordPayment({
          transactionId: 'non-existent',
          taxComputationId: 'computation-1',
          amount: 1000,
          paymentMethod: 'CASH',
          receivedBy: 'user-1',
        })
      ).rejects.toThrow('Transaction not found');
    });

    it('should throw error if tax computation not found', async () => {
      (mockedPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'transaction-1',
      } as any);

      (mockedPrisma.taxComputation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        recordPayment({
          transactionId: 'transaction-1',
          taxComputationId: 'non-existent',
          amount: 1000,
          paymentMethod: 'CASH',
          receivedBy: 'user-1',
        })
      ).rejects.toThrow('Tax computation not found');
    });

    it('should throw error if computation does not belong to transaction', async () => {
      (mockedPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: 'transaction-1',
      } as any);

      (mockedPrisma.taxComputation.findUnique as jest.Mock).mockResolvedValue({
        id: 'computation-1',
        transactionId: 'different-transaction',
        isActive: true,
      } as any);

      await expect(
        recordPayment({
          transactionId: 'transaction-1',
          taxComputationId: 'computation-1',
          amount: 1000,
          paymentMethod: 'CASH',
          receivedBy: 'user-1',
        })
      ).rejects.toThrow('does not belong to this transaction');
    });
  });

  describe('getPaymentsByTransaction', () => {
    it('should return all payments for a transaction', async () => {
      const transactionId = 'transaction-1';
      const payments = [
        {
          id: 'payment-1',
          transactionId,
          amount: 5000,
          paymentDate: new Date(),
        },
        {
          id: 'payment-2',
          transactionId,
          amount: 3000,
          paymentDate: new Date(),
        },
      ];

      (mockedPrisma.payment.findMany as jest.Mock).mockResolvedValue(payments as any);

      const result = await getPaymentsByTransaction(transactionId);

      expect(mockedPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { transactionId },
        orderBy: { paymentDate: 'desc' },
        include: {
          taxComputation: {
            select: {
              id: true,
              totalTax: true,
              adjustedTax: true,
            },
          },
        },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('calculateBalance', () => {
    it('should calculate balance correctly', async () => {
      const transactionId = 'transaction-1';
      const taxComputationId = 'computation-1';

      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValue({
        id: taxComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: null,
        isActive: true,
      } as any);

      (mockedPrisma.payment.findMany as jest.Mock).mockResolvedValue([
        { id: 'payment-1', amount: 5000 },
        { id: 'payment-2', amount: 3000 },
      ] as any);

      const result = await calculateBalance(transactionId, taxComputationId);

      expect(result.totalTax).toBe(10000);
      expect(result.totalPaid).toBe(8000);
      expect(result.balance).toBe(2000);
    });

    it('should use adjustedTax if available', async () => {
      const transactionId = 'transaction-1';
      const taxComputationId = 'computation-1';

      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValue({
        id: taxComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: 8000, // Adjusted tax
        isActive: true,
      } as any);

      (mockedPrisma.payment.findMany as jest.Mock).mockResolvedValue([
        { id: 'payment-1', amount: 5000 },
      ] as any);

      const result = await calculateBalance(transactionId, taxComputationId);

      expect(result.totalTax).toBe(8000); // Uses adjustedTax
      expect(result.totalPaid).toBe(5000);
      expect(result.balance).toBe(3000);
    });

    it('should not return negative balance', async () => {
      const transactionId = 'transaction-1';
      const taxComputationId = 'computation-1';

      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValue({
        id: taxComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: null,
        isActive: true,
      } as any);

      (mockedPrisma.payment.findMany as jest.Mock).mockResolvedValue([
        { id: 'payment-1', amount: 12000 }, // Overpaid
      ] as any);

      const result = await calculateBalance(transactionId, taxComputationId);

      expect(result.balance).toBe(0); // Should not be negative
    });

    it('should throw error if computation not found', async () => {
      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(calculateBalance('transaction-1', 'computation-1')).rejects.toThrow(
        'Active tax computation not found'
      );
    });
  });

  describe('updateTransactionPaymentStatus', () => {
    it('should set status to PAID when balance is zero', async () => {
      const transactionId = 'transaction-1';
      const taxComputationId = 'computation-1';

      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValue({
        id: taxComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: null,
        isActive: true,
      } as any);

      (mockedPrisma.payment.findMany as jest.Mock).mockResolvedValue([
        { id: 'payment-1', amount: 10000 },
      ] as any);

      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({
        id: transactionId,
        paymentStatus: 'PAID',
      } as any);

      await updateTransactionPaymentStatus(transactionId, taxComputationId);

      expect(mockedPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          paymentStatus: 'PAID',
          paymentAmount: 10000,
        },
      });
    });

    it('should set status to PARTIAL when balance > 0 and totalPaid > 0', async () => {
      const transactionId = 'transaction-1';
      const taxComputationId = 'computation-1';

      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValue({
        id: taxComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: null,
        isActive: true,
      } as any);

      (mockedPrisma.payment.findMany as jest.Mock).mockResolvedValue([
        { id: 'payment-1', amount: 5000 },
      ] as any);

      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({
        id: transactionId,
        paymentStatus: 'PARTIAL',
      } as any);

      await updateTransactionPaymentStatus(transactionId, taxComputationId);

      expect(mockedPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          paymentStatus: 'PARTIAL',
          paymentAmount: 10000,
        },
      });
    });

    it('should set status to UNPAID when balance > 0 and totalPaid = 0', async () => {
      const transactionId = 'transaction-1';
      const taxComputationId = 'computation-1';

      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValue({
        id: taxComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: null,
        isActive: true,
      } as any);

      (mockedPrisma.payment.findMany as jest.Mock).mockResolvedValue([]);

      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({
        id: transactionId,
        paymentStatus: 'UNPAID',
      } as any);

      await updateTransactionPaymentStatus(transactionId, taxComputationId);

      expect(mockedPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: {
          paymentStatus: 'UNPAID',
          paymentAmount: 10000,
        },
      });
    });
  });

  describe('getPayment', () => {
    it('should return payment by ID', async () => {
      const paymentId = 'payment-1';
      const payment = {
        id: paymentId,
        transactionId: 'transaction-1',
        amount: 5000,
      };

      (mockedPrisma.payment.findUnique as jest.Mock).mockResolvedValue(payment as any);

      const result = await getPayment(paymentId);

      expect(mockedPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: paymentId },
        include: {
          transaction: {
            select: {
              id: true,
              transactionId: true,
              referenceNumber: true,
            },
          },
          taxComputation: {
            select: {
              id: true,
              totalTax: true,
              adjustedTax: true,
            },
          },
        },
      });
      expect(result.id).toBe(paymentId);
    });

    it('should throw error if payment not found', async () => {
      (mockedPrisma.payment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getPayment('non-existent')).rejects.toThrow('Payment not found');
    });
  });
});
