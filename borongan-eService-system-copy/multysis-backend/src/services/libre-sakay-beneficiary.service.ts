import prisma from '../config/database';
import { Prisma, BeneficiaryType } from '@prisma/client';

const LIBRE_SAKAY_PROGRAM_ID = 'gp-all-libre-sakay';

// =============================================================================
// TYPES
// =============================================================================

export interface BeneficiaryListItem {
  id: string;
  residentId: string;
  fullName: string;
  residentIdNumber: string;
  category: BeneficiaryType | 'N/A';
  barangay: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  suspendedAt: string | null;
  enrolledAt: Date;
  applicationId: string;
  appliedAt: Date;
  reviewedAt: Date | null;
}

export interface BeneficiaryDetails extends BeneficiaryListItem {
  picturePath: string | null;
  middleName: string | null;
  extensionName: string | null;
  birthdate: Date | null;
  sex: string | null;
  address: string;
  contactNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  submittedData: Record<string, any>;
  attachments: Record<string, any>;
  adminNotes: string | null;
  libreBeneficiaryId: string | null;
  passNumber: string | null;
  passExpiry: Date | null;
  totalRides: number;
  lastRideDate: Date | null;
  reviewedByName: string | null;
}

export interface PaginatedBeneficiaries {
  data: BeneficiaryListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function buildFullName(first: string, middle: string | null, last: string, extension: string | null): string {
  const parts = [first];
  if (middle) parts.push(middle);
  parts.push(last);
  if (extension) parts.push(extension);
  return parts.join(' ');
}

function determineCategory(
  senior: { seniorCitizenId: string | null } | null,
  pwd: { pwdId: string | null } | null,
  student: { studentId: string | null } | null,
  soloParent: { soloParentId: string | null } | null,
  healthcareWorker: { healthcareWorkerId: string | null } | null,
): { type: BeneficiaryType; id: string } | null {
  if (senior?.seniorCitizenId) return { type: 'SENIOR_CITIZEN', id: senior.seniorCitizenId };
  if (pwd?.pwdId) return { type: 'PWD', id: pwd.pwdId };
  if (student?.studentId) return { type: 'STUDENT', id: student.studentId };
  if (soloParent?.soloParentId) return { type: 'SOLO_PARENT', id: soloParent.soloParentId };
  if (healthcareWorker?.healthcareWorkerId) return { type: 'HEALTHCARE_WORKER', id: healthcareWorker.healthcareWorkerId };
  return null;
}

/** Map pivot status string to enrollment status enum */
function mapEnrollmentStatus(status: string | null | undefined): 'ACTIVE' | 'INACTIVE' | 'PENDING' {
  if (status === 'active') return 'ACTIVE';
  if (status === 'suspended') return 'INACTIVE';
  return 'PENDING';
}

// =============================================================================
// LIST BENEFICIARIES
// =============================================================================

export const listBeneficiaries = async (
  filter: 'all' | 'active' | 'suspended' = 'all',
  page = 1,
  limit = 20,
  search?: string
): Promise<PaginatedBeneficiaries> => {
  const skip = (page - 1) * limit;

  // Base filter: approved applications for Libre-Sakay
  const baseWhere: any = {
    programId: LIBRE_SAKAY_PROGRAM_ID,
    status: 'approved',
  };

  if (search) {
    baseWhere.resident = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { middleName: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [rows, total] = await Promise.all([
    prisma.governmentProgramApplication.findMany({
      where: baseWhere,
    include: {
      resident: {
        include: {
          barangay: { select: { barangayName: true, municipality: true } },
          seniorCitizenBeneficiary: { select: { seniorCitizenId: true } },
          pwdBeneficiary: { select: { pwdId: true } },
          studentBeneficiary: { select: { studentId: true } },
          soloParentBeneficiary: { select: { soloParentId: true } },
          healthcareWorkerBeneficiary: { select: { healthcareWorkerId: true } },
        },
      },
    },
    orderBy: { reviewedAt: { sort: 'desc', nulls: 'last' } },
      skip,
      take: limit,
    }),
    prisma.governmentProgramApplication.count({ where: baseWhere }),
  ]);

  if (rows.length === 0) {
    return { data: [], total: filter !== 'all' ? 0 : total, page, limit, totalPages: 0 };
  }

  // Determine category for each row, then batch-fetch their pivot rows
  const categoryEntries: Array<{ applicationId: string; cat: { type: string; id: string } }> = [];
  for (const row of rows) {
    const r = row.resident;
    const cat = determineCategory(
      r.seniorCitizenBeneficiary,
      r.pwdBeneficiary,
      r.studentBeneficiary,
      r.soloParentBeneficiary,
      r.healthcareWorkerBeneficiary,
    );
    if (cat) {
      categoryEntries.push({ applicationId: row.id, cat });
    }
  }

  // Batch-fetch all relevant pivot rows using Prisma ORM
  let pivotMap = new Map<string, { status: string | null; suspendedAt: Date | null }>();
  if (categoryEntries.length > 0) {
    const pivotRows = await prisma.beneficiaryProgramPivot.findMany({
      where: {
        programId: LIBRE_SAKAY_PROGRAM_ID,
        OR: categoryEntries.map((e) => ({
          beneficiaryType: e.cat.type as BeneficiaryType,
          beneficiaryId: e.cat.id,
        })),
      },
      select: { beneficiaryType: true, beneficiaryId: true, status: true, suspendedAt: true },
    });

    for (const p of pivotRows) {
      pivotMap.set(`${p.beneficiaryType}:${p.beneficiaryId}`, {
        status: p.status,
        suspendedAt: p.suspendedAt,
      });
    }
    for (const entry of categoryEntries) {
      const pivot = pivotMap.get(`${entry.cat.type}:${entry.cat.id}`);
      if (pivot) {
        pivotMap.set(entry.applicationId, { status: pivot.status, suspendedAt: pivot.suspendedAt });
      }
    }
  }

  let data: BeneficiaryListItem[] = rows.map((row) => {
    const r = row.resident;
    const cat = determineCategory(
      r.seniorCitizenBeneficiary,
      r.pwdBeneficiary,
      r.studentBeneficiary,
      r.soloParentBeneficiary,
      r.healthcareWorkerBeneficiary,
    );
    const pivotInfo = pivotMap.get(row.id) ?? { status: null, suspendedAt: null };

    return {
      id: row.id,
      residentId: r.id,
      fullName: buildFullName(r.firstName, r.middleName, r.lastName, r.extensionName),
      residentIdNumber: r.residentId ?? r.id,
      category: cat?.type ?? 'N/A',
      barangay: r.barangay?.barangayName || 'N/A',
      status: mapEnrollmentStatus(pivotInfo.status),
      suspendedAt: pivotInfo.suspendedAt ? pivotInfo.suspendedAt.toISOString() : null,
      enrolledAt: row.reviewedAt || row.appliedAt,
      applicationId: row.id,
      appliedAt: row.appliedAt,
      reviewedAt: row.reviewedAt,
    };
  });

  // Apply status filter
  if (filter === 'active') {
    data = data.filter((b) => b.status === 'ACTIVE');
  } else if (filter === 'suspended') {
    data = data.filter((b) => b.status === 'INACTIVE');
  }

  return {
    data,
    total: filter !== 'all' ? data.length : total,
    page,
    limit,
    totalPages: Math.ceil((filter !== 'all' ? data.length : total) / limit),
  };
};

// =============================================================================
// GET SINGLE BENEFICIARY
// =============================================================================

export const getBeneficiaryById = async (id: string): Promise<BeneficiaryDetails | null> => {
  const row = await prisma.governmentProgramApplication.findUnique({
    where: { id },
    include: {
      resident: {
        include: {
          barangay: { select: { barangayName: true, municipality: true } },
          seniorCitizenBeneficiary: { select: { seniorCitizenId: true } },
          pwdBeneficiary: { select: { pwdId: true } },
          studentBeneficiary: { select: { studentId: true } },
          soloParentBeneficiary: { select: { soloParentId: true } },
          healthcareWorkerBeneficiary: { select: { healthcareWorkerId: true } },
        },
      },
      reviewedByUser: { select: { name: true } },
    },
  });
  if (!row) return null;

  const r = row.resident;
  const cat = determineCategory(
    r.seniorCitizenBeneficiary,
    r.pwdBeneficiary,
    r.studentBeneficiary,
    r.soloParentBeneficiary,
    r.healthcareWorkerBeneficiary,
  );

  // Fetch pivot for this specific category + Libre-Sakay
  let pivotStatus: string | null = null;
  let pivotSuspendedAt: Date | null = null;
  if (cat) {
    const pivot = await prisma.beneficiaryProgramPivot.findFirst({
      where: {
        programId: LIBRE_SAKAY_PROGRAM_ID,
        beneficiaryType: cat.type as BeneficiaryType,
        beneficiaryId: cat.id,
      },
      select: { status: true, suspendedAt: true },
    });
    if (pivot) {
      pivotStatus = pivot.status;
      pivotSuspendedAt = pivot.suspendedAt;
    }
  }

  // Libre-Sakay beneficiary record
  let libreBeneficiaryId: string | null = null;
  let passNumber: string | null = null;
  let passExpiry: Date | null = null;
  try {
    const { getLibreSakaySupabase } = await import('../config/libre-sakay-supabase');
    const supabase = getLibreSakaySupabase();
    const { data: libreData } = await supabase
      .from('libre_sakay_beneficiary')
      .select('id, pass_number, pass_expiry')
      .eq('resident_uuid', r.id)
      .maybeSingle();
    if (libreData) {
      libreBeneficiaryId = libreData.id;
      passNumber = libreData.pass_number;
      passExpiry = libreData.pass_expiry ? new Date(libreData.pass_expiry) : null;
    }
  } catch { /* not found */ }

  // Ride stats
  let totalRides = 0;
  let lastRideDate: Date | null = null;
  if (libreBeneficiaryId) {
    try {
      const { getLibreSakaySupabase } = await import('../config/libre-sakay-supabase');
      const supabase = getLibreSakaySupabase();
      const { data: rides } = await supabase
        .from('ride_logs')
        .select('id, ride_date')
        .eq('beneficiary_id', libreBeneficiaryId)
        .order('ride_date', { ascending: false })
        .limit(1);
      totalRides = rides?.length || 0;
      lastRideDate = rides?.[0]?.ride_date ? new Date(rides[0].ride_date) : null;
    } catch { /* ignore */ }
  }

  return {
    id: row.id,
    residentId: r.id,
    fullName: buildFullName(r.firstName, r.middleName, r.lastName, r.extensionName),
    residentIdNumber: r.residentId ?? r.id,
    category: cat?.type ?? 'N/A',
    barangay: r.barangay?.barangayName || 'N/A',
  status: mapEnrollmentStatus(pivotStatus),
    suspendedAt: pivotSuspendedAt ? pivotSuspendedAt.toISOString() : null,
    enrolledAt: row.reviewedAt || row.appliedAt,
    applicationId: row.id,
    appliedAt: row.appliedAt,
    reviewedAt: row.reviewedAt,
    reviewedByName: row.reviewedByUser?.name ?? null,
    picturePath: r.picturePath,
    middleName: r.middleName,
    extensionName: r.extensionName,
    birthdate: r.birthdate,
    sex: r.sex,
    address: r.streetAddress
      ? `${r.streetAddress}, ${r.barangay?.barangayName || ''}, ${r.barangay?.municipality?.municipalityName || ''}`
      : `${r.barangay?.barangayName || ''}, ${r.barangay?.municipality?.municipalityName || ''}`,
    contactNumber: r.contactNumber,
    emergencyContactName: r.emergencyContactPerson,
    emergencyContactPhone: r.emergencyContactNumber,
    submittedData: (row.submittedData as Record<string, any>) || {},
    attachments: (row.attachments as Record<string, any>) || {},
    adminNotes: row.adminNotes || null,
    libreBeneficiaryId,
    passNumber,
    passExpiry,
    totalRides,
    lastRideDate,
  };
};

// =============================================================================
// SUSPEND BENEFICIARY — Option B: update only the Libre-Sakay pivot row
// =============================================================================

export const suspendBeneficiary = async (id: string): Promise<void> => {
  const application = await prisma.governmentProgramApplication.findUnique({
    where: { id },
    include: {
      resident: {
        include: {
          seniorCitizenBeneficiary: { select: { seniorCitizenId: true } },
          pwdBeneficiary: { select: { pwdId: true } },
          studentBeneficiary: { select: { studentId: true } },
          soloParentBeneficiary: { select: { soloParentId: true } },
          healthcareWorkerBeneficiary: { select: { healthcareWorkerId: true } },
        },
      },
    },
  });

  if (!application) throw new Error('Beneficiary not found');

  const cat = determineCategory(
    application.resident.seniorCitizenBeneficiary,
    application.resident.pwdBeneficiary,
    application.resident.studentBeneficiary,
    application.resident.soloParentBeneficiary,
    application.resident.healthcareWorkerBeneficiary,
  );

  if (!cat) throw new Error('No beneficiary category found');

  const pivot = await prisma.beneficiaryProgramPivot.findFirst({
    where: {
      programId: LIBRE_SAKAY_PROGRAM_ID,
      beneficiaryType: cat.type as any,
      beneficiaryId: cat.id,
    },
    select: { id: true, status: true },
  });

  if (!pivot) throw new Error('No Libre-Sakay enrollment found');

  // Only set suspendedAt on first suspension — don't reset if already suspended
  const updateData: any = { status: 'suspended' };
  if (pivot.status !== 'suspended') {
    updateData.suspendedAt = new Date();
  }

  await prisma.beneficiaryProgramPivot.update({
    where: { id: pivot.id },
    data: updateData,
  });
};

// =============================================================================
// ACTIVATE BENEFICIARY — Option B: restore the Libre-Sakay pivot row
// =============================================================================

export const activateBeneficiary = async (id: string): Promise<void> => {
  const application = await prisma.governmentProgramApplication.findUnique({
    where: { id },
    include: {
      resident: {
        include: {
          seniorCitizenBeneficiary: { select: { seniorCitizenId: true } },
          pwdBeneficiary: { select: { pwdId: true } },
          studentBeneficiary: { select: { studentId: true } },
          soloParentBeneficiary: { select: { soloParentId: true } },
          healthcareWorkerBeneficiary: { select: { healthcareWorkerId: true } },
        },
      },
    },
  });

  if (!application) throw new Error('Beneficiary not found');

  const cat = determineCategory(
    application.resident.seniorCitizenBeneficiary,
    application.resident.pwdBeneficiary,
    application.resident.studentBeneficiary,
    application.resident.soloParentBeneficiary,
    application.resident.healthcareWorkerBeneficiary,
  );

  if (!cat) throw new Error('No beneficiary category found');

  const pivot = await prisma.beneficiaryProgramPivot.findFirst({
    where: {
      programId: LIBRE_SAKAY_PROGRAM_ID,
      beneficiaryType: cat.type as any,
      beneficiaryId: cat.id,
    },
    select: { id: true },
  });

  if (!pivot) throw new Error('No Libre-Sakay enrollment found');

  await prisma.beneficiaryProgramPivot.update({
    where: { id: pivot.id },
    data: { status: 'active', suspendedAt: null },
  });
};

// =============================================================================
// REMOVE BENEFICIARY — Option B: mark pivot as cancelled (soft-delete)
// =============================================================================

export const removeBeneficiary = async (id: string): Promise<void> => {
  const application = await prisma.governmentProgramApplication.findUnique({
    where: { id },
    include: {
      resident: {
        include: {
          seniorCitizenBeneficiary: { select: { seniorCitizenId: true } },
          pwdBeneficiary: { select: { pwdId: true } },
          studentBeneficiary: { select: { studentId: true } },
          soloParentBeneficiary: { select: { soloParentId: true } },
          healthcareWorkerBeneficiary: { select: { healthcareWorkerId: true } },
        },
      },
    },
  });

  if (!application) throw new Error('Beneficiary not found');

  const cat = determineCategory(
    application.resident.seniorCitizenBeneficiary,
    application.resident.pwdBeneficiary,
    application.resident.studentBeneficiary,
    application.resident.soloParentBeneficiary,
    application.resident.healthcareWorkerBeneficiary,
  );

  if (!cat) throw new Error('No beneficiary category found');

  const pivot = await prisma.beneficiaryProgramPivot.findFirst({
    where: {
      programId: LIBRE_SAKAY_PROGRAM_ID,
      beneficiaryType: cat.type as any,
      beneficiaryId: cat.id,
    },
    select: { id: true },
  });

  if (!pivot) throw new Error('No Libre-Sakay enrollment found');

  // Mark pivot as cancelled and update application status
  await Promise.all([
    prisma.beneficiaryProgramPivot.update({
      where: { id: pivot.id },
      data: { status: 'cancelled' },
    }),
    prisma.governmentProgramApplication.update({
      where: { id },
      data: { status: 'cancelled' },
    }),
  ]);
};

// =============================================================================
// EXPORT
// =============================================================================

export const getBeneficiariesForExport = async (
  filter: 'all' | 'active' | 'suspended' = 'all'
): Promise<BeneficiaryListItem[]> => {
  const BATCH_SIZE = 10000;
  const allData: BeneficiaryListItem[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await listBeneficiaries(filter, page, BATCH_SIZE);
    allData.push(...result.data);
    hasMore = result.data.length === BATCH_SIZE;
    page++;
  }

  return allData;
};

// =============================================================================
// GET MY BENEFICIARY STATUS (resident-facing)
// =============================================================================

export interface MyBeneficiaryStatus {
  enrolled: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | null;
  category: string | null;
  suspendedAt: string | null;
  appliedAt: string | null;
  reviewedAt: string | null;
  passNumber: string | null;
  passExpiry: string | null;
  totalRides: number;
  lastRideDate: string | null;
}

export const getBeneficiaryStatusByResident = async (residentId: string): Promise<MyBeneficiaryStatus> => {
  const defaultResult = { enrolled: false, status: null, category: null, suspendedAt: null, appliedAt: null, reviewedAt: null, passNumber: null, passExpiry: null, totalRides: 0, lastRideDate: null };

  // Look up Libre-Sakay program dynamically from DB (not hardcoded)
  const program = await prisma.governmentProgram.findFirst({
    where: { name: { mode: 'insensitive', contains: 'Libre Sakay' }, isActive: true },
    select: { id: true, types: true },
  });

  if (!program) return defaultResult;

  const programTypes = (program.types as string[]) ?? [];
  const programId = program.id;

  // Fetch resident's classifications with status — only ACTIVE classifications are eligible
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    include: {
      seniorCitizenBeneficiary: { select: { seniorCitizenId: true, status: true } },
      pwdBeneficiary: { select: { pwdId: true, status: true } },
      studentBeneficiary: { select: { studentId: true, status: true } },
      soloParentBeneficiary: { select: { soloParentId: true, status: true } },
      healthcareWorkerBeneficiary: { select: { healthcareWorkerId: true, status: true } },
    },
  });

  if (!resident) return defaultResult;

  // Find the first ACTIVE classification whose type is in the program's allowed types
  const candidates: Array<{ type: BeneficiaryType; id: string }> = [];
  if (resident.seniorCitizenBeneficiary?.seniorCitizenId && resident.seniorCitizenBeneficiary.status === 'ACTIVE') {
    candidates.push({ type: 'SENIOR_CITIZEN', id: resident.seniorCitizenBeneficiary.seniorCitizenId });
  }
  if (resident.pwdBeneficiary?.pwdId && resident.pwdBeneficiary.status === 'ACTIVE') {
    candidates.push({ type: 'PWD', id: resident.pwdBeneficiary.pwdId });
  }
  if (resident.studentBeneficiary?.studentId && resident.studentBeneficiary.status === 'ACTIVE') {
    candidates.push({ type: 'STUDENT', id: resident.studentBeneficiary.studentId });
  }
  if (resident.soloParentBeneficiary?.soloParentId && resident.soloParentBeneficiary.status === 'ACTIVE') {
    candidates.push({ type: 'SOLO_PARENT', id: resident.soloParentBeneficiary.soloParentId });
  }
  if (resident.healthcareWorkerBeneficiary?.healthcareWorkerId && resident.healthcareWorkerBeneficiary.status === 'ACTIVE') {
    candidates.push({ type: 'HEALTHCARE_WORKER', id: resident.healthcareWorkerBeneficiary.healthcareWorkerId });
  }

  const cat = candidates.find(c => programTypes.includes(c.type)) ?? null;

  if (!cat) return defaultResult;

  // Find the Libre-Sakay approved application for this resident
  const application = await prisma.governmentProgramApplication.findFirst({
    where: { residentId, programId, status: 'approved' },
    orderBy: { reviewedAt: 'desc' },
  });

  if (!application) {
    // Has ACTIVE classification eligible for this program but hasn't applied yet.
    // Return category so frontend knows the resident can apply.
    return { ...defaultResult, category: cat.type };
  }

  // Get pivot status for this beneficiary type
  const pivot = await prisma.beneficiaryProgramPivot.findFirst({
    where: { programId, beneficiaryType: cat.type, beneficiaryId: cat.id },
    select: { status: true, suspendedAt: true },
  });

  const status = mapEnrollmentStatus(pivot?.status ?? null);
  const suspendedAt = pivot?.suspendedAt ? pivot.suspendedAt.toISOString() : null;

  // Libre-Sakay beneficiary record (pass number, expiry, rides)
  let passNumber: string | null = null;
  let passExpiry: string | null = null;
  let totalRides = 0;
  let lastRideDate: string | null = null;

  try {
    const { getLibreSakaySupabase } = await import('../config/libre-sakay-supabase');
    const supabase = getLibreSakaySupabase();
    const { data: libreData } = await supabase
      .from('libre_sakay_beneficiary')
      .select('id, pass_number, pass_expiry')
      .eq('resident_uuid', residentId)
      .maybeSingle();

    if (libreData) {
      passNumber = libreData.pass_number;
      passExpiry = libreData.pass_expiry;
    }

    if (libreData?.id) {
      const { data: rides } = await supabase
        .from('ride_logs')
        .select('id, ride_date')
        .eq('beneficiary_id', libreData.id)
        .order('ride_date', { ascending: false })
        .limit(1);
      totalRides = rides?.length || 0;
      lastRideDate = rides?.[0]?.ride_date ?? null;
    }
  } catch { /* not available */ }

  return {
    enrolled: true,
    status,
    category: cat.type,
    suspendedAt,
    appliedAt: application.appliedAt.toISOString(),
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    passNumber,
    passExpiry,
    totalRides,
    lastRideDate,
  };
};
