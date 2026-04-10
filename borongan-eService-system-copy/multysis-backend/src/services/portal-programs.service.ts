import { GovernmentProgramType } from '@prisma/client';
import prisma from '../config/database';

type ProgramTypeValue = 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';

// ---------------------------------------------------------------------------
// Eligibility check
// A resident is eligible if:
//   - program.types includes ALL (open to every active resident), OR
//   - program.types includes a type the resident has an ACTIVE beneficiary for
// ---------------------------------------------------------------------------
async function getResidentEligibleTypes(residentId: string): Promise<Set<ProgramTypeValue>> {
  const eligible = new Set<ProgramTypeValue>();

  const [senior, pwd, student, soloParent] = await Promise.all([
    prisma.seniorCitizenBeneficiary.findUnique({
      where: { residentId },
      select: { status: true },
    }),
    prisma.pWDBeneficiary.findUnique({
      where: { residentId },
      select: { status: true },
    }),
    prisma.studentBeneficiary.findUnique({
      where: { residentId },
      select: { status: true },
    }),
    prisma.soloParentBeneficiary.findUnique({
      where: { residentId },
      select: { status: true },
    }),
  ]);

  if (senior?.status === 'ACTIVE') eligible.add('SENIOR_CITIZEN');
  if (pwd?.status === 'ACTIVE') eligible.add('PWD');
  if (student?.status === 'ACTIVE') eligible.add('STUDENT');
  if (soloParent?.status === 'ACTIVE') eligible.add('SOLO_PARENT');

  return eligible;
}

function isEligible(
  programTypes: GovernmentProgramType[],
  eligibleTypes: Set<ProgramTypeValue>
): boolean {
  return programTypes.some((t) => t === 'ALL' || eligibleTypes.has(t as ProgramTypeValue));
}

// ---------------------------------------------------------------------------
// List programs with per-resident eligibility & application status
// ---------------------------------------------------------------------------
export const listProgramsForResident = async (residentId: string) => {
  const [programs, applications, eligibleTypes] = await Promise.all([
    prisma.governmentProgram.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }],
    }),
    prisma.governmentProgramApplication.findMany({
      where: { residentId },
      select: { programId: true, status: true },
    }),
    getResidentEligibleTypes(residentId),
  ]);

  const appMap = new Map(applications.map((a) => [a.programId, a.status]));

  return programs.map((program) => {
    const applicationStatus = appMap.get(program.id) ?? null;
    const eligible = isEligible(program.types, eligibleTypes);

    return {
      id: program.id,
      name: program.name,
      description: program.description,
      requirements: program.requirements,
      types: program.types,
      isActive: program.isActive,
      eligible,
      applicationStatus, // null | 'pending' | 'approved' | 'rejected' | 'cancelled'
    };
  });
};

// ---------------------------------------------------------------------------
// Get single program with eligibility for the resident
// ---------------------------------------------------------------------------
export const getProgramForResident = async (programId: string, residentId: string) => {
  const [program, application, eligibleTypes] = await Promise.all([
    prisma.governmentProgram.findUnique({ where: { id: programId } }),
    prisma.governmentProgramApplication.findUnique({
      where: { residentId_programId: { residentId, programId } },
      select: { status: true, adminNotes: true, appliedAt: true },
    }),
    getResidentEligibleTypes(residentId),
  ]);

  if (!program || !program.isActive) {
    throw new Error('Program not found or inactive');
  }

  return {
    ...program,
    eligible: isEligible(program.types, eligibleTypes),
    applicationStatus: application?.status ?? null,
    adminNotes: application?.adminNotes ?? null,
    appliedAt: application?.appliedAt ?? null,
  };
};

// ---------------------------------------------------------------------------
// Apply for a program
// ---------------------------------------------------------------------------
export const applyForProgram = async (residentId: string, programId: string) => {
  // Verify resident is active
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { status: true },
  });

  if (!resident || resident.status !== 'active') {
    throw new Error('Only active residents can apply for programs');
  }

  const program = await prisma.governmentProgram.findUnique({
    where: { id: programId },
    select: { id: true, isActive: true, types: true, name: true },
  });

  if (!program || !program.isActive) {
    throw new Error('Program not found or inactive');
  }

  // Check eligibility
  const eligibleTypes = await getResidentEligibleTypes(residentId);
  if (!isEligible(program.types, eligibleTypes)) {
    throw new Error('You are not eligible for this program');
  }

  // Check for existing non-cancelled application
  const existing = await prisma.governmentProgramApplication.findUnique({
    where: { residentId_programId: { residentId, programId } },
  });

  if (existing && existing.status !== 'cancelled' && existing.status !== 'rejected') {
    throw new Error('You already have an active application for this program');
  }

  // Upsert: if cancelled/rejected, restart application
  if (existing) {
    return prisma.governmentProgramApplication.update({
      where: { id: existing.id },
      data: {
        status: 'pending',
        adminNotes: null,
        appliedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
      },
    });
  }

  return prisma.governmentProgramApplication.create({
    data: { residentId, programId, status: 'pending' },
  });
};

// ---------------------------------------------------------------------------
// Get resident's own applications
// ---------------------------------------------------------------------------
export const getMyApplications = async (residentId: string) => {
  return prisma.governmentProgramApplication.findMany({
    where: { residentId },
    include: {
      program: {
        select: { id: true, name: true, description: true, types: true },
      },
    },
    orderBy: [{ appliedAt: 'desc' }],
  });
};

