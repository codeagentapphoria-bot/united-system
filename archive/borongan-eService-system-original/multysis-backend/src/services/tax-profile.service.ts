import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { TaxConfiguration } from './tax-engine.service';

export interface CreateTaxProfileData {
  serviceId: string;
  name: string;
  variant?: string;
  isActive?: boolean;
}

export interface UpdateTaxProfileData {
  name?: string;
  variant?: string;
  isActive?: boolean;
}

export interface CreateTaxProfileVersionData {
  version?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
  changeReason: string;
  configuration: TaxConfiguration;
  createdBy: string;
}

export interface UpdateTaxProfileVersionData {
  configuration?: TaxConfiguration;
  changeReason?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
}

export interface TaxProfileFilters {
  serviceId?: string;
  isActive?: boolean;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Create a new tax profile
 */
export const createTaxProfile = async (data: CreateTaxProfileData) => {
  // Verify service exists
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  const taxProfile = await prisma.taxProfile.create({
    data: {
      serviceId: data.serviceId,
      name: data.name,
      variant: data.variant || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  return taxProfile;
};

/**
 * Get a single tax profile by ID
 */
export const getTaxProfile = async (id: string) => {
  const taxProfile = await prisma.taxProfile.findUnique({
    where: { id },
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

  if (!taxProfile) {
    throw new Error('Tax profile not found');
  }

  return taxProfile;
};

/**
 * Get tax profiles with filters and pagination
 */
export const getTaxProfiles = async (filters: TaxProfileFilters, pagination: PaginationOptions) => {
  const { serviceId, isActive, search } = filters;
  const { page, limit } = pagination;

  const where: Prisma.TaxProfileWhereInput = {};

  if (serviceId) {
    where.serviceId = serviceId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { variant: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [taxProfiles, total] = await Promise.all([
    prisma.taxProfile.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            versions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.taxProfile.count({ where }),
  ]);

  return {
    taxProfiles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update a tax profile
 */
export const updateTaxProfile = async (id: string, data: UpdateTaxProfileData) => {
  const taxProfile = await prisma.taxProfile.findUnique({
    where: { id },
  });

  if (!taxProfile) {
    throw new Error('Tax profile not found');
  }

  const updated = await prisma.taxProfile.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.variant !== undefined && { variant: data.variant || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  return updated;
};

/**
 * Delete a tax profile
 */
export const deleteTaxProfile = async (id: string) => {
  const taxProfile = await prisma.taxProfile.findUnique({
    where: { id },
    include: {
      versions: {
        include: {
          _count: {
            select: {
              computations: true,
            },
          },
        },
      },
    },
  });

  if (!taxProfile) {
    throw new Error('Tax profile not found');
  }

  // Check if any version has computations
  const hasComputations = taxProfile.versions.some((v) => v._count.computations > 0);

  if (hasComputations) {
    throw new Error('Cannot delete tax profile with existing computations');
  }

  await prisma.taxProfile.delete({
    where: { id },
  });
};

/**
 * Get all versions for a tax profile
 */
export const getTaxProfileVersions = async (taxProfileId: string) => {
  const taxProfile = await prisma.taxProfile.findUnique({
    where: { id: taxProfileId },
  });

  if (!taxProfile) {
    throw new Error('Tax profile not found');
  }

  const versions = await prisma.taxProfileVersion.findMany({
    where: { taxProfileId },
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
  });

  return versions;
};

/**
 * Create a new tax profile version
 */
export const createTaxProfileVersion = async (
  taxProfileId: string,
  data: CreateTaxProfileVersionData
) => {
  const taxProfile = await prisma.taxProfile.findUnique({
    where: { id: taxProfileId },
  });

  if (!taxProfile) {
    throw new Error('Tax profile not found');
  }

  if (!data.changeReason || data.changeReason.trim() === '') {
    throw new Error('Change reason is required');
  }

  // Auto-suggest version number if not provided
  let version = data.version;
  if (!version) {
    const existingVersions = await prisma.taxProfileVersion.findMany({
      where: { taxProfileId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (existingVersions.length > 0) {
      const lastVersion = existingVersions[0].version;
      const parts = lastVersion.split('.');
      const major = parseInt(parts[0]) || 1;
      version = `${major + 1}.0.0`;
    } else {
      version = '1.0.0';
    }
  }

  // Check if version already exists
  const existingVersion = await prisma.taxProfileVersion.findUnique({
    where: {
      taxProfileId_version: {
        taxProfileId,
        version,
      },
    },
  });

  if (existingVersion) {
    throw new Error(`Version ${version} already exists for this tax profile`);
  }

  // Validate effective dates
  if (data.effectiveTo && data.effectiveFrom >= data.effectiveTo) {
    throw new Error('Effective from date must be before effective to date');
  }

  // Check for overlapping effective dates with ACTIVE versions
  const overlappingVersions = await prisma.taxProfileVersion.findMany({
    where: {
      taxProfileId,
      status: 'ACTIVE',
      OR: [
        {
          effectiveFrom: { lte: data.effectiveTo || new Date('2099-12-31') },
          effectiveTo: { gte: data.effectiveFrom },
        },
        {
          effectiveFrom: { lte: data.effectiveTo || new Date('2099-12-31') },
          effectiveTo: null,
        },
      ],
    },
  });

  if (overlappingVersions.length > 0 && data.effectiveTo) {
    // Allow overlap if explicitly setting effectiveTo
    // The activate function will handle archiving
  }

  const taxProfileVersion = await prisma.taxProfileVersion.create({
    data: {
      taxProfileId,
      version,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo || null,
      status: 'DRAFT',
      changeReason: data.changeReason,
      configuration: data.configuration as unknown as Prisma.InputJsonValue,
      createdBy: data.createdBy,
    },
  });

  return taxProfileVersion;
};

/**
 * Update a tax profile version
 * Only DRAFT versions can be updated
 */
export const updateTaxProfileVersion = async (
  versionId: string,
  data: UpdateTaxProfileVersionData
) => {
  const version = await prisma.taxProfileVersion.findUnique({
    where: { id: versionId },
    include: {
      taxProfile: true,
    },
  });

  if (!version) {
    throw new Error('Tax profile version not found');
  }

  // Only allow updates to DRAFT versions
  if (version.status !== 'DRAFT') {
    throw new Error('Only DRAFT versions can be updated');
  }

  // Validate effective dates if provided
  if (data.effectiveFrom !== undefined || data.effectiveTo !== undefined) {
    const effectiveFrom = data.effectiveFrom ?? version.effectiveFrom;
    const effectiveTo = data.effectiveTo ?? version.effectiveTo;

    if (effectiveTo !== null && effectiveTo !== undefined && effectiveFrom >= effectiveTo) {
      throw new Error('Effective from date must be before effective to date');
    }

    // Check for overlapping effective dates with ACTIVE versions (excluding current version)
    const overlappingVersions = await prisma.taxProfileVersion.findMany({
      where: {
        taxProfileId: version.taxProfileId,
        status: 'ACTIVE',
        id: { not: versionId },
        OR: [
          {
            effectiveFrom: { lte: effectiveTo || new Date('2099-12-31') },
            effectiveTo: { gte: effectiveFrom },
          },
          {
            effectiveFrom: { lte: effectiveTo || new Date('2099-12-31') },
            effectiveTo: null,
          },
        ],
      },
    });

    if (overlappingVersions.length > 0 && effectiveTo) {
      // This is just a warning - the activate function will handle archiving
      // But we should still allow the update
    }
  }

  // Build update data
  const updateData: any = {};
  if (data.configuration !== undefined) {
    updateData.configuration = data.configuration as unknown as Prisma.InputJsonValue;
  }
  if (data.changeReason !== undefined) {
    if (!data.changeReason || data.changeReason.trim() === '') {
      throw new Error('Change reason cannot be empty');
    }
    updateData.changeReason = data.changeReason.trim();
  }
  if (data.effectiveFrom !== undefined) {
    updateData.effectiveFrom = data.effectiveFrom;
  }
  if (data.effectiveTo !== undefined) {
    updateData.effectiveTo = data.effectiveTo;
  }

  // Update the version
  const updated = await prisma.taxProfileVersion.update({
    where: { id: versionId },
    data: updateData,
  });

  return updated;
};

/**
 * Activate a tax profile version
 */
export const activateTaxProfileVersion = async (versionId: string) => {
  const version = await prisma.taxProfileVersion.findUnique({
    where: { id: versionId },
    include: {
      taxProfile: true,
    },
  });

  if (!version) {
    throw new Error('Tax profile version not found');
  }

  if (version.status === 'ACTIVE') {
    throw new Error('Version is already active');
  }

  // Archive previous active version
  const previousActive = await prisma.taxProfileVersion.findFirst({
    where: {
      taxProfileId: version.taxProfileId,
      status: 'ACTIVE',
    },
  });

  if (previousActive) {
    // Set effectiveTo to the day before the new version's effectiveFrom
    const effectiveTo = new Date(version.effectiveFrom);
    effectiveTo.setDate(effectiveTo.getDate() - 1);

    await prisma.taxProfileVersion.update({
      where: { id: previousActive.id },
      data: {
        status: 'ARCHIVED',
        effectiveTo,
      },
    });
  }

  // Activate the new version
  const activated = await prisma.taxProfileVersion.update({
    where: { id: versionId },
    data: {
      status: 'ACTIVE',
    },
  });

  return activated;
};

/**
 * Archive a tax profile version
 */
export const archiveTaxProfileVersion = async (versionId: string) => {
  const version = await prisma.taxProfileVersion.findUnique({
    where: { id: versionId },
  });

  if (!version) {
    throw new Error('Tax profile version not found');
  }

  if (version.status === 'ARCHIVED') {
    throw new Error('Version is already archived');
  }

  // Check if version has computations
  const computationCount = await prisma.taxComputation.count({
    where: { taxProfileVersionId: versionId },
  });

  if (computationCount > 0 && version.status === 'ACTIVE') {
    throw new Error('Cannot archive active version with existing computations');
  }

  const archived = await prisma.taxProfileVersion.update({
    where: { id: versionId },
    data: {
      status: 'ARCHIVED',
    },
  });

  return archived;
};

/**
 * Get tax version for a specific date
 * Used to select the correct version based on application date
 */
export const getTaxVersionForDate = async (
  taxProfileId: string,
  applicationDate: Date
): Promise<any | null> => {
  // Find version that covers the application date
  // Can be ACTIVE (current) or ARCHIVED (historical)
  // We need to check both ACTIVE and ARCHIVED versions to handle historical transactions

  // Query for versions where:
  // 1. effectiveFrom <= applicationDate (version must have started by this date)
  // 2. AND either:
  //    - (status = ACTIVE AND (effectiveTo IS NULL OR effectiveTo >= applicationDate))
  //    - OR (status = ARCHIVED AND effectiveTo >= applicationDate)

  // First, get all versions that started before or on the application date
  // Use a more explicit date comparison to avoid timezone issues
  const allVersions = await prisma.taxProfileVersion.findMany({
    where: {
      taxProfileId,
      effectiveFrom: { lte: applicationDate },
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  // Filter to find the version that covers the application date
  // Process in order (most recent effectiveFrom first) to get the correct version
  for (const version of allVersions) {
    // Double-check that effectiveFrom is actually <= applicationDate (defensive check)
    if (version.effectiveFrom > applicationDate) {
      continue; // Skip versions that started after the application date
    }

    // Check if this version covers the application date
    if (version.status === 'ACTIVE') {
      // ACTIVE version: must have effectiveTo null or >= applicationDate
      // Note: If effectiveTo is null, it means this version is currently active and has no end date
      // If effectiveTo is set, it must be >= applicationDate to cover the date
      if (version.effectiveTo === null || version.effectiveTo >= applicationDate) {
        return version;
      }
    } else if (version.status === 'ARCHIVED') {
      // ARCHIVED version: must have effectiveTo >= applicationDate
      // This handles historical transactions that need to use old tax rates
      if (version.effectiveTo !== null && version.effectiveTo >= applicationDate) {
        return version;
      }
    }
  }

  return null;
};
