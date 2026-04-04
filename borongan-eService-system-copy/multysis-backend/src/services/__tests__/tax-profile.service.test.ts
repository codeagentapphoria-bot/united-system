import {
  createTaxProfile,
  getTaxProfile,
  getTaxProfiles,
  updateTaxProfile,
  deleteTaxProfile,
  getTaxProfileVersions,
  createTaxProfileVersion,
  activateTaxProfileVersion,
  getTaxVersionForDate,
} from '../tax-profile.service';
import prisma from '../../config/database';
import { createSampleTaxConfiguration } from './helpers/test-factories';

// Mock Prisma
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    service: {
      findUnique: jest.fn(),
    },
    taxProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    taxProfileVersion: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Tax Profile Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTaxProfile', () => {
    it('should create tax profile successfully', async () => {
      const serviceData = {
        id: 'service-1',
        code: 'RPTAX',
        name: 'Real Property Tax',
      };

      const taxProfileData = {
        serviceId: 'service-1',
        name: 'RPTAX Residential',
        variant: 'Residential',
        isActive: true,
      };

      (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(serviceData as any);
      (mockedPrisma.taxProfile.create as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        ...taxProfileData,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await createTaxProfile(taxProfileData);

      expect(mockedPrisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-1' },
      });
      expect(mockedPrisma.taxProfile.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'RPTAX Residential');
    });

    it('should throw error for invalid service ID', async () => {
      (mockedPrisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        createTaxProfile({
          serviceId: 'invalid-service',
          name: 'Test Profile',
        })
      ).rejects.toThrow('Service not found');
    });
  });

  describe('getTaxProfile', () => {
    it('should get tax profile successfully', async () => {
      const taxProfile = {
        id: 'profile-1',
        serviceId: 'service-1',
        name: 'RPTAX Residential',
        variant: 'Residential',
        isActive: true,
        service: {
          id: 'service-1',
          code: 'RPTAX',
          name: 'Real Property Tax',
        },
        versions: [],
      };

      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue(taxProfile as any);

      const result = await getTaxProfile('profile-1');

      expect(mockedPrisma.taxProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
        include: {
          service: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          versions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      expect(result).toEqual(taxProfile);
    });

    it('should throw error when tax profile not found', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getTaxProfile('non-existent')).rejects.toThrow('Tax profile not found');
    });
  });

  describe('getTaxProfiles', () => {
    it('should get tax profiles with pagination', async () => {
      const taxProfiles = [
        {
          id: 'profile-1',
          name: 'RPTAX Residential',
          service: { id: 'service-1', code: 'RPTAX', name: 'Real Property Tax' },
          _count: { versions: 2 },
        },
      ];

      (mockedPrisma.taxProfile.findMany as jest.Mock).mockResolvedValue(taxProfiles as any);
      (mockedPrisma.taxProfile.count as jest.Mock).mockResolvedValue(1);

      const result = await getTaxProfiles({}, { page: 1, limit: 10 });

      expect(result.taxProfiles).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter by service ID', async () => {
      (mockedPrisma.taxProfile.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.taxProfile.count as jest.Mock).mockResolvedValue(0);

      await getTaxProfiles({ serviceId: 'service-1' }, { page: 1, limit: 10 });

      expect(mockedPrisma.taxProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceId: 'service-1',
          }),
        })
      );
    });

    it('should filter by isActive', async () => {
      (mockedPrisma.taxProfile.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.taxProfile.count as jest.Mock).mockResolvedValue(0);

      await getTaxProfiles({ isActive: true }, { page: 1, limit: 10 });

      expect(mockedPrisma.taxProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it('should filter by search', async () => {
      (mockedPrisma.taxProfile.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.taxProfile.count as jest.Mock).mockResolvedValue(0);

      await getTaxProfiles({ search: 'RPTAX' }, { page: 1, limit: 10 });

      expect(mockedPrisma.taxProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'RPTAX', mode: 'insensitive' } },
              { variant: { contains: 'RPTAX', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });
  });

  describe('updateTaxProfile', () => {
    it('should update tax profile successfully', async () => {
      const existingProfile = {
        id: 'profile-1',
        name: 'RPTAX Residential',
        variant: 'Residential',
        isActive: true,
      };

      const updatedProfile = {
        ...existingProfile,
        name: 'RPTAX Commercial',
      };

      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue(existingProfile as any);
      (mockedPrisma.taxProfile.update as jest.Mock).mockResolvedValue(updatedProfile as any);

      const result = await updateTaxProfile('profile-1', {
        name: 'RPTAX Commercial',
      });

      expect(mockedPrisma.taxProfile.update).toHaveBeenCalled();
      expect(result.name).toBe('RPTAX Commercial');
    });

    it('should throw error when tax profile not found', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(updateTaxProfile('non-existent', { name: 'New Name' })).rejects.toThrow(
        'Tax profile not found'
      );
    });
  });

  describe('deleteTaxProfile', () => {
    it('should delete tax profile successfully', async () => {
      const taxProfile = {
        id: 'profile-1',
        versions: [
          {
            _count: { computations: 0 },
          },
        ],
      };

      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue(taxProfile as any);
      (mockedPrisma.taxProfile.delete as jest.Mock).mockResolvedValue({} as any);

      await deleteTaxProfile('profile-1');

      expect(mockedPrisma.taxProfile.delete).toHaveBeenCalledWith({
        where: { id: 'profile-1' },
      });
    });

    it('should throw error when tax profile has computations', async () => {
      const taxProfile = {
        id: 'profile-1',
        versions: [
          {
            _count: { computations: 1 },
          },
        ],
      };

      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue(taxProfile as any);

      await expect(deleteTaxProfile('profile-1')).rejects.toThrow(
        'Cannot delete tax profile with existing computations'
      );
    });

    it('should throw error when tax profile not found', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(deleteTaxProfile('non-existent')).rejects.toThrow('Tax profile not found');
    });
  });

  describe('getTaxProfileVersions', () => {
    it('should get tax profile versions successfully', async () => {
      const versions = [
        {
          id: 'version-1',
          version: '1.0.0',
          status: 'ACTIVE',
        },
        {
          id: 'version-2',
          version: '2.0.0',
          status: 'DRAFT',
        },
      ];

      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'profile-1',
      } as any);
      (mockedPrisma.taxProfileVersion.findMany as jest.Mock).mockResolvedValue(versions as any);

      const result = await getTaxProfileVersions('profile-1');

      expect(result).toEqual(versions);
      expect(mockedPrisma.taxProfileVersion.findMany).toHaveBeenCalledWith({
        where: { taxProfileId: 'profile-1' },
        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should throw error when tax profile not found', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getTaxProfileVersions('non-existent')).rejects.toThrow('Tax profile not found');
    });
  });

  describe('createTaxProfileVersion', () => {
    const taxProfileId = 'profile-1';
    const config = createSampleTaxConfiguration();

    it('should create version with auto-version', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue({
        id: taxProfileId,
      } as any);
      (mockedPrisma.taxProfileVersion.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.taxProfileVersion.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.taxProfileVersion.findMany as jest.Mock).mockResolvedValueOnce([]); // For overlap check
      (mockedPrisma.taxProfileVersion.create as jest.Mock).mockResolvedValue({
        id: 'version-1',
        version: '1.0.0',
        status: 'DRAFT',
      } as any);

      const result = await createTaxProfileVersion(taxProfileId, {
        effectiveFrom: new Date('2026-01-01'),
        changeReason: 'Initial version',
        configuration: config,
        createdBy: 'user-1',
      });

      expect(result.version).toBe('1.0.0');
      expect(mockedPrisma.taxProfileVersion.create).toHaveBeenCalled();
    });

    it('should auto-increment version number', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue({
        id: taxProfileId,
      } as any);
      (mockedPrisma.taxProfileVersion.findMany as jest.Mock)
        .mockResolvedValueOnce([{ version: '1.0.0' }] as any)
        .mockResolvedValueOnce([]); // For overlap check
      (mockedPrisma.taxProfileVersion.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.taxProfileVersion.create as jest.Mock).mockResolvedValue({
        id: 'version-2',
        version: '2.0.0',
        status: 'DRAFT',
      } as any);

      const result = await createTaxProfileVersion(taxProfileId, {
        effectiveFrom: new Date('2026-01-01'),
        changeReason: 'New version',
        configuration: config,
        createdBy: 'user-1',
      });

      expect(result.version).toBe('2.0.0');
    });

    it('should create version with manual version', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue({
        id: taxProfileId,
      } as any);
      (mockedPrisma.taxProfileVersion.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.taxProfileVersion.findMany as jest.Mock).mockResolvedValue([]); // For overlap check
      (mockedPrisma.taxProfileVersion.create as jest.Mock).mockResolvedValue({
        id: 'version-1',
        version: '1.5.0',
        status: 'DRAFT',
      } as any);

      const result = await createTaxProfileVersion(taxProfileId, {
        version: '1.5.0',
        effectiveFrom: new Date('2026-01-01'),
        changeReason: 'Manual version',
        configuration: config,
        createdBy: 'user-1',
      });

      expect(result.version).toBe('1.5.0');
    });

    it('should throw error for missing change reason', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue({
        id: taxProfileId,
      } as any);

      await expect(
        createTaxProfileVersion(taxProfileId, {
          effectiveFrom: new Date('2026-01-01'),
          changeReason: '',
          configuration: config,
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Change reason is required');
    });

    it('should throw error for duplicate version', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue({
        id: taxProfileId,
      } as any);
      (mockedPrisma.taxProfileVersion.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-version',
        version: '1.0.0',
      } as any);

      await expect(
        createTaxProfileVersion(taxProfileId, {
          version: '1.0.0',
          effectiveFrom: new Date('2026-01-01'),
          changeReason: 'Duplicate',
          configuration: config,
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Version 1.0.0 already exists for this tax profile');
    });

    it('should throw error for invalid effective dates', async () => {
      (mockedPrisma.taxProfile.findUnique as jest.Mock).mockResolvedValue({
        id: taxProfileId,
      } as any);
      (mockedPrisma.taxProfileVersion.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.taxProfileVersion.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        createTaxProfileVersion(taxProfileId, {
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: new Date('2025-12-31'),
          changeReason: 'Invalid dates',
          configuration: config,
          createdBy: 'user-1',
        })
      ).rejects.toThrow('Effective from date must be before effective to date');
    });
  });

  describe('activateTaxProfileVersion', () => {
    it('should activate version and archive previous', async () => {
      const version = {
        id: 'version-2',
        taxProfileId: 'profile-1',
        status: 'DRAFT',
        effectiveFrom: new Date('2026-07-01'),
        taxProfile: { id: 'profile-1' },
      };

      const previousActive = {
        id: 'version-1',
        taxProfileId: 'profile-1',
        status: 'ACTIVE',
        effectiveFrom: new Date('2026-01-01'),
      };

      (mockedPrisma.taxProfileVersion.findUnique as jest.Mock).mockResolvedValue(version as any);
      (mockedPrisma.taxProfileVersion.findFirst as jest.Mock).mockResolvedValue(
        previousActive as any
      );
      (mockedPrisma.taxProfileVersion.update as jest.Mock)
        .mockResolvedValueOnce({ ...previousActive, status: 'ARCHIVED' } as any)
        .mockResolvedValueOnce({ ...version, status: 'ACTIVE' } as any);

      const result = await activateTaxProfileVersion('version-2');

      expect(mockedPrisma.taxProfileVersion.update).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw error when version already active', async () => {
      const version = {
        id: 'version-1',
        status: 'ACTIVE',
        taxProfile: { id: 'profile-1' },
      };

      (mockedPrisma.taxProfileVersion.findUnique as jest.Mock).mockResolvedValue(version as any);

      await expect(activateTaxProfileVersion('version-1')).rejects.toThrow(
        'Version is already active'
      );
    });

    it('should throw error when version not found', async () => {
      (mockedPrisma.taxProfileVersion.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(activateTaxProfileVersion('non-existent')).rejects.toThrow(
        'Tax profile version not found'
      );
    });
  });

  describe('getTaxVersionForDate', () => {
    it('should select correct version for date', async () => {
      const version = {
        id: 'version-1',
        version: '1.0.0',
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        status: 'ACTIVE',
      };

      (mockedPrisma.taxProfileVersion.findMany as jest.Mock).mockResolvedValue([version] as any);

      const result = await getTaxVersionForDate('profile-1', new Date('2026-06-15'));

      expect(result).toEqual(version);
      expect(mockedPrisma.taxProfileVersion.findMany).toHaveBeenCalledWith({
        where: {
          taxProfileId: 'profile-1',
          effectiveFrom: { lte: expect.any(Date) },
        },
        orderBy: { effectiveFrom: 'desc' },
      });
    });

    it('should return null if no version found', async () => {
      (mockedPrisma.taxProfileVersion.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getTaxVersionForDate('profile-1', new Date('2025-01-01'));

      expect(result).toBeNull();
    });

    it('should handle version with effectiveTo date', async () => {
      const version = {
        id: 'version-1',
        version: '1.0.0',
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: new Date('2026-12-31'),
        status: 'ACTIVE',
      };

      (mockedPrisma.taxProfileVersion.findMany as jest.Mock).mockResolvedValue([version] as any);

      const result = await getTaxVersionForDate('profile-1', new Date('2026-06-15'));

      expect(result).toEqual(version);
    });
  });
});
