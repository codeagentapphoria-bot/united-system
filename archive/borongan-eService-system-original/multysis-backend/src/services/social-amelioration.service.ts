import { BeneficiaryStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { getFileUrl } from '../middleware/upload';

interface BeneficiaryFilters {
  search?: string;
  status?: BeneficiaryStatus;
  programId?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

const SENIOR_PREFIX = 'SC';
const PWD_PREFIX = 'PWD';
const STUDENT_PREFIX = 'ST';
const SOLO_PARENT_PREFIX = 'SP';

const getPagination = (options?: PaginationOptions) => {
  const page = options?.page && options.page > 0 ? options.page : 1;
  const limit = options?.limit && options.limit > 0 ? Math.min(options.limit, 100) : 10;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildSearchClauses = (search?: string) => {
  if (!search) return undefined;
  const contains = { contains: search, mode: 'insensitive' as const };
  return [
    { citizen: { firstName: contains } },
    { citizen: { middleName: contains } },
    { citizen: { lastName: contains } },
    { citizen: { extensionName: contains } },
  ];
};

const dateRangeForYear = (year: number) => ({
  start: new Date(`${year}-01-01T00:00:00.000Z`),
  end: new Date(`${year + 1}-01-01T00:00:00.000Z`),
});

const generateSequentialId = async (type: 'SENIOR' | 'PWD' | 'STUDENT' | 'SOLO_PARENT') => {
  const year = new Date().getFullYear();
  const { start, end } = dateRangeForYear(year);

  let count = 0;
  let prefix = '';

  switch (type) {
    case 'SENIOR':
      prefix = SENIOR_PREFIX;
      count = await prisma.seniorCitizenBeneficiary.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      break;
    case 'PWD':
      prefix = PWD_PREFIX;
      count = await prisma.pWDBeneficiary.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      break;
    case 'STUDENT':
      prefix = STUDENT_PREFIX;
      count = await prisma.studentBeneficiary.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      break;
    case 'SOLO_PARENT':
      prefix = SOLO_PARENT_PREFIX;
      count = await prisma.soloParentBeneficiary.count({
        where: { createdAt: { gte: start, lt: end } },
      });
      break;
  }

  return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
};

// Helper function to fetch programs for a beneficiary
// Includes both explicitly assigned programs and ALL type programs
const getBeneficiaryPrograms = async (
  beneficiaryType: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT',
  beneficiaryId: string
) => {
  // Fetch explicitly assigned programs from pivot table
  const assignedPrograms = await (prisma as any).beneficiaryProgramPivot.findMany({
    where: {
      beneficiaryType: beneficiaryType,
      beneficiaryId: beneficiaryId,
    },
    select: {
      programId: true,
    },
  });

  // Fetch ALL type programs that are active (available to all beneficiaries)
  const allTypePrograms = await prisma.governmentProgram.findMany({
    where: {
      type: 'ALL',
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  // Combine and deduplicate program IDs
  const assignedIds = new Set(assignedPrograms.map((p: any) => p.programId));
  const allTypeIds = allTypePrograms.map((p) => p.id);

  // Return combined list with programId field for consistency
  return [
    ...assignedPrograms,
    ...allTypeIds
      .filter((id) => !assignedIds.has(id)) // Avoid duplicates
      .map((id) => ({ programId: id })),
  ];
};

const seniorInclude = {
  citizen: {
    include: {
      placeOfBirth: true,
    },
  },
  pensionTypes: {
    include: {
      setting: true,
    },
  },
} as any;

const pwdInclude = {
  citizen: {
    include: {
      placeOfBirth: true,
    },
  },
  disabilityType: true,
} as any;

const studentInclude = {
  citizen: {
    include: {
      placeOfBirth: true,
    },
  },
  gradeLevel: true,
} as any;

const soloParentInclude = {
  citizen: {
    include: {
      placeOfBirth: true,
    },
  },
  category: true,
} as any;

type SeniorWithRelations = any;
type PWDWithRelations = any;
type StudentWithRelations = any;
type SoloParentWithRelations = any;

const formatSeniorBeneficiary = async (record: SeniorWithRelations) => {
  const { pensionTypes, citizen, ...rest } = record as any;

  // Fetch programs manually since we can't use Prisma relations
  const programs = await getBeneficiaryPrograms('SENIOR_CITIZEN', record.id);

  return {
    ...rest,
    governmentPrograms: programs.map((p: any) => p.programId) ?? [],
    pensionTypes: pensionTypes?.map((pivot: any) => pivot.settingId) ?? [],
    pensionTypeNames: pensionTypes?.map((pivot: any) => pivot.setting?.name).filter(Boolean) ?? [],
    citizen: citizen
      ? {
          ...citizen,
          citizenPicture: citizen.citizenPicture ? getFileUrl(citizen.citizenPicture) : null,
          proofOfResidency: citizen.proofOfResidency ? getFileUrl(citizen.proofOfResidency) : null,
          proofOfIdentification: citizen.proofOfIdentification
            ? getFileUrl(citizen.proofOfIdentification)
            : null,
        }
      : undefined,
  };
};

const formatPWDBeneficiary = async (record: PWDWithRelations) => {
  const { disabilityType, citizen, ...rest } = record as any;

  // Fetch programs manually since we can't use Prisma relations
  const programs = await getBeneficiaryPrograms('PWD', record.id);

  return {
    ...rest,
    governmentPrograms: programs.map((p: any) => p.programId) ?? [],
    disabilityType: disabilityType?.id || rest.disabilityTypeId,
    disabilityTypeName: disabilityType?.name || null,
    citizen: citizen
      ? {
          ...citizen,
          citizenPicture: citizen.citizenPicture ? getFileUrl(citizen.citizenPicture) : null,
          proofOfResidency: citizen.proofOfResidency ? getFileUrl(citizen.proofOfResidency) : null,
          proofOfIdentification: citizen.proofOfIdentification
            ? getFileUrl(citizen.proofOfIdentification)
            : null,
        }
      : undefined,
  };
};

const formatStudentBeneficiary = async (record: StudentWithRelations) => {
  const { gradeLevel, citizen, ...rest } = record as any;

  // Fetch programs manually since we can't use Prisma relations
  const programs = await getBeneficiaryPrograms('STUDENT', record.id);

  return {
    ...rest,
    programs: programs.map((p: any) => p.programId) ?? [],
    gradeLevel: gradeLevel?.id || rest.gradeLevelId,
    gradeLevelName: gradeLevel?.name || null,
    citizen: citizen
      ? {
          ...citizen,
          citizenPicture: citizen.citizenPicture ? getFileUrl(citizen.citizenPicture) : null,
          proofOfResidency: citizen.proofOfResidency ? getFileUrl(citizen.proofOfResidency) : null,
          proofOfIdentification: citizen.proofOfIdentification
            ? getFileUrl(citizen.proofOfIdentification)
            : null,
        }
      : undefined,
  };
};

const formatSoloParentBeneficiary = async (record: SoloParentWithRelations) => {
  const { category, citizen, ...rest } = record as any;

  // Fetch programs manually since we can't use Prisma relations
  const programs = await getBeneficiaryPrograms('SOLO_PARENT', record.id);

  return {
    ...rest,
    assistancePrograms: programs.map((p: any) => p.programId) ?? [],
    category: category?.id || rest.categoryId,
    categoryName: category?.name || null,
    citizen: citizen
      ? {
          ...citizen,
          citizenPicture: citizen.citizenPicture ? getFileUrl(citizen.citizenPicture) : null,
          proofOfResidency: citizen.proofOfResidency ? getFileUrl(citizen.proofOfResidency) : null,
          proofOfIdentification: citizen.proofOfIdentification
            ? getFileUrl(citizen.proofOfIdentification)
            : null,
        }
      : undefined,
  };
};

export interface CreateSeniorBeneficiaryData {
  citizenId: string;
  pensionTypes: string[]; // Array of SocialAmeliorationSetting IDs
  governmentPrograms?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

export interface UpdateSeniorBeneficiaryData {
  pensionTypes?: string[]; // Array of SocialAmeliorationSetting IDs
  governmentPrograms?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

export interface CreatePWDBeneficiaryData {
  citizenId: string;
  disabilityType: string; // SocialAmeliorationSetting ID
  disabilityLevel: string;
  monetaryAllowance?: boolean;
  assistedDevice?: boolean;
  donorDevice?: string | null;
  governmentPrograms?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

export interface UpdatePWDBeneficiaryData {
  disabilityType?: string; // SocialAmeliorationSetting ID
  disabilityLevel?: string;
  monetaryAllowance?: boolean;
  assistedDevice?: boolean;
  donorDevice?: string | null;
  governmentPrograms?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

export interface CreateStudentBeneficiaryData {
  citizenId: string;
  gradeLevel: string; // SocialAmeliorationSetting ID
  programs?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

export interface UpdateStudentBeneficiaryData {
  gradeLevel?: string; // SocialAmeliorationSetting ID
  programs?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

export interface CreateSoloParentBeneficiaryData {
  citizenId: string;
  category: string; // SocialAmeliorationSetting ID
  assistancePrograms?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

export interface UpdateSoloParentBeneficiaryData {
  category?: string; // SocialAmeliorationSetting ID
  assistancePrograms?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

const buildSeniorWhere = (
  filters?: BeneficiaryFilters
): Prisma.SeniorCitizenBeneficiaryWhereInput => {
  const where: Prisma.SeniorCitizenBeneficiaryWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    const searchClauses = buildSearchClauses(filters.search) as
      | Prisma.SeniorCitizenBeneficiaryWhereInput[]
      | undefined;
    where.OR = [
      {
        seniorCitizenId: { contains: filters.search, mode: 'insensitive' },
      } as Prisma.SeniorCitizenBeneficiaryWhereInput,
      ...(searchClauses ?? []),
    ] as Prisma.SeniorCitizenBeneficiaryWhereInput[];
  }

  // Note: programId filtering will be handled manually after fetching
  // since we can't use Prisma relations for polymorphic associations

  return where;
};

const buildPWDWhere = (filters?: BeneficiaryFilters): Prisma.PWDBeneficiaryWhereInput => {
  const where: Prisma.PWDBeneficiaryWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    const searchClauses = buildSearchClauses(filters.search) as
      | Prisma.PWDBeneficiaryWhereInput[]
      | undefined;
    where.OR = [
      {
        pwdId: { contains: filters.search, mode: 'insensitive' },
      } as Prisma.PWDBeneficiaryWhereInput,
      ...(searchClauses ?? []),
    ] as Prisma.PWDBeneficiaryWhereInput[];
  }

  // Note: programId filtering will be handled manually after fetching
  // since we can't use Prisma relations for polymorphic associations

  return where;
};

const buildStudentWhere = (filters?: BeneficiaryFilters): Prisma.StudentBeneficiaryWhereInput => {
  const where: Prisma.StudentBeneficiaryWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    const searchClauses = buildSearchClauses(filters.search) as
      | Prisma.StudentBeneficiaryWhereInput[]
      | undefined;
    where.OR = [
      {
        studentId: { contains: filters.search, mode: 'insensitive' },
      } as Prisma.StudentBeneficiaryWhereInput,
      ...(searchClauses ?? []),
    ] as Prisma.StudentBeneficiaryWhereInput[];
  }

  // Note: programId filtering will be handled manually after fetching
  // since we can't use Prisma relations for polymorphic associations

  return where;
};

const buildSoloParentWhere = (
  filters?: BeneficiaryFilters
): Prisma.SoloParentBeneficiaryWhereInput => {
  const where: Prisma.SoloParentBeneficiaryWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.search) {
    const searchClauses = buildSearchClauses(filters.search) as
      | Prisma.SoloParentBeneficiaryWhereInput[]
      | undefined;
    where.OR = [
      {
        soloParentId: { contains: filters.search, mode: 'insensitive' },
      } as Prisma.SoloParentBeneficiaryWhereInput,
      ...(searchClauses ?? []),
    ] as Prisma.SoloParentBeneficiaryWhereInput[];
  }

  // Note: programId filtering will be handled manually after fetching
  // since we can't use Prisma relations for polymorphic associations

  return where;
};

const formatPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

export const socialAmeliorationService = {
  async listSeniorBeneficiaries(filters?: BeneficiaryFilters, pagination?: PaginationOptions) {
    const { page, limit, skip } = getPagination(pagination);
    const where = buildSeniorWhere(filters);

    // If filtering by programId, first get beneficiary IDs with that program
    if (filters?.programId) {
      const pivots = await (prisma as any).beneficiaryProgramPivot.findMany({
        where: {
          beneficiaryType: 'SENIOR_CITIZEN',
          programId: filters.programId,
        },
        select: { beneficiaryId: true },
      });
      const beneficiaryIds = pivots.map((p: any) => p.beneficiaryId);
      if (beneficiaryIds.length === 0) {
        return {
          data: [],
          pagination: formatPagination(page, limit, 0),
        };
      }
      (where as any).id = { in: beneficiaryIds };
    }

    const [items, total] = await Promise.all([
      prisma.seniorCitizenBeneficiary.findMany({
        where,
        include: seniorInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.seniorCitizenBeneficiary.count({ where }),
    ]);

    // Format items with programs
    const formattedItems = await Promise.all(items.map(formatSeniorBeneficiary));

    return {
      data: formattedItems,
      pagination: formatPagination(page, limit, total),
    };
  },

  async createSeniorBeneficiary(data: CreateSeniorBeneficiaryData) {
    const seniorCitizenId = await generateSequentialId('SENIOR');

    const record = await prisma.seniorCitizenBeneficiary.create({
      data: {
        citizenId: data.citizenId,
        seniorCitizenId: seniorCitizenId as any,
        status: data.status || BeneficiaryStatus.ACTIVE,
        remarks: data.remarks,
        // Programs will be created separately after beneficiary creation
        pensionTypes: data.pensionTypes?.length
          ? {
              create: data.pensionTypes.map((settingId) => ({ settingId })),
            }
          : undefined,
      } as any,
      include: seniorInclude,
    });

    // Create program associations
    if (data.governmentPrograms?.length) {
      await (prisma as any).beneficiaryProgramPivot.createMany({
        data: data.governmentPrograms.map((programId) => ({
          beneficiaryType: 'SENIOR_CITIZEN',
          beneficiaryId: record.id,
          programId,
        })),
        skipDuplicates: true,
      });
    }

    // Refetch to get updated record
    const updatedRecord = await prisma.seniorCitizenBeneficiary.findUniqueOrThrow({
      where: { id: record.id },
      include: seniorInclude,
    });

    return formatSeniorBeneficiary(updatedRecord as SeniorWithRelations);
  },

  async updateSeniorBeneficiary(id: string, data: UpdateSeniorBeneficiaryData) {
    await prisma.seniorCitizenBeneficiary.findUniqueOrThrow({ where: { id } });

    return prisma.$transaction(async (tx) => {
      await tx.seniorCitizenBeneficiary.update({
        where: { id },
        data: {
          status: data.status,
          remarks: data.remarks,
        },
      });

      if (data.pensionTypes !== undefined) {
        await (tx as any).seniorCitizenPensionTypePivot.deleteMany({
          where: { beneficiaryId: id },
        });
        if (data.pensionTypes.length > 0) {
          await (tx as any).seniorCitizenPensionTypePivot.createMany({
            data: data.pensionTypes.map((settingId) => ({ beneficiaryId: id, settingId })),
          });
        }
      }

      if (data.governmentPrograms !== undefined) {
        await (tx as any).beneficiaryProgramPivot.deleteMany({
          where: {
            beneficiaryType: 'SENIOR_CITIZEN',
            beneficiaryId: id,
          },
        });
        if (data.governmentPrograms.length > 0) {
          await (tx as any).beneficiaryProgramPivot.createMany({
            data: data.governmentPrograms.map((programId) => ({
              beneficiaryType: 'SENIOR_CITIZEN',
              beneficiaryId: id,
              programId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Refetch with all relations
      const refreshed = await tx.seniorCitizenBeneficiary.findUniqueOrThrow({
        where: { id },
        include: seniorInclude,
      });

      return await formatSeniorBeneficiary(refreshed);
    });
  },

  async deleteSeniorBeneficiary(id: string) {
    await (prisma as any).beneficiaryProgramPivot.deleteMany({
      where: {
        beneficiaryType: 'SENIOR_CITIZEN',
        beneficiaryId: id,
      },
    });
    await (prisma as any).seniorCitizenPensionTypePivot.deleteMany({
      where: { beneficiaryId: id },
    });
    return prisma.seniorCitizenBeneficiary.delete({ where: { id } });
  },

  async listPWDBeneficiaries(filters?: BeneficiaryFilters, pagination?: PaginationOptions) {
    const { page, limit, skip } = getPagination(pagination);
    const where = buildPWDWhere(filters);

    // If filtering by programId, first get beneficiary IDs with that program
    if (filters?.programId) {
      const pivots = await (prisma as any).beneficiaryProgramPivot.findMany({
        where: {
          beneficiaryType: 'PWD',
          programId: filters.programId,
        },
        select: { beneficiaryId: true },
      });
      const beneficiaryIds = pivots.map((p: any) => p.beneficiaryId);
      if (beneficiaryIds.length === 0) {
        return {
          data: [],
          pagination: formatPagination(page, limit, 0),
        };
      }
      (where as any).id = { in: beneficiaryIds };
    }

    const [items, total] = await Promise.all([
      prisma.pWDBeneficiary.findMany({
        where,
        include: pwdInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pWDBeneficiary.count({ where }),
    ]);

    // Format items with programs
    const formattedItems = await Promise.all(items.map(formatPWDBeneficiary));

    return {
      data: formattedItems,
      pagination: formatPagination(page, limit, total),
    };
  },

  async createPWDBeneficiary(data: CreatePWDBeneficiaryData) {
    const pwdId = await generateSequentialId('PWD');

    const record = await prisma.pWDBeneficiary.create({
      data: {
        citizenId: data.citizenId,
        pwdId: pwdId as any,
        disabilityTypeId: data.disabilityType,
        disabilityLevel: data.disabilityLevel,
        monetaryAllowance: data.monetaryAllowance ?? false,
        assistedDevice: data.assistedDevice ?? false,
        donorDevice: data.donorDevice,
        status: data.status || BeneficiaryStatus.ACTIVE,
        remarks: data.remarks,
        // Programs will be created separately after beneficiary creation
      } as any,
      include: pwdInclude,
    });

    // Create program associations
    if (data.governmentPrograms?.length) {
      await (prisma as any).beneficiaryProgramPivot.createMany({
        data: data.governmentPrograms.map((programId) => ({
          beneficiaryType: 'PWD',
          beneficiaryId: record.id,
          programId,
        })),
        skipDuplicates: true,
      });
    }

    // Refetch to get updated record
    const updatedRecord = await prisma.pWDBeneficiary.findUniqueOrThrow({
      where: { id: record.id },
      include: pwdInclude,
    });

    return formatPWDBeneficiary(updatedRecord as PWDWithRelations);
  },

  async updatePWDBeneficiary(id: string, data: UpdatePWDBeneficiaryData) {
    await prisma.pWDBeneficiary.findUniqueOrThrow({ where: { id } });

    return prisma.$transaction(async (tx) => {
      const updateData: any = {
        disabilityLevel: data.disabilityLevel,
        monetaryAllowance: data.monetaryAllowance,
        assistedDevice: data.assistedDevice,
        donorDevice: data.donorDevice,
        status: data.status,
        remarks: data.remarks,
      };

      if (data.disabilityType !== undefined) {
        updateData.disabilityTypeId = data.disabilityType;
      }

      await tx.pWDBeneficiary.update({
        where: { id },
        data: updateData,
      });

      if (data.governmentPrograms !== undefined) {
        await (tx as any).beneficiaryProgramPivot.deleteMany({
          where: {
            beneficiaryType: 'PWD',
            beneficiaryId: id,
          },
        });
        if (data.governmentPrograms.length > 0) {
          await (tx as any).beneficiaryProgramPivot.createMany({
            data: data.governmentPrograms.map((programId) => ({
              beneficiaryType: 'PWD',
              beneficiaryId: id,
              programId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Refetch with all relations
      const refreshed = await tx.pWDBeneficiary.findUniqueOrThrow({
        where: { id },
        include: pwdInclude,
      });

      return await formatPWDBeneficiary(refreshed);
    });
  },

  async deletePWDBeneficiary(id: string) {
    await (prisma as any).beneficiaryProgramPivot.deleteMany({
      where: {
        beneficiaryType: 'PWD',
        beneficiaryId: id,
      },
    });
    return prisma.pWDBeneficiary.delete({ where: { id } });
  },

  async listStudentBeneficiaries(filters?: BeneficiaryFilters, pagination?: PaginationOptions) {
    const { page, limit, skip } = getPagination(pagination);
    const where = buildStudentWhere(filters);

    // If filtering by programId, first get beneficiary IDs with that program
    if (filters?.programId) {
      const pivots = await (prisma as any).beneficiaryProgramPivot.findMany({
        where: {
          beneficiaryType: 'STUDENT',
          programId: filters.programId,
        },
        select: { beneficiaryId: true },
      });
      const beneficiaryIds = pivots.map((p: any) => p.beneficiaryId);
      if (beneficiaryIds.length === 0) {
        return {
          data: [],
          pagination: formatPagination(page, limit, 0),
        };
      }
      (where as any).id = { in: beneficiaryIds };
    }

    const [items, total] = await Promise.all([
      prisma.studentBeneficiary.findMany({
        where,
        include: studentInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.studentBeneficiary.count({ where }),
    ]);

    // Format items with programs
    const formattedItems = await Promise.all(items.map(formatStudentBeneficiary));

    return {
      data: formattedItems,
      pagination: formatPagination(page, limit, total),
    };
  },

  async createStudentBeneficiary(data: CreateStudentBeneficiaryData) {
    const studentId = await generateSequentialId('STUDENT');

    const record = await prisma.studentBeneficiary.create({
      data: {
        citizenId: data.citizenId,
        studentId: studentId as any,
        gradeLevelId: data.gradeLevel,
        status: data.status || BeneficiaryStatus.ACTIVE,
        remarks: data.remarks,
        // Programs will be created separately after beneficiary creation
      } as any,
      include: studentInclude,
    });

    // Create program associations
    if (data.programs?.length) {
      await (prisma as any).beneficiaryProgramPivot.createMany({
        data: data.programs.map((programId) => ({
          beneficiaryType: 'STUDENT',
          beneficiaryId: record.id,
          programId,
        })),
        skipDuplicates: true,
      });
    }

    // Refetch to get updated record
    const updatedRecord = await prisma.studentBeneficiary.findUniqueOrThrow({
      where: { id: record.id },
      include: studentInclude,
    });

    return formatStudentBeneficiary(updatedRecord as StudentWithRelations);
  },

  async updateStudentBeneficiary(id: string, data: UpdateStudentBeneficiaryData) {
    await prisma.studentBeneficiary.findUniqueOrThrow({ where: { id } });

    return prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: data.status,
        remarks: data.remarks,
      };

      if (data.gradeLevel !== undefined) {
        updateData.gradeLevelId = data.gradeLevel;
      }

      await tx.studentBeneficiary.update({
        where: { id },
        data: updateData,
      });

      if (data.programs !== undefined) {
        await (tx as any).beneficiaryProgramPivot.deleteMany({
          where: {
            beneficiaryType: 'STUDENT',
            beneficiaryId: id,
          },
        });
        if (data.programs.length > 0) {
          await (tx as any).beneficiaryProgramPivot.createMany({
            data: data.programs.map((programId) => ({
              beneficiaryType: 'STUDENT',
              beneficiaryId: id,
              programId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Refetch with all relations
      const refreshed = await tx.studentBeneficiary.findUniqueOrThrow({
        where: { id },
        include: studentInclude,
      });

      return await formatStudentBeneficiary(refreshed);
    });
  },

  async deleteStudentBeneficiary(id: string) {
    await (prisma as any).beneficiaryProgramPivot.deleteMany({
      where: {
        beneficiaryType: 'STUDENT',
        beneficiaryId: id,
      },
    });
    return prisma.studentBeneficiary.delete({ where: { id } });
  },

  async listSoloParentBeneficiaries(filters?: BeneficiaryFilters, pagination?: PaginationOptions) {
    const { page, limit, skip } = getPagination(pagination);
    const where = buildSoloParentWhere(filters);

    // If filtering by programId, first get beneficiary IDs with that program
    if (filters?.programId) {
      const pivots = await (prisma as any).beneficiaryProgramPivot.findMany({
        where: {
          beneficiaryType: 'SOLO_PARENT',
          programId: filters.programId,
        },
        select: { beneficiaryId: true },
      });
      const beneficiaryIds = pivots.map((p: any) => p.beneficiaryId);
      if (beneficiaryIds.length === 0) {
        return {
          data: [],
          pagination: formatPagination(page, limit, 0),
        };
      }
      (where as any).id = { in: beneficiaryIds };
    }

    const [items, total] = await Promise.all([
      prisma.soloParentBeneficiary.findMany({
        where,
        include: soloParentInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.soloParentBeneficiary.count({ where }),
    ]);

    // Format items with programs
    const formattedItems = await Promise.all(items.map(formatSoloParentBeneficiary));

    return {
      data: formattedItems,
      pagination: formatPagination(page, limit, total),
    };
  },

  async createSoloParentBeneficiary(data: CreateSoloParentBeneficiaryData) {
    const soloParentId = await generateSequentialId('SOLO_PARENT');

    const record = await prisma.soloParentBeneficiary.create({
      data: {
        citizenId: data.citizenId,
        soloParentId: soloParentId as any,
        categoryId: data.category,
        status: data.status || BeneficiaryStatus.ACTIVE,
        remarks: data.remarks,
        // Programs will be created separately after beneficiary creation
      } as any,
      include: soloParentInclude,
    });

    // Create program associations
    if (data.assistancePrograms?.length) {
      await (prisma as any).beneficiaryProgramPivot.createMany({
        data: data.assistancePrograms.map((programId) => ({
          beneficiaryType: 'SOLO_PARENT',
          beneficiaryId: record.id,
          programId,
        })),
        skipDuplicates: true,
      });
    }

    // Refetch to get updated record
    const updatedRecord = await prisma.soloParentBeneficiary.findUniqueOrThrow({
      where: { id: record.id },
      include: soloParentInclude,
    });

    return formatSoloParentBeneficiary(updatedRecord as SoloParentWithRelations);
  },

  async updateSoloParentBeneficiary(id: string, data: UpdateSoloParentBeneficiaryData) {
    await prisma.soloParentBeneficiary.findUniqueOrThrow({ where: { id } });

    return prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: data.status,
        remarks: data.remarks,
      };

      if (data.category !== undefined) {
        updateData.categoryId = data.category;
      }

      await tx.soloParentBeneficiary.update({
        where: { id },
        data: updateData,
      });

      if (data.assistancePrograms !== undefined) {
        await (tx as any).beneficiaryProgramPivot.deleteMany({
          where: {
            beneficiaryType: 'SOLO_PARENT',
            beneficiaryId: id,
          },
        });
        if (data.assistancePrograms.length > 0) {
          await (tx as any).beneficiaryProgramPivot.createMany({
            data: data.assistancePrograms.map((programId) => ({
              beneficiaryType: 'SOLO_PARENT',
              beneficiaryId: id,
              programId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Refetch with all relations
      const refreshed = await tx.soloParentBeneficiary.findUniqueOrThrow({
        where: { id },
        include: soloParentInclude,
      });

      return await formatSoloParentBeneficiary(refreshed);
    });
  },

  async deleteSoloParentBeneficiary(id: string) {
    await (prisma as any).beneficiaryProgramPivot.deleteMany({
      where: {
        beneficiaryType: 'SOLO_PARENT',
        beneficiaryId: id,
      },
    });
    return prisma.soloParentBeneficiary.delete({ where: { id } });
  },

  async getOverviewStats() {
    const [seniorCount, pwdCount, studentCount, soloParentCount] = await Promise.all([
      prisma.seniorCitizenBeneficiary.count(),
      prisma.pWDBeneficiary.count(),
      prisma.studentBeneficiary.count(),
      prisma.soloParentBeneficiary.count(),
    ]);

    return {
      totalSeniorCitizens: seniorCount,
      totalPWD: pwdCount,
      totalStudents: studentCount,
      totalSoloParents: soloParentCount,
      totalBeneficiaries: seniorCount + pwdCount + studentCount + soloParentCount,
    };
  },

  async getTrendStats(range: 'daily' | 'monthly' | 'yearly' = 'monthly') {
    const now = new Date();
    let start: Date;

    switch (range) {
      case 'daily':
        start = new Date(now);
        start.setDate(now.getDate() - 6);
        break;
      case 'yearly':
        start = new Date(now);
        start.setFullYear(now.getFullYear() - 4);
        break;
      case 'monthly':
      default:
        start = new Date(now);
        start.setMonth(now.getMonth() - 5);
        break;
    }

    const [seniors, pwds, students, soloParents] = await Promise.all([
      prisma.seniorCitizenBeneficiary.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.pWDBeneficiary.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.studentBeneficiary.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.soloParentBeneficiary.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
    ]);

    const buckets: Record<
      string,
      { seniorCitizens: number; pwd: number; students: number; soloParents: number }
    > = {};

    const getBucketKey = (date: Date) => {
      const d = new Date(date);
      if (range === 'daily') {
        return d.toISOString().split('T')[0];
      }
      if (range === 'yearly') {
        return `${d.getFullYear()}`;
      }
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const increment = (
      collection: { createdAt: Date }[],
      field: keyof (typeof buckets)[string]
    ) => {
      collection.forEach((item) => {
        const key = getBucketKey(item.createdAt);
        if (!buckets[key]) {
          buckets[key] = { seniorCitizens: 0, pwd: 0, students: 0, soloParents: 0 };
        }
        buckets[key][field] += 1;
      });
    };

    increment(seniors, 'seniorCitizens');
    increment(pwds, 'pwd');
    increment(students, 'students');
    increment(soloParents, 'soloParents');

    const sortedKeys = Object.keys(buckets).sort((a, b) => (a > b ? 1 : -1));
    return sortedKeys.map((key) => ({
      period: key,
      ...buckets[key],
    }));
  },
};
