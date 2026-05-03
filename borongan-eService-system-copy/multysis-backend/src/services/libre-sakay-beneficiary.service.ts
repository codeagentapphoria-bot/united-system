import prisma from '../config/database';

const LIBRE_SAKAY_PROGRAM_ID = 'gp-all-libre-sakay';

// =============================================================================
// TYPES
// =============================================================================

export interface BeneficiaryListItem {
  id: string;
  residentId: string;
  fullName: string;
  residentIdNumber: string;
  category: string;
  barangay: string;
  enrollmentStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
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
  senior: { id: string } | null,
  pwd: { id: string } | null,
  student: { id: string } | null,
  soloParent: { id: string } | null,
): { type: string; id: string } | null {
  if (senior) return { type: 'SENIOR_CITIZEN', id: senior.id };
  if (pwd) return { type: 'PWD', id: pwd.id };
  if (student) return { type: 'STUDENT', id: student.id };
  if (soloParent) return { type: 'SOLO_PARENT', id: soloParent.id };
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
            seniorCitizenBeneficiary: { select: { id: true } },
            pwdBeneficiary: { select: { id: true } },
            studentBeneficiary: { select: { id: true } },
            soloParentBeneficiary: { select: { id: true } },
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
    );
    if (cat) {
      categoryEntries.push({ applicationId: row.id, cat });
    }
  }

  // Batch-fetch all relevant pivot rows in one query
  let pivotMap = new Map<string, { status: string | null; suspendedAt: Date | null }>();
  if (categoryEntries.length > 0) {
    const pivotRows = await prisma.beneficiaryProgramPivot.findMany({
      where: {
        programId: LIBRE_SAKAY_PROGRAM_ID,
        OR: categoryEntries.map((e) => ({
          beneficiaryType: e.cat.type as any,
          beneficiaryId: e.cat.id,
        })),
      },
      select: { beneficiaryType: true, beneficiaryId: true, status: true, suspendedAt: true },
    });

    const pivotKeyMap = new Map<string, { status: string | null; suspendedAt: Date | null }>();
    for (const p of pivotRows) {
      pivotKeyMap.set(`${p.beneficiaryType}:${p.beneficiaryId}`, {
        status: p.status,
        suspendedAt: p.suspendedAt,
      });
    }
    for (const entry of categoryEntries) {
      const pivot = pivotKeyMap.get(`${entry.cat.type}:${entry.cat.id}`);
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
    );
    const pivotInfo = pivotMap.get(row.id) ?? { status: null, suspendedAt: null };

    return {
      id: row.id,
      residentId: r.id,
      fullName: buildFullName(r.firstName, r.middleName, r.lastName, r.extensionName),
      residentIdNumber: r.residentId ?? r.id,
      category: cat?.type ?? 'N/A',
      barangay: r.barangay?.barangayName || 'N/A',
      enrollmentStatus: mapEnrollmentStatus(pivotInfo.status),
      applicationStatus: row.status as 'pending' | 'approved' | 'rejected' | 'cancelled',
      suspendedAt: pivotInfo.suspendedAt ? pivotInfo.suspendedAt.toISOString() : null,
      enrolledAt: row.reviewedAt || row.appliedAt,
      applicationId: row.id,
      appliedAt: row.appliedAt,
      reviewedAt: row.reviewedAt,
    };
  });

  // Apply enrollment-status filter
  if (filter === 'active') {
    data = data.filter((b) => b.enrollmentStatus === 'ACTIVE');
  } else if (filter === 'suspended') {
    data = data.filter((b) => b.enrollmentStatus === 'INACTIVE');
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
          seniorCitizenBeneficiary: { select: { id: true } },
          pwdBeneficiary: { select: { id: true } },
          studentBeneficiary: { select: { id: true } },
          soloParentBeneficiary: { select: { id: true } },
        },
      },
    },
  });

  if (!row) return null;

  const r = row.resident;
  const cat = determineCategory(
    r.seniorCitizenBeneficiary,
    r.pwdBeneficiary,
    r.studentBeneficiary,
    r.soloParentBeneficiary,
  );

  // Fetch pivot for this specific category + Libre-Sakay
  let pivotStatus: string | null = null;
  let pivotSuspendedAt: Date | null = null;
  if (cat) {
    const pivot = await prisma.beneficiaryProgramPivot.findFirst({
      where: {
        programId: LIBRE_SAKAY_PROGRAM_ID,
        beneficiaryType: cat.type as any,
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
    enrollmentStatus: mapEnrollmentStatus(pivotStatus),
    applicationStatus: row.status as 'pending' | 'approved' | 'rejected' | 'cancelled',
    suspendedAt: pivotSuspendedAt ? pivotSuspendedAt.toISOString() : null,
    enrolledAt: row.reviewedAt || row.appliedAt,
    applicationId: row.id,
    appliedAt: row.appliedAt,
    reviewedAt: row.reviewedAt,
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
          seniorCitizenBeneficiary: { select: { id: true } },
          pwdBeneficiary: { select: { id: true } },
          studentBeneficiary: { select: { id: true } },
          soloParentBeneficiary: { select: { id: true } },
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
          seniorCitizenBeneficiary: { select: { id: true } },
          pwdBeneficiary: { select: { id: true } },
          studentBeneficiary: { select: { id: true } },
          soloParentBeneficiary: { select: { id: true } },
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
          seniorCitizenBeneficiary: { select: { id: true } },
          pwdBeneficiary: { select: { id: true } },
          studentBeneficiary: { select: { id: true } },
          soloParentBeneficiary: { select: { id: true } },
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
