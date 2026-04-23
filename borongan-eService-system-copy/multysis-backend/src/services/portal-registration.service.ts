/**
 * portal-registration.service.ts
 *
 * Handles the full lifecycle of resident self-registration via the portal:
 *   1. submitRegistration  — create PENDING resident + registration_request
 *   2. getRegistrationStatus — check status by username
 *   3. listRegistrationRequests — BIMS admin review queue
 *   4. reviewRegistrationRequest — approve / reject / require resubmission
 *   5. deleteRejectedRegistrations — cleanup
 *
 * Replaces: citizen-registration.service.ts
 */

import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import cacheService from './cache.service';
import { hashPassword, generateTempPassword } from '../utils/password';
import { sendEmailSafely } from './email.service';
import {
  getResidentApprovalEmail,
  getResidentRejectionEmail,
  getResidentResubmissionEmail,
} from './email-templates/resident-notifications';

// =============================================================================
// TYPES
// =============================================================================

export interface ResidentRegistrationData {
  // Name
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  // Demographics
  birthdate: string | Date;
  sex: string;
  civilStatus: string;
  birthRegion?: string;
  birthProvince?: string;
  birthMunicipality?: string;
  citizenship?: string;
  // Contact
  contactNumber?: string;
  email?: string;
  // Address (unified: barangay FK + street)
  barangayId: number;
  streetAddress?: string;
  // Socio-economic
  occupation?: string;
  profession?: string;
  employmentStatus?: string;
  educationAttainment?: string;
  monthlyIncome?: number;
  height?: string;
  weight?: string;
  // Flags
  isVoter?: boolean;
  isEmployed?: boolean;
  indigenousPerson?: boolean;
  // Government ID
  idType: string;
  idDocumentNumber: string;
  idDocumentUrl: string; // base64 or uploaded file path
  // Selfie (for admin identity verification)
  selfieUrl?: string;
  // Profile picture path (from pre-registration upload)
  picturePath?: string;
  // Portal credentials (set during registration)
  username: string;
  password: string;
  // Emergency contact
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  spouseName?: string;
  acrNo?: string;
  // Social amelioration sub-fields (self-reported on registration)
  hasDisability?: boolean;
  hasChildren?: boolean;
  ameliorationData?: {
    seniorCitizen?: { pensionTypeIds: string[] };
    pwd?: { disabilityTypeId: string; disabilityLevel?: string };
    student?: { gradeLevelId: string };
    soloParent?: { categoryId: string };
    voter?: { voterType: 'Regular' | 'SK' };
  };
}

export interface RegistrationRequestFilters {
  status?: string;
  search?: string;
  barangayId?: number;
  page?: number;
  limit?: number;
}

// =============================================================================
// SUBMIT REGISTRATION
// Creates a PENDING resident + ResidentCredential + RegistrationRequest.
// Returns immediately without generating a resident_id (done on approval).
// =============================================================================