// ---------------------------------------------------------------------------
// Cancel a pending application
// ---------------------------------------------------------------------------
export const cancelApplication = async (applicationId: string, residentId: string) => {
  const application = await prisma.governmentProgramApplication.findUnique({
    where: { id: applicationId },
  });

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.residentId !== residentId) {
    throw new Error('Unauthorized');
  }

  if (application.status !== 'pending') {
    throw new Error('Only pending applications can be cancelled');
  }

  return prisma.governmentProgramApplication.update({
    where: { id: applicationId },
    data: { status: 'cancelled' },
  });
};

// ---------------------------------------------------------------------------
// ADMIN: List all applications with filters
// ---------------------------------------------------------------------------
export const listApplicationsAdmin = async (filters: {
  status?: string;
  programId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = Math.min(filters.limit && filters.limit > 0 ? filters.limit : 20, 100);
  const skip = (page - 1) * limit;

  const where: any = {};

  const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
  if (filters.status && (ALLOWED_STATUSES as readonly string[]).includes(filters.status)) {
    where.status = filters.status;
  }
  if (filters.programId) where.programId = filters.programId;
  if (filters.search) {
    where.resident = {
      OR: [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { middleName: { contains: filters.search, mode: 'insensitive' } },
      ],
    };
  }

  const [data, total] = await Promise.all([
    prisma.governmentProgramApplication.findMany({
      where,
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            middleName: true,
            lastName: true,
            extensionName: true,
            picturePath: true,
            barangay: { select: { barangayName: true } },
          },
        },
        program: {
          select: { id: true, name: true, types: true },
        },
      },
      orderBy: [{ appliedAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.governmentProgramApplication.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ---------------------------------------------------------------------------
// ADMIN: Get single application detail
// ---------------------------------------------------------------------------
export const getApplicationAdmin = async (applicationId: string) => {
  const application = await prisma.governmentProgramApplication.findUnique({
    where: { id: applicationId },
    include: {
      resident: {
        include: {
          barangay: { select: { barangayName: true } },
          seniorCitizenBeneficiary: { select: { status: true, seniorCitizenId: true } },
          pwdBeneficiary: { select: { status: true, pwdId: true } },
          studentBeneficiary: { select: { status: true, studentId: true } },
          soloParentBeneficiary: { select: { status: true, soloParentId: true } },
        },
      },
      program: true,
    },
  });

  if (!application) {
    throw new Error('Application not found');
  }

  return application;
};

// ---------------------------------------------------------------------------
// ADMIN: Approve or reject an application
// ---------------------------------------------------------------------------
export const reviewApplicationAdmin = async (
  applicationId: string,
  action: 'approve' | 'reject',
  adminId: number,
  adminNotes?: string
) => {
  const application = await prisma.governmentProgramApplication.findUnique({
    where: { id: applicationId },
    include: { program: { select: { types: true } } },
  });

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.status !== 'pending') {
    throw new Error('Only pending applications can be reviewed');
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const { residentId, programId } = application;
  const programTypes = application.program.types as string[];

  // For ALL-type programs, enroll across all existing beneficiary records
  const typesToEnroll = programTypes.includes('ALL')
    ? (['SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT'] as const)
    : (programTypes as ('SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT')[]);

  // Typed lookup map — no `as any` on the Prisma client
  type BeneficiaryType = 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT';
  type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
  const beneficiaryLookup: Record<
    BeneficiaryType,
    (rid: string, tx: TxClient) => Promise<{ id: string } | null>
  > = {
    SENIOR_CITIZEN: (rid, tx) =>
      tx.seniorCitizenBeneficiary.findUnique({ where: { residentId: rid }, select: { id: true } }),
    PWD: (rid, tx) =>
      tx.pWDBeneficiary.findUnique({ where: { residentId: rid }, select: { id: true } }),
    STUDENT: (rid, tx) =>
      tx.studentBeneficiary.findUnique({ where: { residentId: rid }, select: { id: true } }),
    SOLO_PARENT: (rid, tx) =>
      tx.soloParentBeneficiary.findUnique({ where: { residentId: rid }, select: { id: true } }),
  };

  // Wrap status update + pivot creation in a single transaction so partial
  // failure rolls back both — no "approved" application with missing pivots
  return prisma.$transaction(async (tx) => {
    const updated = await tx.governmentProgramApplication.update({
      where: { id: applicationId },
      data: {
        status: newStatus,
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
        reviewedBy: adminId,
      },
    });

    if (action === 'approve') {
      // Parallel beneficiary lookups — eliminates N+1 serial queries
      const lookupResults = await Promise.all(
        typesToEnroll.map(async (type) => ({
          type,
          beneficiary: await beneficiaryLookup[type as BeneficiaryType](residentId, tx),
        }))
      );

      // Parallel upserts for all existing beneficiary records
      await Promise.all(
        lookupResults
          .filter((r): r is { type: string; beneficiary: { id: string } } => r.beneficiary !== null)
          .map(({ type, beneficiary }) =>
            tx.beneficiaryProgramPivot.upsert({
              where: {
                beneficiaryType_beneficiaryId_programId: {
                  beneficiaryType: type as BeneficiaryType,
                  beneficiaryId: beneficiary.id,
                  programId,
                },
              },
              update: {},
              create: {
                beneficiaryType: type as BeneficiaryType,
                beneficiaryId: beneficiary.id,
                programId,
              },
            })
          )
      );
    }

    return updated;
  });
};
