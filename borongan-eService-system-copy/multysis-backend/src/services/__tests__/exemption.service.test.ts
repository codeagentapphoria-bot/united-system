import {
  createExemptionRequest,
  approveExemption,
  rejectExemption,
  getExemptionsByTransaction,
  getExemption,
  applyExemptionsToComputation,
} from '../exemption.service';
import { computeTaxForTransaction } from '../tax-computation.service';
import prisma from '../../config/database';

// Mock dependencies
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    exemption: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
    },
    taxComputation: {
      update: jest.fn(),
    },
  },
}));

jest.mock('../tax-computation.service', () => ({
  computeTaxForTransaction: jest.fn(),
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedComputeTax = computeTaxForTransaction as jest.MockedFunction<
  typeof computeTaxForTransaction
>;

describe('Exemption Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExemptionRequest', () => {
    it('should create an exemption request with PENDING status', async () => {
      const transactionId = 'transaction-1';
      const data = {
        transactionId,
        exemptionType: 'SENIOR_CITIZEN' as const,
        requestReason: 'I am a senior citizen aged 70',
        supportingDocuments: ['/uploads/doc1.pdf'],
        requestedBy: 'subscriber-1',
      };

      (mockedPrisma.transaction.findUnique as jest.Mock).mockResolvedValue({
        id: transactionId,
      } as any);

      (mockedPrisma.exemption.create as jest.Mock).mockResolvedValue({
        id: 'exemption-1',
        ...data,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await createExemptionRequest(data);

      expect(mockedPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: transactionId },
      });
      expect(mockedPrisma.exemption.create).toHaveBeenCalled();
      expect(result.status).toBe('PENDING');
    });

    it('should throw error if transaction not found', async () => {
      const data = {
        transactionId: 'non-existent',
        exemptionType: 'SENIOR_CITIZEN' as const,
        requestReason: 'Test reason',
        requestedBy: 'subscriber-1',
      };

      (mockedPrisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(createExemptionRequest(data)).rejects.toThrow('Transaction not found');
    });
  });

  describe('approveExemption', () => {
    it('should approve an exemption and trigger tax recomputation', async () => {
      const exemptionId = 'exemption-1';
      const transactionId = 'transaction-1';
      const taxComputationId = 'computation-1';
      const userId = 'user-1';
      const exemptionAmount = 2000;

      (mockedPrisma.exemption.findUnique as jest.Mock).mockResolvedValue({
        id: exemptionId,
        status: 'PENDING',
        transactionId,
        taxComputationId,
        transaction: { id: transactionId },
      } as any);

      (mockedPrisma.exemption.update as jest.Mock).mockResolvedValue({
        id: exemptionId,
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
        exemptionAmount,
      } as any);

      mockedComputeTax.mockResolvedValue({} as any);

      const result = await approveExemption(exemptionId, {
        exemptionAmount,
        approvedBy: userId,
      });

      expect(mockedPrisma.exemption.findUnique).toHaveBeenCalledWith({
        where: { id: exemptionId },
        include: { transaction: true },
      });
      expect(mockedPrisma.exemption.update).toHaveBeenCalledWith({
        where: { id: exemptionId },
        data: {
          status: 'APPROVED',
          approvedBy: userId,
          approvedAt: expect.any(Date),
          exemptionAmount,
        },
      });
      expect(mockedComputeTax).toHaveBeenCalledWith(transactionId, userId);
      expect(result.status).toBe('APPROVED');
    });

    it('should throw error if exemption not found', async () => {
      (mockedPrisma.exemption.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        approveExemption('non-existent', {
          exemptionAmount: 1000,
          approvedBy: 'user-1',
        })
      ).rejects.toThrow('Exemption not found');
    });

    it('should throw error if exemption is not PENDING', async () => {
      (mockedPrisma.exemption.findUnique as jest.Mock).mockResolvedValue({
        id: 'exemption-1',
        status: 'APPROVED',
      } as any);

      await expect(
        approveExemption('exemption-1', {
          exemptionAmount: 1000,
          approvedBy: 'user-1',
        })
      ).rejects.toThrow('already APPROVED');
    });

    it('should not trigger recomputation if no tax computation exists', async () => {
      (mockedPrisma.exemption.findUnique as jest.Mock).mockResolvedValue({
        id: 'exemption-1',
        status: 'PENDING',
        transactionId: 'transaction-1',
        taxComputationId: null,
        transaction: { id: 'transaction-1' },
      } as any);

      (mockedPrisma.exemption.update as jest.Mock).mockResolvedValue({
        id: 'exemption-1',
        status: 'APPROVED',
      } as any);

      await approveExemption('exemption-1', {
        exemptionAmount: 1000,
        approvedBy: 'user-1',
      });

      expect(mockedComputeTax).not.toHaveBeenCalled();
    });
  });

  describe('rejectExemption', () => {
    it('should reject an exemption with reason', async () => {
      const exemptionId = 'exemption-1';
      const userId = 'user-1';
      const rejectionReason = 'Documents are insufficient';

      (mockedPrisma.exemption.findUnique as jest.Mock).mockResolvedValue({
        id: exemptionId,
        status: 'PENDING',
      } as any);

      (mockedPrisma.exemption.update as jest.Mock).mockResolvedValue({
        id: exemptionId,
        status: 'REJECTED',
        rejectedBy: userId,
        rejectedAt: new Date(),
        rejectionReason,
      } as any);

      const result = await rejectExemption(exemptionId, {
        rejectionReason,
      });

      expect(mockedPrisma.exemption.update).toHaveBeenCalledWith({
        where: { id: exemptionId },
        data: {
          status: 'REJECTED',
          rejectedAt: expect.any(Date),
          rejectionReason,
        },
      });
      expect(result.status).toBe('REJECTED');
    });

    it('should throw error if exemption is not PENDING', async () => {
      (mockedPrisma.exemption.findUnique as jest.Mock).mockResolvedValue({
        id: 'exemption-1',
        status: 'REJECTED',
      } as any);

      await expect(
        rejectExemption('exemption-1', {
          rejectionReason: 'Test',
        })
      ).rejects.toThrow('already REJECTED');
    });
  });

  describe('getExemptionsByTransaction', () => {
    it('should return all exemptions for a transaction', async () => {
      const transactionId = 'transaction-1';
      const exemptions = [
        {
          id: 'exemption-1',
          transactionId,
          status: 'PENDING',
        },
        {
          id: 'exemption-2',
          transactionId,
          status: 'APPROVED',
        },
      ];

      (mockedPrisma.exemption.findMany as jest.Mock).mockResolvedValue(exemptions as any);

      const result = await getExemptionsByTransaction(transactionId);

      expect(mockedPrisma.exemption.findMany).toHaveBeenCalledWith({
        where: { transactionId },
        orderBy: { createdAt: 'desc' },
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

  describe('getExemption', () => {
    it('should return exemption by ID', async () => {
      const exemptionId = 'exemption-1';
      const exemption = {
        id: exemptionId,
        transactionId: 'transaction-1',
        status: 'PENDING',
      };

      (mockedPrisma.exemption.findUnique as jest.Mock).mockResolvedValue(exemption as any);

      const result = await getExemption(exemptionId);

      expect(mockedPrisma.exemption.findUnique).toHaveBeenCalledWith({
        where: { id: exemptionId },
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
      expect(result.id).toBe(exemptionId);
    });

    it('should throw error if exemption not found', async () => {
      (mockedPrisma.exemption.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getExemption('non-existent')).rejects.toThrow('Exemption not found');
    });
  });

  describe('applyExemptionsToComputation', () => {
    it('should link approved exemptions to computation', async () => {
      const taxComputationId = 'computation-1';
      const exemptionIds = ['exemption-1', 'exemption-2'];

      (mockedPrisma.exemption.findMany as jest.Mock).mockResolvedValue([
        { id: 'exemption-1', status: 'APPROVED' },
        { id: 'exemption-2', status: 'APPROVED' },
      ] as any);

      (mockedPrisma.taxComputation.update as jest.Mock).mockResolvedValue({
        id: taxComputationId,
        exemptionsApplied: exemptionIds,
      } as any);

      (mockedPrisma.exemption.updateMany as jest.Mock).mockResolvedValue({ count: 2 } as any);

      await applyExemptionsToComputation(taxComputationId, exemptionIds);

      expect(mockedPrisma.exemption.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: exemptionIds },
          status: 'APPROVED',
        },
      });
      expect(mockedPrisma.taxComputation.update).toHaveBeenCalledWith({
        where: { id: taxComputationId },
        data: {
          exemptionsApplied: exemptionIds,
        },
        include: {
          exemptions: true,
        },
      });
      expect(mockedPrisma.exemption.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: exemptionIds },
        },
        data: {
          taxComputationId,
        },
      });
    });

    it('should throw error if some exemptions are not approved', async () => {
      const taxComputationId = 'computation-1';
      const exemptionIds = ['exemption-1', 'exemption-2'];

      (mockedPrisma.exemption.findMany as jest.Mock).mockResolvedValue([
        { id: 'exemption-1', status: 'APPROVED' },
        // exemption-2 is missing or not approved
      ] as any);

      await expect(applyExemptionsToComputation(taxComputationId, exemptionIds)).rejects.toThrow(
        'Some exemptions are not approved'
      );
    });
  });
});