export const submitRegistration = async (data: ResidentRegistrationData) => {
  const birthdateValue =
    typeof data.birthdate === 'string'
      ? new Date(data.birthdate + 'T00:00:00.000Z')
      : data.birthdate;

  // Duplicate checks
  if (data.username) {
    const existingUsername = await prisma.resident.findUnique({
      where: { username: data.username },
      select: { id: true },
    });
    if (existingUsername) {
      throw new Error('Username is already taken. Please choose a different username.');
    }
  }

  if (data.email) {
    const existingEmail = await prisma.resident.findFirst({
      where: { email: data.email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new Error('Email address is already registered.');
    }
  }

  // Verify barangay exists
  const barangay = await prisma.barangay.findUnique({
    where: { id: data.barangayId },
    select: { id: true },
  });
  if (!barangay) {
    throw new Error('Invalid barangay selected.');
  }

  const hashedPassword = await hashPassword(data.password);

  // Atomic create: resident + credentials + registration_request
  const result = await prisma.$transaction(async (tx) => {
    const resident = await tx.resident.create({
      data: {
        barangayId: data.barangayId,
        streetAddress: data.streetAddress || null,
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        extensionName: data.extensionName || null,
        sex: data.sex,
        civilStatus: data.civilStatus,
        birthdate: birthdateValue,
        birthRegion: data.birthRegion || null,
        birthProvince: data.birthProvince || null,
        birthMunicipality: data.birthMunicipality || null,
        citizenship: data.citizenship || null,
        contactNumber: data.contactNumber || null,
        email: data.email || null,
        occupation: data.occupation || null,
        profession: data.profession || null,
        employmentStatus: data.employmentStatus || null,
        educationAttainment: data.educationAttainment || null,
        monthlyIncome: data.monthlyIncome ? data.monthlyIncome : null,
        height: data.height || null,
        weight: data.weight || null,
        isVoter: data.isVoter ?? false,
        isEmployed: data.isEmployed ?? false,
        indigenousPerson: data.indigenousPerson ?? false,
        idType: data.idType,
        idDocumentNumber: data.idDocumentNumber,
        proofOfIdentification: data.idDocumentUrl,
        picturePath: data.picturePath || null,
        emergencyContactPerson: data.emergencyContactPerson || null,
        emergencyContactNumber: data.emergencyContactNumber || null,
        spouseName: data.spouseName || null,
        acrNo: data.acrNo || null,
        username: data.username,
        status: 'pending',
      },
    });

    await tx.residentCredential.create({
      data: {
        residentFk: resident.id,
        password: hashedPassword,
      },
    });

    const registrationRequest = await tx.registrationRequest.create({
      data: {
        residentFk: resident.id,
        selfieUrl: data.selfieUrl || null,
        status: 'pending',
        ameliorationData: data.ameliorationData ?? null,
      },
    });

    return { resident, registrationRequest };
  });

  return {
    id: result.registrationRequest.id,
    residentId: result.resident.id,
    username: result.resident.username,
    status: 'pending',
    createdAt: result.registrationRequest.createdAt,
  };
};

// =============================================================================
// GET REGISTRATION STATUS  (public — by username)
// =============================================================================

export const getRegistrationStatus = async (username: string) => {
  const resident = await prisma.resident.findUnique({
    where: { username },
    select: {
      id: true,
      residentId: true,
      username: true,
      firstName: true,
      lastName: true,
      status: true,
      applicationRemarks: true,
      registrationRequest: {
        select: {
          id: true,
          status: true,
          adminNotes: true,
          reviewedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!resident) {
    throw new Error('Registration not found');
  }

  return {
    residentId: resident.residentId,
    username: resident.username,
    firstName: resident.firstName,
    lastName: resident.lastName,
    accountStatus: resident.status,
    registrationStatus: resident.registrationRequest?.status ?? 'not_submitted',
    adminNotes: resident.registrationRequest?.adminNotes ?? null,
    reviewedAt: resident.registrationRequest?.reviewedAt ?? null,
    submittedAt: resident.registrationRequest?.createdAt ?? null,
  };
};

// =============================================================================
// HELPERS: Fetch classifications for multiple residents (raw SQL, BIMS table)
// =============================================================================

interface ResidentClassificationRow {
  resident_id: string;
  id: number;
  classification_type: string;
  classification_details: unknown;
}

/**
 * Batch-fetch resident_classifications for multiple resident IDs.
 * Returns a Map: residentId → classifications array.
 * Uses cache to avoid redundant queries within the same request.
 */
async function fetchClassificationsForResidents(
  residentIds: string[],
): Promise<Map<string, ResidentClassificationRow[]>> {
  if (!residentIds.length) return new Map();

  // Batch-fetch all classifications in one raw SQL query
  // Use Prisma.join so array interpolation into IN clause is safe
  const idList = Prisma.join(residentIds.map((id) => Prisma.sql`${id}`));
  const rows = await prisma.$queryRaw<ResidentClassificationRow[]>`
    SELECT
      resident_id,
      id AS classification_id,
      classification_type,
      COALESCE(classification_details, '{}'::jsonb) AS classification_details
    FROM resident_classifications
    WHERE resident_id IN (${idList})
  `;

  // Group by resident_id
  const grouped = new Map<string, ResidentClassificationRow[]>();
  for (const row of rows) {
    const list = grouped.get(row.resident_id) ?? [];
    list.push(row);
    grouped.set(row.resident_id, list);
  }

  return grouped;
}

// =============================================================================
// LIST REGISTRATION REQUESTS  (BIMS admin)
// =============================================================================

export const listRegistrationRequests = async (filters: RegistrationRequestFilters) => {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereResident: any = {};
  if (filters.barangayId) whereResident.barangayId = filters.barangayId;
  if (filters.search) {
    whereResident.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { username: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (Object.keys(whereResident).length) {
    where.resident = { is: whereResident };
  }

  const [requests, total] = await prisma.$transaction([
    prisma.registrationRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        resident: {
          select: {
            id: true,
            residentId: true,
            username: true,
            firstName: true,
            middleName: true,
            lastName: true,
            extensionName: true,
            email: true,
            contactNumber: true,
            sex: true,
            birthdate: true,
            civilStatus: true,
            status: true,
            barangay: {
              select: {
                id: true,
                barangayName: true,
                municipality: {
                  select: { id: true, municipalityName: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.registrationRequest.count({ where }),
  ]);

  // Attach classifications to each resident (raw SQL, BIMS-managed table)
  const residentIds = requests.map((r) => r.resident.id).filter(Boolean);
  const classificationsMap = await fetchClassificationsForResidents(residentIds);

  const requestsWithClassifications = requests.map((request) => ({
    ...request,
    resident: request.resident
      ? {
          ...request.resident,
          classifications: classificationsMap.get(request.resident.id) ?? [],
        }
      : undefined,
  }));

  return {
    requests: requestsWithClassifications,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// =============================================================================
// GET SINGLE REGISTRATION REQUEST  (BIMS admin)
// =============================================================================

export const getRegistrationRequest = async (requestId: string) => {
  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
    include: {
      resident: {
        include: {
          barangay: {
            include: { municipality: true },
          },
        },
      },
    },
  });

  if (!request) throw new Error('Registration request not found');
  return request;
};

// =============================================================================
// MARK UNDER REVIEW  (BIMS admin)
// =============================================================================

export const markUnderReview = async (requestId: string, reviewerId: number) => {
  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) throw new Error('Registration request not found');
  if (request.status !== 'pending') {
    throw new Error(`Cannot mark as under_review from status: ${request.status}`);
  }

  return prisma.registrationRequest.update({
    where: { id: requestId },
    data: {
      status: 'under_review',
      reviewedBy: reviewerId,
    },
  });
};

// =============================================================================
// REVIEW REGISTRATION REQUEST  (approve / reject)
// =============================================================================

export interface ReviewData {
  action: 'approve' | 'reject';
  adminNotes?: string;
  reviewerId: number; // bims_users.id
}

// =============================================================================
// AUTO-CLASSIFICATION HELPERS
// =============================================================================

const EMPLOYMENT_STATUS_TO_CLASSIFICATION: Record<string, string> = {
  unemployed: 'Unemployed',
  'self-employed': 'Self Employed',
  retired: 'Retired',
  student: 'Student',
};

function isCollegeLevel(educationAttainment?: string | null): boolean {
  if (!educationAttainment) return false;
  const val = educationAttainment.toLowerCase();
  return (
    val.includes('college') ||
    val.includes('bachelor') ||
    val.includes('master') ||
    val.includes('doctorate') ||
    val.includes('doctoral') ||
    val.includes('university') ||
    val.includes('post-secondary') ||
    val.includes('tertiary')
  );
}

/**
 * Auto-insert resident_classifications rows from flat resident fields.
 * Uses raw SQL since resident_classifications is not in the Prisma schema.
 * Best-effort — errors are logged but do not throw.
 */
async function autoClassifyResident(
  residentUUID: string,
  municipalityId: number,
  resident: {
    isVoter?: boolean;
    employmentStatus?: string | null;
    educationAttainment?: string | null;
    indigenousPerson?: boolean;
    birthdate?: Date | null;
  }
): Promise<void> {
  const toInsert: Array<{ type: string; details: object }> = [];

  if (resident.isVoter) {
    toInsert.push({ type: 'Voter', details: [{ typeOfVoter: 'Regular' }] });
  }

  const employmentClass = resident.employmentStatus
    ? EMPLOYMENT_STATUS_TO_CLASSIFICATION[resident.employmentStatus]
    : undefined;

  if (employmentClass) {
    if (resident.employmentStatus === 'student') {
      const classType = isCollegeLevel(resident.educationAttainment)
        ? 'College Student'
        : 'Student';
      toInsert.push({ type: classType, details: [] });
    } else {
      toInsert.push({ type: employmentClass, details: [] });
    }
  }

  if (resident.indigenousPerson) {
    toInsert.push({ type: 'Indigenous Person', details: [] });
  }

  if (resident.birthdate) {
    const ageDays = (Date.now() - new Date(resident.birthdate).getTime()) / 86400000;
    if (ageDays >= 60 * 365.25) {
      toInsert.push({ type: 'Senior Citizen', details: [] });
    }
  }

  for (const { type, details } of toInsert) {
    try {
      // Verify type exists for this municipality
      const typeRows = await prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM classification_types
        WHERE name = ${type} AND municipality_id = ${municipalityId}
        LIMIT 1
      `;
      if (typeRows.length === 0) {
        console.warn(
          `[auto-classify] Type "${type}" not found for municipality ${municipalityId} — skipping`
        );
        continue;
      }

      await prisma.$executeRaw`
        INSERT INTO resident_classifications (resident_id, classification_type, classification_details)
        VALUES (${residentUUID}, ${type}, ${JSON.stringify(details)}::jsonb)
        ON CONFLICT ON CONSTRAINT resident_classifications_unique_type DO NOTHING
      `;
      // eslint-disable-next-line no-console
      console.info(`[auto-classify] Inserted "${type}" for resident ${residentUUID}`);
    } catch (err: any) {
      console.error(
        `[auto-classify] Failed to insert "${type}" for ${residentUUID}: ${(err as Error).message}`
      );
    }
  }
}

export const reviewRegistrationRequest = async (requestId: string, data: ReviewData) => {
  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
    include: {
      resident: {
        include: { barangay: { include: { municipality: true } } },
      },
    },
  });

  if (!request) throw new Error('Registration request not found');
  if (!request.resident) throw new Error('Resident record not found');
  if (!['pending', 'under_review'].includes(request.status)) {
    throw new Error(`Cannot review from status: ${request.status}`);
  }

  const resident = request.resident;

  if (data.action === 'approve') {
    // Generate resident_id: {PREFIX}-{YEAR}-{7-digit}
    const municipalityId = resident.barangay?.municipality?.id;
    if (!municipalityId) throw new Error('Resident has no municipality — cannot generate ID');

    const year = new Date().getFullYear();
    const residentId = await generateResidentId(municipalityId, year);

    // Update resident + registration_request in one transaction
    await prisma.$transaction([
      prisma.resident.update({
        where: { id: resident.id },
        data: {
          residentId,
          status: 'active',
          applicationRemarks: data.adminNotes || null,
        },
      }),
      prisma.registrationRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          adminNotes: data.adminNotes || null,
          reviewedBy: data.reviewerId,
          reviewedAt: new Date(),
        },
      }),
    ]);

    // Auto-create classifications from flat registration fields (non-blocking)
    const classifyMunicipalityId = resident.barangay?.municipality?.id;
    if (classifyMunicipalityId) {
      autoClassifyResident(resident.id, classifyMunicipalityId, {
        isVoter: resident.isVoter ?? false,
        employmentStatus: resident.employmentStatus,
        educationAttainment: resident.educationAttainment,
        indigenousPerson: resident.indigenousPerson ?? false,
        birthdate: resident.birthdate,
      }).catch((err: any) =>
        console.error(
          `[auto-classify] autoClassifyResident error for ${resident.id}: ${(err as Error).message}`
        )
      );
    }

    // NOTE: Beneficiary sync with amelioration details is handled by the BIMS
    // approval route (registrationRoutes.js) which reads amelioration_data from
    // registration_requests and passes it to _syncBeneficiaryOnInsert.

    // Send approval email (non-blocking)
    if (resident.email) {
      const tempPassword = generateTempPassword();
      const hashedTemp = await hashPassword(tempPassword);
      // Update credential with temp password hint so resident can reset
      await prisma.residentCredential.updateMany({
        where: { residentFk: resident.id },
        data: { password: hashedTemp },
      });

      let emailSent = false;
      try {
        const { subject, html, text } = getResidentApprovalEmail({
          residentName: `${resident.firstName} ${resident.lastName}`,
          residentId,
          email: resident.email,
          tempPassword,
          loginUrl: process.env.PORTAL_URL
            ? `${process.env.PORTAL_URL}/portal/login`
            : '/portal/login',
        });
        await sendEmailSafely(resident.email, subject, html, text);
        emailSent = true;
      } catch (err: any) {
        console.error('Failed to send approval email:', err.message);
      }

      return { residentId, status: 'approved', emailSent };
    }

    return { residentId, status: 'approved', emailSent: true };
  } else {
    // reject
    await prisma.$transaction([
      prisma.resident.update({
        where: { id: resident.id },
        data: {
          status: 'rejected',
          applicationRemarks: data.adminNotes || null,
        },
      }),
      prisma.registrationRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          adminNotes: data.adminNotes || null,
          reviewedBy: data.reviewerId,
          reviewedAt: new Date(),
        },
      }),
    ]);

    // Send rejection email (non-blocking)
    if (resident.email) {
      try {
        const { subject, html, text } = getResidentRejectionEmail({
          residentName: `${resident.firstName} ${resident.lastName}`,
          email: resident.email,
          adminNotes: data.adminNotes,
        });
        await sendEmailSafely(resident.email, subject, html, text);
      } catch (err: any) {
        console.error('Failed to send rejection email:', err.message);
      }
    }

    return { status: 'rejected' };
  }
};

// =============================================================================
// REQUEST RESUBMISSION  (BIMS admin asks applicant to re-upload documents)
// =============================================================================

export const requestResubmission = async (
  requestId: string,
  adminNotes: string,
  reviewerId: number
) => {
  const request = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
    include: { resident: true },
  });
  if (!request) throw new Error('Registration request not found');
  if (!['pending', 'under_review'].includes(request.status)) {
    throw new Error(`Cannot request resubmission from status: ${request.status}`);
  }

  const updated = await prisma.registrationRequest.update({
    where: { id: requestId },
    data: {
      status: 'requires_resubmission',
      adminNotes,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
  });

  // Send resubmission email (non-blocking)
  if (request.resident?.email) {
    try {
      const { subject, html, text } = getResidentResubmissionEmail({
        residentName: `${request.resident.firstName} ${request.resident.lastName}`,
        email: request.resident.email,
        adminNotes,
        statusUrl: process.env.PORTAL_URL
          ? `${process.env.PORTAL_URL}/portal/register/status?username=${request.resident.username}`
          : `/portal/register/status?username=${request.resident.username}`,
      });
      await sendEmailSafely(request.resident.email, subject, html, text);
    } catch (err: any) {
      console.error('Failed to send resubmission email:', err.message);
    }
  }

  return updated;
};

// =============================================================================
// RESUBMIT DOCUMENTS  (resident re-uploads after resubmission request)
// =============================================================================

export const resubmitDocuments = async (
  username: string,
  selfieUrl: string,
  idDocumentUrl: string
) => {
  const resident = await prisma.resident.findFirst({ where: { username } });
  if (!resident) throw new Error('Resident not found');

  const request = await prisma.registrationRequest.findFirst({
    where: { residentFk: resident.id, status: 'requires_resubmission' },
  });
  if (!request) throw new Error('No pending resubmission request found');

  await prisma.$transaction([
    prisma.registrationRequest.update({
      where: { id: request.id },
      data: {
        status: 'pending',
        selfieUrl,
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    }),
    prisma.resident.update({
      where: { id: resident.id },
      data: { proofOfIdentification: idDocumentUrl },
    }),
  ]);

  return { success: true };
};

// =============================================================================
// DELETE REJECTED REGISTRATIONS  (cleanup — older than N days)
// =============================================================================

export const deleteRejectedRegistrations = async (olderThanDays = 30) => {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const oldRequests = await prisma.registrationRequest.findMany({
    where: {
      status: 'rejected',
      reviewedAt: { lt: cutoff },
    },
    select: { id: true, residentFk: true },
  });

  const residentIds = oldRequests.map((r) => r.residentFk);

  // Deleting the resident cascades to registration_request and credentials
  await prisma.resident.deleteMany({
    where: { id: { in: residentIds }, status: 'rejected' },
  });

  return { deleted: oldRequests.length };
};

// =============================================================================
// INTERNAL: Generate Resident ID
// Format: {PREFIX}-{YEAR}-{7-digit zero-padded counter}
// Uses resident_counters table (municipality-scoped, year-scoped, atomic)
// =============================================================================

async function generateResidentId(municipalityId: number, year: number): Promise<string> {
  // Upsert the counter row and atomically increment
  await prisma.$executeRaw`
    INSERT INTO public.resident_counters (municipality_id, year, counter, prefix)
    VALUES (${municipalityId}, ${year}, 1, 'RES')
    ON CONFLICT (municipality_id, year)
    DO UPDATE SET counter = resident_counters.counter + 1
  `;

  const row = await prisma.$queryRaw<{ counter: number; prefix: string }[]>`
    SELECT counter, prefix FROM public.resident_counters
    WHERE municipality_id = ${municipalityId} AND year = ${year}
    LIMIT 1
  `;

  if (!row.length) throw new Error('Failed to generate resident ID counter');

  const { counter, prefix } = row[0];
  const paddedCounter = String(counter).padStart(7, '0');
  return `${prefix}-${year}-${paddedCounter}`;
}
