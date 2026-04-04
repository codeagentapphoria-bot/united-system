import {
  computeTaxForTransaction,
  getActiveTaxComputation,
  getTaxComputationHistory,
} from '../tax-computation.service';
import prisma from '../../config/database';
import { getTaxVersionForDate } from '../tax-profile.service';
import { computeTax } from '../tax-engine.service';

// Mock dependencies
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    transaction: {
      findUnique: jest.fn(),
    },
    exemption: {
      findMany: jest.fn(),
    },
    taxComputation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));
jest.mock('../tax-profile.service');
jest.mock('../tax-engine.service');

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedGetTaxVersionForDate = getTaxVersionForDate as jest.MockedFunction<
  typeof getTaxVersionForDate
>;
const mockedComputeTax = computeTax as jest.MockedFunction<typeof computeTax>;

describe('Tax Computation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('computeTaxForTransaction', () => {
    const transactionId = 'transaction-1';
    const taxProfileId = 'profile-1';
    const taxVersionId = 'version-1';

    const mockTransaction = {
      id: transactionId,
      serviceId: 'service-1',
      applicationDate: new Date('2026-06-15'),
      createdAt: new Date('2026-06-15'),
      serviceData: {
        marketValue: 500000,
      },
      service: {
        id: 'service-1',
        taxProfiles: [
          {
            id: taxProfileId,
            isActive: true,
          },
        ],
      },
    };

    const mockTaxVersion = {
      id: taxVersionId,
      taxProfileId,
      version: '1.0.0',
      status: 'ACTIVE',
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
      configuration: {
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
            formula: '${marketValue} * 0.2',
          },
        ],
        finalTax: {
          formula: '${assessedValue} * 0.01',
        },
      },
    };

    const mockComputationResult = {
      inputs: { 'Market Value': 500000 },
      derivedValues: { assessedValue: 100000 },
      breakdown: {
        steps: [
          {
            description: 'Assessed Value',
            calculation: '${marketValue} * 0.2',
            amount: 100000,
          },
          {
            description: 'Basic Tax',
            calculation: '${assessedValue} * 0.01',
            amount: 1000,
          },
        ],
        totalTax: 1000,
      },
      totalTax: 1000,
    };

    beforeEach(() => {
      (mockedPrisma.exemption.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should compute tax for transaction successfully', async () => {
      mockedPrisma.transaction.findUnique = jest.fn().mockResolvedValue(mockTransaction as any);
      mockedGetTaxVersionForDate.mockResolvedValue(mockTaxVersion as any);
      mockedPrisma.taxComputation.updateMany = jest.fn().mockResolvedValue({ count: 0 });
      mockedComputeTax.mockReturnValue(mockComputationResult);
      mockedPrisma.taxComputation.create = jest.fn().mockResolvedValue({
        id: 'computation-1',
        transactionId,
        taxProfileVersionId: taxVersionId,
        isActive: true,
        totalTax: 1000,
      } as any);

      const result = await computeTaxForTransaction(transactionId, 'user-1');

      expect(mockedPrisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: transactionId },
        include: {
          service: {
            include: {
              taxProfiles: {
                where: { isActive: true },
                take: 1,
              },
            },
          },
        },
      });
      expect(mockedGetTaxVersionForDate).toHaveBeenCalledWith(
        taxProfileId,
        mockTransaction.applicationDate
      );
      expect(mockedComputeTax).toHaveBeenCalledWith(
        mockTaxVersion.configuration,
        mockTransaction.serviceData
      );
      expect(mockedPrisma.taxComputation.create).toHaveBeenCalled();
      expect(result.totalTax).toBe(1000);
    });

    it('should deactivate previous active computation', async () => {
      mockedPrisma.transaction.findUnique = jest.fn().mockResolvedValue(mockTransaction as any);
      mockedGetTaxVersionForDate.mockResolvedValue(mockTaxVersion as any);
      mockedPrisma.taxComputation.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      mockedComputeTax.mockReturnValue(mockComputationResult);
      mockedPrisma.taxComputation.create = jest.fn().mockResolvedValue({
        id: 'computation-2',
        transactionId,
        taxProfileVersionId: taxVersionId,
        isActive: true,
        totalTax: 1000,
      } as any);

      await computeTaxForTransaction(transactionId);

      expect(mockedPrisma.taxComputation.updateMany).toHaveBeenCalledWith({
        where: {
          transactionId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    it('should use createdAt if applicationDate is not provided', async () => {
      const transactionWithoutAppDate = {
        ...mockTransaction,
        applicationDate: null,
      };

      mockedPrisma.transaction.findUnique = jest
        .fn()
        .mockResolvedValue(transactionWithoutAppDate as any);
      mockedGetTaxVersionForDate.mockResolvedValue(mockTaxVersion as any);
      mockedPrisma.taxComputation.updateMany = jest.fn().mockResolvedValue({ count: 0 });
      mockedComputeTax.mockReturnValue(mockComputationResult);
      mockedPrisma.taxComputation.create = jest.fn().mockResolvedValue({
        id: 'computation-1',
        transactionId,
        taxProfileVersionId: taxVersionId,
        isActive: true,
        totalTax: 1000,
      } as any);

      await computeTaxForTransaction(transactionId);

      expect(mockedGetTaxVersionForDate).toHaveBeenCalledWith(
        taxProfileId,
        transactionWithoutAppDate.createdAt
      );
    });

    it('should throw error when transaction not found', async () => {
      mockedPrisma.transaction.findUnique = jest.fn().mockResolvedValue(null);

      await expect(computeTaxForTransaction('non-existent')).rejects.toThrow(
        'Transaction not found'
      );
    });

    it('should throw error when service has no tax profile', async () => {
      const transactionWithoutTaxProfile = {
        ...mockTransaction,
        service: {
          id: 'service-1',
          taxProfiles: [],
        },
      };

      mockedPrisma.transaction.findUnique = jest
        .fn()
        .mockResolvedValue(transactionWithoutTaxProfile as any);

      await expect(computeTaxForTransaction(transactionId)).rejects.toThrow(
        'Service does not have an active tax profile'
      );
    });

    it('should throw error when no active version found for date', async () => {
      mockedPrisma.transaction.findUnique = jest.fn().mockResolvedValue(mockTransaction as any);
      mockedGetTaxVersionForDate.mockResolvedValue(null);

      await expect(computeTaxForTransaction(transactionId)).rejects.toThrow(
        'No active tax version found for date'
      );
    });

    it('should store full breakdown in computation', async () => {
      mockedPrisma.transaction.findUnique = jest.fn().mockResolvedValue(mockTransaction as any);
      mockedGetTaxVersionForDate.mockResolvedValue(mockTaxVersion as any);
      mockedPrisma.taxComputation.updateMany = jest.fn().mockResolvedValue({ count: 0 });
      mockedComputeTax.mockReturnValue(mockComputationResult);
      mockedPrisma.taxComputation.create = jest.fn().mockResolvedValue({
        id: 'computation-1',
      } as any);

      await computeTaxForTransaction(transactionId);

      expect(mockedPrisma.taxComputation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          inputs: mockComputationResult.inputs,
          derivedValues: mockComputationResult.derivedValues,
          breakdown: mockComputationResult.breakdown,
          totalTax: mockComputationResult.totalTax,
        }),
      });
    });
  });

  describe('getActiveTaxComputation', () => {
    it('should return active computation', async () => {
      const computation = {
        id: 'computation-1',
        transactionId: 'transaction-1',
        isActive: true,
        totalTax: 1000,
        taxProfileVersion: {
          id: 'version-1',
          version: '1.0.0',
          taxProfile: {
            id: 'profile-1',
            name: 'RPTAX Residential',
            service: {
              id: 'service-1',
              code: 'RPTAX',
              name: 'Real Property Tax',
            },
          },
        },
      };

      mockedPrisma.taxComputation.findFirst = jest.fn().mockResolvedValue(computation as any);

      const result = await getActiveTaxComputation('transaction-1');

      expect(mockedPrisma.taxComputation.findFirst).toHaveBeenCalledWith({
        where: {
          transactionId: 'transaction-1',
          isActive: true,
        },
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
        },
      });
      expect(result).toEqual(computation);
    });

    it('should return null if no active computation exists', async () => {
      mockedPrisma.taxComputation.findFirst = jest.fn().mockResolvedValue(null);

      const result = await getActiveTaxComputation('transaction-1');

      expect(result).toBeNull();
    });
  });

  describe('getTaxComputationHistory', () => {
    it('should return all computations ordered by computedAt desc', async () => {
      const computations = [
        {
          id: 'computation-2',
          transactionId: 'transaction-1',
          isActive: true,
          computedAt: new Date('2026-06-16'),
          totalTax: 1200,
        },
        {
          id: 'computation-1',
          transactionId: 'transaction-1',
          isActive: false,
          computedAt: new Date('2026-06-15'),
          totalTax: 1000,
        },
      ];

      mockedPrisma.taxComputation.findMany = jest.fn().mockResolvedValue(computations as any);

      const result = await getTaxComputationHistory('transaction-1');

      expect(mockedPrisma.taxComputation.findMany).toHaveBeenCalledWith({
        where: {
          transactionId: 'transaction-1',
        },
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
        },
        orderBy: { computedAt: 'desc' },
      });
      expect(result).toEqual(computations);
      expect(result[0].id).toBe('computation-2'); // Most recent first
    });

    it('should return empty array if no computations exist', async () => {
      mockedPrisma.taxComputation.findMany = jest.fn().mockResolvedValue([]);

      const result = await getTaxComputationHistory('transaction-1');

      expect(result).toEqual([]);
    });
  });
});
