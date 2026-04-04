import {
  reassessTax,
  getReassessmentHistory,
  getReassessmentComparison,
} from '../tax-reassessment.service';
import { computeTaxForTransaction } from '../tax-computation.service';
import prisma from '../../config/database';

// Mock dependencies
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    taxComputation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
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

describe('Tax Reassessment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reassessTax', () => {
    it('should deactivate old computation and create new one with difference', async () => {
      const transactionId = 'transaction-1';
      const oldComputationId = 'computation-1';
      const newComputationId = 'computation-2';
      const reason = 'Property value was reassessed';
      const computedBy = 'user-1';

      const oldComputation = {
        id: oldComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: null,
        isActive: true,
        taxProfileVersion: {
          id: 'version-1',
        },
      };

      const newComputation = {
        id: newComputationId,
        transactionId,
        totalTax: 12000,
        adjustedTax: null,
        isActive: true,
        taxProfileVersion: {
          id: 'version-1',
          taxProfile: {
            id: 'profile-1',
            service: {
              id: 'service-1',
              code: 'RPTAX',
              name: 'Real Property Tax',
            },
          },
        },
      };

      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValueOnce(
        oldComputation as any
      );
      (mockedPrisma.taxComputation.update as jest.Mock).mockResolvedValueOnce({
        ...oldComputation,
        isActive: false,
      } as any);
      mockedComputeTax.mockResolvedValue(newComputation as any);
      (mockedPrisma.taxComputation.update as jest.Mock).mockResolvedValueOnce({
        ...newComputation,
        isReassessment: true,
        reassessmentReason: reason,
        previousComputationId: oldComputationId,
        differenceAmount: 2000,
        previousComputation: {
          id: oldComputationId,
          totalTax: 10000,
          adjustedTax: null,
          breakdown: {},
          computedAt: new Date(),
        },
      } as any);

      const result = await reassessTax(transactionId, {
        reason,
        computedBy,
      });

      expect(mockedPrisma.taxComputation.findFirst).toHaveBeenCalledWith({
        where: {
          transactionId,
          isActive: true,
        },
        include: {
          taxProfileVersion: true,
        },
      });
      expect(mockedPrisma.taxComputation.update).toHaveBeenCalledWith({
        where: { id: oldComputationId },
        data: {
          isActive: false,
        },
      });
      expect(mockedComputeTax).toHaveBeenCalledWith(transactionId, computedBy);
      expect(result.newComputation.isReassessment).toBe(true);
      expect(result.newComputation.reassessmentReason).toBe(reason);
      expect(result.newComputation.previousComputationId).toBe(oldComputationId);
      expect(result.differenceAmount).toBe(2000);
    });

    it('should calculate difference correctly (decrease)', async () => {
      const transactionId = 'transaction-1';
      const oldComputationId = 'computation-1';
      const newComputationId = 'computation-2';

      const oldComputation = {
        id: oldComputationId,
        transactionId,
        totalTax: 10000,
        adjustedTax: null,
        isActive: true,
        taxProfileVersion: { id: 'version-1' },
      };

      const newComputation = {
        id: newComputationId,
        transactionId,
        totalTax: 8000,
        adjustedTax: null,
        isActive: true,
        taxProfileVersion: {
          id: 'version-1',
          taxProfile: {
            id: 'profile-1',
            service: { id: 'service-1', code: 'RPTAX', name: 'RPTAX' },
          },
        },
      };

      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValueOnce(
        oldComputation as any
      );
      (mockedPrisma.taxComputation.update as jest.Mock).mockResolvedValueOnce({
        ...oldComputation,
        isActive: false,
      } as any);
      mockedComputeTax.mockResolvedValue(newComputation as any);
      (mockedPrisma.taxComputation.update as jest.Mock).mockResolvedValueOnce({
        ...newComputation,
        isReassessment: true,
        reassessmentReason: 'Test',
        previousComputationId: oldComputationId,
        differenceAmount: -2000,
        previousComputation: {
          id: oldComputationId,
          totalTax: 10000,
          adjustedTax: null,
          breakdown: {},
          computedAt: new Date(),
        },
      } as any);

      const result = await reassessTax(transactionId, {
        reason: 'Test',
        computedBy: 'user-1',
      });

      expect(result.differenceAmount).toBe(-2000);
    });

    it('should throw error if no active computation found', async () => {
      (mockedPrisma.taxComputation.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        reassessTax('transaction-1', {
          reason: 'Test',
          computedBy: 'user-1',
        })
      ).rejects.toThrow('No active tax computation found');
    });
  });

  describe('getReassessmentHistory', () => {
    it('should return all computations ordered by computedAt', async () => {
      const transactionId = 'transaction-1';
      const computations = [
        {
          id: 'computation-3',
          transactionId,
          computedAt: new Date('2024-01-03'),
          isReassessment: true,
        },
        {
          id: 'computation-2',
          transactionId,
          computedAt: new Date('2024-01-02'),
          isReassessment: true,
        },
        {
          id: 'computation-1',
          transactionId,
          computedAt: new Date('2024-01-01'),
          isReassessment: false,
        },
      ];

      (mockedPrisma.taxComputation.findMany as jest.Mock).mockResolvedValue(computations as any);

      const result = await getReassessmentHistory(transactionId);

      expect(mockedPrisma.taxComputation.findMany).toHaveBeenCalledWith({
        where: { transactionId },
        include: {
          taxProfileVersion: {
            include: {
              taxProfile: {
                include: {
                  service: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          previousComputation: {
            select: {
              id: true,
              totalTax: true,
              adjustedTax: true,
              computedAt: true,
            },
          },
        },
        orderBy: { computedAt: 'desc' },
      });
      expect(result).toHaveLength(3);
    });
  });

  describe('getReassessmentComparison', () => {
    it('should return comparison of old and new computations', async () => {
      const computationId = 'computation-2';
      const previousComputationId = 'computation-1';

      const computation = {
        id: computationId,
        isReassessment: true,
        totalTax: 12000,
        adjustedTax: null,
        breakdown: { steps: [] },
        inputs: {},
        derivedValues: {},
        computedAt: new Date('2024-01-02'),
        reassessmentReason: 'Property reassessed',
        differenceAmount: 2000,
        previousComputation: {
          id: previousComputationId,
          totalTax: 10000,
          adjustedTax: null,
          breakdown: { steps: [] },
          inputs: {},
          derivedValues: {},
          computedAt: new Date('2024-01-01'),
        },
        taxProfileVersion: {
          id: 'version-1',
          taxProfile: {
            id: 'profile-1',
            service: {
              id: 'service-1',
              code: 'RPTAX',
              name: 'Real Property Tax',
            },
          },
        },
      };

      (mockedPrisma.taxComputation.findUnique as jest.Mock).mockResolvedValue(computation as any);

      const result = await getReassessmentComparison(computationId);

      expect(mockedPrisma.taxComputation.findUnique).toHaveBeenCalledWith({
        where: { id: computationId },
        include: {
          previousComputation: {
            select: {
              id: true,
              totalTax: true,
              adjustedTax: true,
              breakdown: true,
              inputs: true,
              derivedValues: true,
              computedAt: true,
            },
          },
          taxProfileVersion: {
            include: {
              taxProfile: {
                include: {
                  service: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      expect(result.oldComputation.id).toBe(previousComputationId);
      expect(result.newComputation.id).toBe(computationId);
      expect(result.differenceAmount).toBe(2000);
    });

    it('should throw error if computation not found', async () => {
      (mockedPrisma.taxComputation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getReassessmentComparison('non-existent')).rejects.toThrow(
        'Tax computation not found'
      );
    });

    it('should throw error if computation is not a reassessment', async () => {
      (mockedPrisma.taxComputation.findUnique as jest.Mock).mockResolvedValue({
        id: 'computation-1',
        isReassessment: false,
      } as any);

      await expect(getReassessmentComparison('computation-1')).rejects.toThrow(
        'not a reassessment'
      );
    });
  });
});
