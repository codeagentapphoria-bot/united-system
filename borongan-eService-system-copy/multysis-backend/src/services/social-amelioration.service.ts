import { BeneficiaryStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { getFileUrl } from '../middleware/upload';
import { generateBeneficiaryId } from './classification.service';

// =============================================================================
// HELPERS — read/write resident_classifications via raw SQL (not in Prisma schema)
// =============================================================================

/** Classification detail shapes per type. */
interface PWDClassificationDetails {
  disabilityType?: string | null;
  disabilityLevel?: string | null;
  remarks?: string | null;
}

interface StudentClassificationDetails {
  gradeLevel?: string | null;
  courseField?: string | null;
  ncLevel?: string | null;
  remarks?: string | null;
}

interface SoloParentClassificationDetails {
  category?: string | null;
  remarks?: string | null;
}

interface SeniorClassificationDetails {
  pensionTypes?: string[];
  remarks?: string | null;
}

/**
 * Fetch resident_classifications.classification_details for a single resident + type.
 * Returns null when no record exists.
 */
async function getClassificationDetails(
  residentId: string,
  classificationType: string
): Promise<any | null> {
  const rows = await prisma.$queryRaw<Array<{ classification_details: any }>>`
    SELECT classification_details
    FROM resident_classifications
    WHERE resident_id = ${residentId}
      AND classification_type = ${classificationType}
    LIMIT 1
  `;
  return rows[0]?.classification_details ?? null;
}

/**
 * Batch-fetch classification_details for multiple residents of the same type.
 * Returns a Map of residentId → details.
 */
async function batchGetClassificationDetails(
  residentIds: string[],
  classificationType: string
): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (residentIds.length === 0) return map;
  // Use $queryRawUnsafe because Prisma $queryRaw cannot embed nested raw queries for unnest()
  const rows = await prisma.$queryRawUnsafe<Array<{ resident_id: string; classification_details: any }>>(
    `SELECT resident_id, classification_details
     FROM resident_classifications
     WHERE resident_id = ANY($1::text[])
       AND classification_type = $2`,
    residentIds,
    classificationType
  );
  for (const row of rows) {
    map.set(row.resident_id, row.classification_details);
  }
  return map;
}

/**
 * Upsert (insert-or-update) resident_classifications.classification_details.
 * Uses INSERT ... ON CONFLICT ... DO UPDATE so it works for ALL beneficiary
 * types — even when no resident_classifications record exists yet.
 */
async function upsertClassificationDetails(
  residentId: string,
  classificationType: string,
  details: PWDClassificationDetails | StudentClassificationDetails | SoloParentClassificationDetails | SeniorClassificationDetails
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO resident_classifications (resident_id, classification_type, classification_details)
    VALUES (${residentId}, ${classificationType}, ${JSON.stringify(details)}::jsonb)
    ON CONFLICT ON CONSTRAINT resident_classifications_unique_type
    DO UPDATE SET classification_details = EXCLUDED.classification_details
  `;
}

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
    { resident: { firstName: contains } },
    { resident: { middleName: contains } },
    { resident: { lastName: contains } },
    { resident: { extensionName: contains } },
  ];
};

const dateRangeForYear = (year: number) => ({
  start: new Date(`${year}-01-01T00:00:00.000Z`),
  end: new Date(`${year + 1}-01-01T00:00:00.000Z`),
});

const generateSequentialId = async (type: 'SENIOR' | 'PWD' | 'STUDENT' | 'SOLO_PARENT') => {
  let table = '';
  let prefix = '';

  switch (type) {
    case 'SENIOR':
      table = 'senior_citizen_beneficiaries';
      prefix = SENIOR_PREFIX;
      break;
    case 'PWD':
      table = 'pwd_beneficiaries';
      prefix = PWD_PREFIX;
      break;
    case 'STUDENT':
      table = 'student_beneficiaries';
      prefix = STUDENT_PREFIX;
      break;
    case 'SOLO_PARENT':
      table = 'solo_parent_beneficiaries';
      prefix = SOLO_PARENT_PREFIX;
      break;
  }

  return generateBeneficiaryId(table, prefix);
};

// Helper function to fetch explicitly assigned programs for a beneficiary.
// Only returns programs the admin has manually enrolled this beneficiary in.
// ALL-type programs are NOT auto-injected here — admins assign them explicitly.
const getBeneficiaryPrograms = async (
  beneficiaryType: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'HEALTHCARE_WORKER',
  beneficiaryId: string
) => {
  return (prisma as any).beneficiaryProgramPivot.findMany({
    where: {
      beneficiaryType: beneficiaryType,
      beneficiaryId: beneficiaryId,
    },
    select: {
      programId: true,
    },
  });
};

const getBeneficiaryProgramsMap = async (
  beneficiaryType: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'HEALTHCARE_WORKER',
  beneficiaryIds: string[]
): Promise<Map<string, string[]>> => {
  if (beneficiaryIds.length === 0) return new Map();
  const pivots = await (prisma as any).beneficiaryProgramPivot.findMany({
    where: {
      beneficiaryType: beneficiaryType,
      beneficiaryId: { in: beneficiaryIds },
    },
    select: {
      beneficiaryId: true,
      programId: true,
    },
  });
  const map = new Map<string, string[]>();
  for (const p of pivots) {
    const list = map.get(p.beneficiaryId) ?? [];
    list.push(p.programId);
    map.set(p.beneficiaryId, list);
  }
  return map;
};

const seniorInclude = {
  resident: true,
} as any;

const pwdInclude = {
  resident: true,
} as any;

const studentInclude = {
  resident: true,
} as any;

const soloParentInclude = {
  resident: true,
} as any;

type SeniorWithRelations = any;
type PWDWithRelations = any;
type StudentWithRelations = any;
type SoloParentWithRelations = any;

const formatSeniorBeneficiary = async (
  record: SeniorWithRelations,
  preloadedProgramIds?: string[],
  classificationDetails?: any | null
) => {
  const { resident, ...rest } = record as any;
  const programIds = preloadedProgramIds ??
    (await getBeneficiaryPrograms('SENIOR_CITIZEN', record.id)).map((p: any) => p.programId);
  const details = classificationDetails ?? (await getClassificationDetails(resident.id, 'Senior Citizen'));
  return {
    ...rest,
    governmentPrograms: programIds,
    pensionTypes: details?.pensionTypes ?? [],
    pensionTypeNames: [], // setting names are no longer stored; text IDs only
    resident: resident
      ? {
          ...resident,
          picturePath: resident.picturePath ? getFileUrl(resident.picturePath) : null,
          proofOfIdentification: resident.proofOfIdentification
            ? getFileUrl(resident.proofOfIdentification)
            : null,
        }
      : undefined,
  };
};

const formatPWDBeneficiary = async (
  record: PWDWithRelations,
  preloadedProgramIds?: string[],
  classificationDetails?: any | null
) => {
  const { resident, ...rest } = record as any;
  const programIds = preloadedProgramIds ??
    (await getBeneficiaryPrograms('PWD', record.id)).map((p: any) => p.programId);
  const details = classificationDetails ?? (await getClassificationDetails(resident.id, 'Person with Disability'));
  return {
    ...rest,
    governmentPrograms: programIds,
    disabilityType: details?.disabilityType ?? null,
    disabilityLevel: details?.disabilityLevel ?? null,
    disabilityTypeName: null, // name lookup no longer available; text ID used
    resident: resident
      ? {
          ...resident,
          picturePath: resident.picturePath ? getFileUrl(resident.picturePath) : null,
          proofOfIdentification: resident.proofOfIdentification
            ? getFileUrl(resident.proofOfIdentification)
            : null,
        }
      : undefined,
  };
};

const formatStudentBeneficiary = async (
  record: StudentWithRelations,
  preloadedProgramIds?: string[],
  classificationDetails?: any | null
) => {
  const { resident, ...rest } = record as any;
  const programIds = preloadedProgramIds ??
    (await getBeneficiaryPrograms('STUDENT', record.id)).map((p: any) => p.programId);
  // Portal classifies students as 'Student' (elem/JHS/SHS), 'College Student' (college),
  // or 'Vocational Student' (vocational/technical). Query all three to ensure we
  // always get details regardless of which classification type was used at creation.
  const [studentDetails, collegeStudentDetails, vocationalStudentDetails] = await Promise.all([
    classificationDetails ?? getClassificationDetails(resident.id, 'Student'),
    classificationDetails ? null : getClassificationDetails(resident.id, 'College Student'),
    classificationDetails ? null : getClassificationDetails(resident.id, 'Vocational Student'),
  ]);
  const details = studentDetails ?? collegeStudentDetails ?? vocationalStudentDetails ?? null;
  const merged = {
    ...(studentDetails ?? {}),
    ...(collegeStudentDetails ?? {}),
    ...(vocationalStudentDetails ?? {}),
  };
  return {
    ...rest,
    programs: programIds,
    gradeLevel:  (merged.gradeLevel  ?? null) || (details?.gradeLevel  ?? null),
    courseField: (merged.courseField ?? null) || (details?.courseField ?? null),
    ncLevel:     (merged.ncLevel     ?? null) || (details?.ncLevel     ?? null),
    gradeLevelName: null, // name lookup no longer available; text used
    resident: resident
      ? {
          ...resident,
          picturePath: resident.picturePath ? getFileUrl(resident.picturePath) : null,
          proofOfIdentification: resident.proofOfIdentification
            ? getFileUrl(resident.proofOfIdentification)
            : null,
        }
      : undefined,
  };
};

const formatSoloParentBeneficiary = async (
  record: SoloParentWithRelations,
  preloadedProgramIds?: string[],
  classificationDetails?: any | null
) => {
  const { resident, ...rest } = record as any;
  const programIds = preloadedProgramIds ??
    (await getBeneficiaryPrograms('SOLO_PARENT', record.id)).map((p: any) => p.programId);
  const details = classificationDetails ?? (await getClassificationDetails(resident.id, 'Solo Parent'));
  return {
    ...rest,
    assistancePrograms: programIds,
    category: details?.category ?? null,
    categoryName: null, // name lookup no longer available; text used
    resident: resident
      ? {
          ...resident,
          picturePath: resident.picturePath ? getFileUrl(resident.picturePath) : null,
          proofOfIdentification: resident.proofOfIdentification
            ? getFileUrl(resident.proofOfIdentification)
            : null,
        }
      : undefined,
  };
};

export interface CreateSeniorBeneficiaryData {
  residentId: string;
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
  residentId: string;
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
  residentId: string;
  gradeLevel: string; // Text value (e.g. 'Senior High School')
  courseField?: string; // College / Vocational
  ncLevel?: string;    // Vocational only
  programs?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

export interface UpdateStudentBeneficiaryData {
  gradeLevel?: string; // Text value
  courseField?: string; // College / Vocational
  ncLevel?: string;    // Vocational only
  programs?: string[];
  status?: BeneficiaryStatus;
  remarks?: string;
}

export interface CreateSoloParentBeneficiaryData {
  residentId: string;
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

  // If a specific status is requested, use it; otherwise exclude INACTIVE records
  if (filters?.status) {
    where.status = filters.status;
  } else {
    where.status = { not: 'INACTIVE' };
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

  // If a specific status is requested, use it; otherwise exclude INACTIVE records
  if (filters?.status) {
    where.status = filters.status;
  } else {
    where.status = { not: 'INACTIVE' };
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

  // If a specific status is requested, use it; otherwise exclude INACTIVE records
  if (filters?.status) {
    where.status = filters.status;
  } else {
    where.status = { not: 'INACTIVE' };
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

  // If a specific status is requested, use it; otherwise exclude INACTIVE records
  if (filters?.status) {
    where.status = filters.status;
  } else {
    where.status = { not: 'INACTIVE' };
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

    // Batch-fetch all programs for these beneficiaries in one query
    const programMap = await getBeneficiaryProgramsMap(
      'SENIOR_CITIZEN',
      items.map((i) => i.id)
    );

    // Batch-fetch classification_details from resident_classifications
    const detailsMap = await batchGetClassificationDetails(
      items.map((i) => i.residentId),
      'Senior Citizen'
    );

    const formattedItems = await Promise.all(
      items.map((item) =>
        formatSeniorBeneficiary(item, programMap.get(item.id) ?? [], detailsMap.get(item.residentId))
      )
    );

    return {
      data: formattedItems,
      pagination: formatPagination(page, limit, total),
    };
  },

  async createSeniorBeneficiary(data: CreateSeniorBeneficiaryData) {
    const seniorCitizenId = await generateSequentialId('SENIOR');

    const record = await prisma.seniorCitizenBeneficiary.create({
      data: {
        residentId: data.residentId,
        seniorCitizenId: seniorCitizenId as any,
        status: data.status || BeneficiaryStatus.ACTIVE,
        remarks: data.remarks,
      } as any,
      include: seniorInclude,
    });

    // Write pension types to resident_classifications.classification_details
    await upsertClassificationDetails(data.residentId, 'Senior Citizen', {
      pensionTypes: Array.isArray(data.pensionTypes) ? data.pensionTypes : [],
      remarks: data.remarks ?? null,
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

    // Also fetch freshly written classification details
    const details = await getClassificationDetails(data.residentId, 'Senior Citizen');

    return formatSeniorBeneficiary(updatedRecord as SeniorWithRelations, undefined, details);
  },

  async updateSeniorBeneficiary(id: string, data: UpdateSeniorBeneficiaryData) {
    const beneficiary = await prisma.seniorCitizenBeneficiary.findUniqueOrThrow({ where: { id } });

    return prisma.$transaction(async (tx) => {
      await tx.seniorCitizenBeneficiary.update({
        where: { id },
        data: {
          status: data.status,
          remarks: data.remarks,
        },
      });

      // Update classification_details in resident_classifications
      if (data.pensionTypes !== undefined || data.remarks !== undefined) {
        const existing = await getClassificationDetails(beneficiary.residentId, 'Senior Citizen');
        await tx.$executeRaw`
          UPDATE resident_classifications
          SET classification_details = ${JSON.stringify({
            pensionTypes: data.pensionTypes ?? existing?.pensionTypes ?? [],
            remarks: data.remarks ?? existing?.remarks ?? null,
          })}::jsonb
          WHERE resident_id = ${beneficiary.residentId}
            AND classification_type = 'Senior Citizen'
        `;
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

      const details = await getClassificationDetails(beneficiary.residentId, 'Senior Citizen');
      return await formatSeniorBeneficiary(refreshed, undefined, details);
    });
  },

  async deleteSeniorBeneficiary(id: string) {
    await (prisma as any).beneficiaryProgramPivot.deleteMany({
      where: {
        beneficiaryType: 'SENIOR_CITIZEN',
        beneficiaryId: id,
      },
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

    // Batch-fetch all programs for these beneficiaries in one query
    const programMap = await getBeneficiaryProgramsMap(
      'PWD',
      items.map((i) => i.id)
    );

    // Batch-fetch classification_details from resident_classifications
    const detailsMap = await batchGetClassificationDetails(
      items.map((i) => i.residentId),
      'Person with Disability'
    );

    const formattedItems = await Promise.all(
      items.map((item) =>
        formatPWDBeneficiary(item, programMap.get(item.id) ?? [], detailsMap.get(item.residentId))
      )
    );

    return {
      data: formattedItems,
      pagination: formatPagination(page, limit, total),
    };
  },

  async createPWDBeneficiary(data: CreatePWDBeneficiaryData) {
    const pwdId = await generateSequentialId('PWD');

    const record = await prisma.pWDBeneficiary.create({
      data: {
        residentId: data.residentId,
        pwdId: pwdId as any,
        disabilityLevel: data.disabilityLevel,
        monetaryAllowance: data.monetaryAllowance ?? false,
        assistedDevice: data.assistedDevice ?? false,
        donorDevice: data.donorDevice,
        status: data.status || BeneficiaryStatus.ACTIVE,
        remarks: data.remarks,
      } as any,
      include: pwdInclude,
    });

    // Write classification details to resident_classifications.classification_details
    await upsertClassificationDetails(data.residentId, 'Person with Disability', {
      disabilityType: data.disabilityType,
      disabilityLevel: data.disabilityLevel,
      remarks: data.remarks ?? null,
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

    const details = await getClassificationDetails(data.residentId, 'Person with Disability');

    return formatPWDBeneficiary(updatedRecord as PWDWithRelations, undefined, details);
  },

  async updatePWDBeneficiary(id: string, data: UpdatePWDBeneficiaryData) {
    const beneficiary = await prisma.pWDBeneficiary.findUniqueOrThrow({ where: { id } });

    return prisma.$transaction(async (tx) => {
      const updateData: any = {
        disabilityLevel: data.disabilityLevel,
        monetaryAllowance: data.monetaryAllowance,
        assistedDevice: data.assistedDevice,
        donorDevice: data.donorDevice,
        status: data.status,
        remarks: data.remarks,
      };

      await tx.pWDBeneficiary.update({
        where: { id },
        data: updateData,
      });

      // Update classification_details in resident_classifications
      if (
        data.disabilityType !== undefined ||
        data.disabilityLevel !== undefined ||
        data.remarks !== undefined
      ) {
        const existing = await getClassificationDetails(beneficiary.residentId, 'Person with Disability');
        await tx.$executeRaw`
          UPDATE resident_classifications
          SET classification_details = ${JSON.stringify({
            disabilityType: data.disabilityType ?? existing?.disabilityType ?? null,
            disabilityLevel: data.disabilityLevel ?? existing?.disabilityLevel ?? null,
            remarks: data.remarks ?? existing?.remarks ?? null,
          })}::jsonb
          WHERE resident_id = ${beneficiary.residentId}
            AND classification_type = 'Person with Disability'
        `;
      }

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

      const details = await getClassificationDetails(beneficiary.residentId, 'Person with Disability');
      return await formatPWDBeneficiary(refreshed, undefined, details);
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

    // Batch-fetch all programs for these beneficiaries in one query
    const programMap = await getBeneficiaryProgramsMap(
      'STUDENT',
      items.map((i) => i.id)
    );

    // Batch-fetch classification_details from resident_classifications
    const detailsMap = await batchGetClassificationDetails(
      items.map((i) => i.residentId),
      'Student'
    );

    const formattedItems = await Promise.all(
      items.map((item) =>
        formatStudentBeneficiary(item, programMap.get(item.id) ?? [], detailsMap.get(item.residentId))
      )
    );

    return {
      data: formattedItems,
      pagination: formatPagination(page, limit, total),
    };
  },

  async createStudentBeneficiary(data: CreateStudentBeneficiaryData) {
    const studentId = await generateSequentialId('STUDENT');

    const record = await prisma.studentBeneficiary.create({
      data: {
        residentId: data.residentId,
        studentId: studentId as any,
        status: data.status || BeneficiaryStatus.ACTIVE,
        remarks: data.remarks,
      } as any,
      include: studentInclude,
    });

    // Write classification details to resident_classifications.classification_details.
    // Determine classification type:
    //   - ncLevel provided  → 'Vocational Student'
    //   - courseField       → 'College Student'
    //   - gradeLevel only   → 'Student'
    const classType = data.ncLevel
      ? 'Vocational Student'
      : data.courseField
        ? 'College Student'
        : 'Student';
    await upsertClassificationDetails(data.residentId, classType, {
      gradeLevel:  data.gradeLevel  ?? null,
      courseField: data.courseField ?? null,
      ncLevel:     data.ncLevel     ?? null,
      remarks:     data.remarks     ?? null,
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

    const details = await getClassificationDetails(data.residentId, classType);

    return formatStudentBeneficiary(updatedRecord as StudentWithRelations, undefined, details);
  },

  async updateStudentBeneficiary(id: string, data: UpdateStudentBeneficiaryData) {
    const beneficiary = await prisma.studentBeneficiary.findUniqueOrThrow({ where: { id } });

    return prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: data.status,
        remarks: data.remarks,
      };

      await tx.studentBeneficiary.update({
        where: { id },
        data: updateData,
      });

      // Update classification_details in resident_classifications.
      // Query all three student classification types to handle portal and BIMS registrations.
      if (data.gradeLevel !== undefined || data.remarks !== undefined
        || data.courseField !== undefined || data.ncLevel !== undefined) {
        const [studentDetails, collegeStudentDetails, vocationalStudentDetails] = await Promise.all([
          getClassificationDetails(beneficiary.residentId, 'Student'),
          getClassificationDetails(beneficiary.residentId, 'College Student'),
          getClassificationDetails(beneficiary.residentId, 'Vocational Student'),
        ]);
        const existing = studentDetails ?? collegeStudentDetails ?? vocationalStudentDetails;
        const classType = vocationalStudentDetails
          ? 'Vocational Student'
          : collegeStudentDetails
            ? 'College Student'
            : 'Student';
        await tx.$executeRaw`
          UPDATE resident_classifications
          SET classification_details = ${JSON.stringify({
            gradeLevel:  data.gradeLevel  ?? existing?.gradeLevel  ?? null,
            courseField: data.courseField ?? existing?.courseField ?? null,
            ncLevel:     data.ncLevel     ?? existing?.ncLevel     ?? null,
            remarks:     data.remarks     ?? existing?.remarks     ?? null,
          })}::jsonb
          WHERE resident_id = ${beneficiary.residentId}
            AND classification_type = ${classType}
        `;
      }

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

      const [studentDetails, collegeStudentDetails, vocationalStudentDetails] = await Promise.all([
        getClassificationDetails(beneficiary.residentId, 'Student'),
        getClassificationDetails(beneficiary.residentId, 'College Student'),
        getClassificationDetails(beneficiary.residentId, 'Vocational Student'),
      ]);
      const details = studentDetails ?? collegeStudentDetails ?? vocationalStudentDetails;
      return await formatStudentBeneficiary(refreshed, undefined, details);
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

    // Batch-fetch all programs for these beneficiaries in one query
    const programMap = await getBeneficiaryProgramsMap(
      'SOLO_PARENT',
      items.map((i) => i.id)
    );

    // Batch-fetch classification_details from resident_classifications
    const detailsMap = await batchGetClassificationDetails(
      items.map((i) => i.residentId),
      'Solo Parent'
    );

    const formattedItems = await Promise.all(
      items.map((item) =>
        formatSoloParentBeneficiary(item, programMap.get(item.id) ?? [], detailsMap.get(item.residentId))
      )
    );

    return {
      data: formattedItems,
      pagination: formatPagination(page, limit, total),
    };
  },

  async createSoloParentBeneficiary(data: CreateSoloParentBeneficiaryData) {
    const soloParentId = await generateSequentialId('SOLO_PARENT');

    const record = await prisma.soloParentBeneficiary.create({
      data: {
        residentId: data.residentId,
        soloParentId: soloParentId as any,
        status: data.status || BeneficiaryStatus.ACTIVE,
        remarks: data.remarks,
      } as any,
      include: soloParentInclude,
    });

    // Write classification details to resident_classifications.classification_details
    await upsertClassificationDetails(data.residentId, 'Solo Parent', {
      category: data.category,
      remarks: data.remarks ?? null,
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

    const details = await getClassificationDetails(data.residentId, 'Solo Parent');

    return formatSoloParentBeneficiary(updatedRecord as SoloParentWithRelations, undefined, details);
  },

  async updateSoloParentBeneficiary(id: string, data: UpdateSoloParentBeneficiaryData) {
    const beneficiary = await prisma.soloParentBeneficiary.findUniqueOrThrow({ where: { id } });

    return prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: data.status,
        remarks: data.remarks,
      };

      await tx.soloParentBeneficiary.update({
        where: { id },
        data: updateData,
      });

      // Update classification_details in resident_classifications
      if (data.category !== undefined || data.remarks !== undefined) {
        const existing = await getClassificationDetails(beneficiary.residentId, 'Solo Parent');
        await tx.$executeRaw`
          UPDATE resident_classifications
          SET classification_details = ${JSON.stringify({
            category: data.category ?? existing?.category ?? null,
            remarks: data.remarks ?? existing?.remarks ?? null,
          })}::jsonb
          WHERE resident_id = ${beneficiary.residentId}
            AND classification_type = 'Solo Parent'
        `;
      }

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

      const details = await getClassificationDetails(beneficiary.residentId, 'Solo Parent');
      return await formatSoloParentBeneficiary(refreshed, undefined, details);
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
    const activeFilter = { where: { status: { not: 'INACTIVE' as const } } };
    const [seniorCount, pwdCount, studentCount, soloParentCount] = await Promise.all([
      prisma.seniorCitizenBeneficiary.count(activeFilter),
      prisma.pWDBeneficiary.count(activeFilter),
      prisma.studentBeneficiary.count(activeFilter),
      prisma.soloParentBeneficiary.count(activeFilter),
    ]);

    return {
      totalSeniorCitizens: seniorCount,
      totalPWD: pwdCount,
      totalStudents: studentCount,
      totalSoloParents: soloParentCount,
      totalBeneficiaries: seniorCount + pwdCount + studentCount + soloParentCount,
    };
  },

  async getTrendStats(range: 'daily' | 'monthly' | 'yearly' | 'all' = 'monthly') {
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
      case 'all':
        // Fetch all records — set start to year 2000
        start = new Date('2000-01-01');
        break;
      case 'monthly':
      default:
        start = new Date(now);
        start.setMonth(now.getMonth() - 5);
        break;
    }

    const [seniors, pwds, students, soloParents] = await Promise.all([
      prisma.seniorCitizenBeneficiary.findMany({
        where: { createdAt: { gte: start }, status: { not: 'INACTIVE' } },
        select: { createdAt: true },
      }),
      prisma.pWDBeneficiary.findMany({
        where: { createdAt: { gte: start }, status: { not: 'INACTIVE' } },
        select: { createdAt: true },
      }),
      prisma.studentBeneficiary.findMany({
        where: { createdAt: { gte: start }, status: { not: 'INACTIVE' } },
        select: { createdAt: true },
      }),
      prisma.soloParentBeneficiary.findMany({
        where: { createdAt: { gte: start }, status: { not: 'INACTIVE' } },
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
