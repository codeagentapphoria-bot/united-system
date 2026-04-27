/**
 * classification.service.ts
 *
 * Admin CRUD for resident classifications and classification types.
 * Uses raw SQL against the shared PostgreSQL database (same pattern
 * as portal-classification.service.ts), bypassing the Prisma schema
 * since resident_classifications and classification_types are BIMS-managed
 * tables not in the E-Service Prisma schema.
 *
 * Mounted at: /api/classification  (admin only)
 */

import prisma from '../config/database';
import cacheService from './cache.service';
import * as socketService from './socket.service';

// =============================================================================
// TYPES
// =============================================================================

export interface ResidentClassification {
  id: number;
  resident_id: string;
  classification_type: string;
  classification_details: unknown;
}

export interface ClassificationType {
  id: number;
  municipality_id: number;
  name: string;
  description: string | null;
  color: string | null;
  details: unknown;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// INSERT CLASSIFICATION
// =============================================================================

export interface InsertClassificationInput {
  residentId: string;
  classificationType: string;
  classificationDetails?: unknown;
}

export const insertClassification = async ({
  residentId,
  classificationType,
  classificationDetails,
}: InsertClassificationInput): Promise<ResidentClassification | null> => {
  // Use ON CONFLICT DO NOTHING so re-inserting an already-existing
  // (resident_id, classification_type) pair is a no-op rather than an error.
  // autoClassifyResident() already creates these records on approval, so
  // the admin form will often attempt duplicates.
  const result = await prisma.$queryRaw<ResidentClassification[]>`
    INSERT INTO resident_classifications (
      resident_id,
      classification_type,
      classification_details
    ) VALUES (
      ${residentId},
      ${classificationType},
      ${JSON.stringify(classificationDetails ?? null)}::jsonb
    )
    ON CONFLICT ON CONSTRAINT resident_classifications_unique_type
    DO UPDATE SET
      classification_details = EXCLUDED.classification_details
    RETURNING *
  `;

  // Sync to beneficiary tables (Senior Citizen, PWD, Student, Solo Parent)
  try {
    await syncBeneficiaryOnInsert(residentId, classificationType, classificationDetails as any);
  } catch (syncErr: any) {
    console.warn(
      `[classification-service] Beneficiary sync failed for resident ${residentId} ` +
      `(${classificationType}): ${syncErr.message}. Classification was saved.`
    );
  }

  // Invalidate cache for this resident
  await cacheService.del(`resident:${residentId}:classifications`);

  return result[0] ?? null;
};

// =============================================================================
// GET CLASSIFICATION TYPES (by municipality)
// =============================================================================

export interface GetClassificationTypesInput {
  municipalityId: number;
}

export const getClassificationTypes = async ({
  municipalityId,
}: GetClassificationTypesInput): Promise<ClassificationType[]> => {
  const cacheKey = `municipality:${municipalityId}:classification-types`;

  const cached = await cacheService.get<ClassificationType[]>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.$queryRaw<ClassificationType[]>`
    SELECT *
    FROM classification_types
    WHERE municipality_id = ${municipalityId}
      AND is_active = true
    ORDER BY name ASC
  `;

  await cacheService.set(cacheKey, rows, 1800); // 30 min TTL
  return rows;
};

// =============================================================================
// INVALIDATE CLASSIFICATION TYPES CACHE
// =============================================================================

export const invalidateClassificationTypesCache = async (
  municipalityId: number
): Promise<void> => {
  await cacheService.del(`municipality:${municipalityId}:classification-types`);
};

// =============================================================================
// BENEFICIARY SYNC — mirrors BIMS Resident._syncBeneficiaryOnInsert
// Called by portal-registration.service.ts after resident approval auto-classifies
// =============================================================================

// Mapping: classification type name → { table, idCol, prefix }
const BENEFICIARY_SYNC_MAP: Record<string, { table: string; idCol: string; prefix: string }> = {
  'Senior Citizen':         { table: 'senior_citizen_beneficiaries', idCol: 'senior_citizen_id', prefix: 'SC'  },
  'Person with Disability': { table: 'pwd_beneficiaries',            idCol: 'pwd_id',            prefix: 'PWD' },
  'Student':               { table: 'student_beneficiaries',        idCol: 'student_id',        prefix: 'ST'  },
  'College Student':       { table: 'student_beneficiaries',        idCol: 'student_id',        prefix: 'ST'  },
  'Solo Parent':           { table: 'solo_parent_beneficiaries',    idCol: 'solo_parent_id',    prefix: 'SP'  },
};

const tableToSocketType: Record<string, 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT'> = {
  senior_citizen_beneficiaries: 'SENIOR_CITIZEN',
  pwd_beneficiaries: 'PWD',
  student_beneficiaries: 'STUDENT',
  solo_parent_beneficiaries: 'SOLO_PARENT',
};

// Normalize detail keys — autoClassifyResident passes form keys
// (disabilityType, disabilityLevel, gradeLevel, category, pensionTypes)
// but _syncBeneficiaryDetails in BIMS uses Id-suffixed keys.
// Accept both so the same details object works for both paths.
function normalizeDetails(
  classificationType: string,
  details: Record<string, unknown>
): Record<string, unknown> {
  switch (classificationType) {
    case 'Person with Disability':
      return {
        disabilityTypeId: (details.disabilityType as string) ?? (details.disabilityTypeId as string) ?? null,
        disabilityLevel:  (details.disabilityLevel  as string) ?? null,
      };
    case 'Student':
    case 'College Student':
      return {
        gradeLevelId: (details.gradeLevel as string) ?? (details.gradeLevelId as string) ?? null,
      };
    case 'Solo Parent':
      return {
        categoryId: (details.category as string) ?? (details.categoryId as string) ?? null,
      };
    case 'Senior Citizen':
      return {
        pensionTypeIds: Array.isArray(details.pensionTypes)
          ? details.pensionTypes
          : Array.isArray(details.pensionTypeIds)
          ? details.pensionTypeIds
          : [],
      };
    default:
      return {};
  }
}

// Update type-specific detail columns on an already-existing PENDING record
async function syncBeneficiaryDetails(
  table: string,
  residentId: string,
  details: Record<string, unknown>
): Promise<void> {
  // We update details for both PENDING and ACTIVE beneficiaries
  const allowedStatuses = ['PENDING', 'ACTIVE'];

  if (table === 'pwd_beneficiaries') {
    const { disabilityTypeId, disabilityLevel } = details as { disabilityTypeId?: string; disabilityLevel?: string };
    await (prisma as any).pWDBeneficiary.updateMany({
      where: { residentId, status: { in: allowedStatuses } },
      data: {
        disabilityTypeId: disabilityTypeId || undefined,
        disabilityLevel: disabilityLevel || undefined,
      },
    });
  } else if (table === 'student_beneficiaries') {
    const { gradeLevelId } = details as { gradeLevelId?: string };
    await (prisma as any).studentBeneficiary.updateMany({
      where: { residentId, status: { in: allowedStatuses } },
      data: {
        gradeLevelId: gradeLevelId || undefined,
      },
    });
  } else if (table === 'solo_parent_beneficiaries') {
    const { categoryId } = details as { categoryId?: string };
    await (prisma as any).soloParentBeneficiary.updateMany({
      where: { residentId, status: { in: allowedStatuses } },
      data: {
        categoryId: categoryId || undefined,
      },
    });
  } else if (table === 'senior_citizen_beneficiaries') {
    // Sync pension type pivots
    const { pensionTypeIds } = details as { pensionTypeIds?: string[] };
    if (pensionTypeIds) {
      const benRecord = await prisma.seniorCitizenBeneficiary.findFirst({
        where: { residentId },
        select: { id: true },
      });
      if (benRecord) {
        const beneficiaryId = benRecord.id;
        // Use a transaction for consistency
        await prisma.$transaction([
          (prisma as any).seniorCitizenPensionTypePivot.deleteMany({
            where: { beneficiaryId },
          }),
          ...(pensionTypeIds.map((settingId) =>
            (prisma as any).seniorCitizenPensionTypePivot.create({
              data: { beneficiaryId, settingId },
            })
          )),
        ]);

        // Emit update
        await socketService.emitBeneficiaryUpdate(beneficiaryId, 'SENIOR_CITIZEN', {
          residentId,
          updatedAt: new Date(),
        });
      }
    }
  }
}

// Generate sequential display ID like SC-2026-001
export const generateBeneficiaryId = async (table: string, prefix: string) => {
  const year = new Date().getFullYear();
  const yearPrefix = `${prefix}-${year}-`;

  // Query for the latest display ID with this year/prefix
  // We still use raw SQL here for the UNION across different tables
  const lastRecord = await prisma.$queryRawUnsafe<Array<{ display_id: string }>>(
    `SELECT senior_citizen_id as display_id FROM public.senior_citizen_beneficiaries WHERE senior_citizen_id LIKE $1
     UNION
     SELECT pwd_id as display_id FROM public.pwd_beneficiaries WHERE pwd_id LIKE $1
     UNION
     SELECT student_id as display_id FROM public.student_beneficiaries WHERE student_id LIKE $1
     UNION
     SELECT solo_parent_id as display_id FROM public.solo_parent_beneficiaries WHERE solo_parent_id LIKE $1
     ORDER BY display_id DESC LIMIT 1`,
    `${yearPrefix}%`
  );

  let nextNum = 1;
  if (lastRecord.length > 0) {
    const parts = lastRecord[0].display_id.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${yearPrefix}${String(nextNum).padStart(3, '0')}`;
};

// Create or reactivate a PENDING beneficiary record when a classification is added
export async function syncBeneficiaryOnInsert(
  residentId: string,
  classificationType: string,
  classificationDetails: Record<string, unknown> = {}
): Promise<void> {
  const mapping = BENEFICIARY_SYNC_MAP[classificationType];
  if (!mapping) return;

  const { table, prefix } = mapping;
  const details = normalizeDetails(classificationType, classificationDetails);

  // Fetch resident status to decide initial beneficiary status
  const resident = await prisma.resident.findUnique({
    where: { id: residentId },
    select: { status: true },
  });
  const initialStatus = resident?.status === 'active' ? 'ACTIVE' : 'PENDING';

  // Check if a record already exists for this resident
  // We can use the Prisma client here as well
  let existing: any = null;
  switch (table) {
    case 'senior_citizen_beneficiaries':
      existing = await prisma.seniorCitizenBeneficiary.findUnique({ where: { residentId } });
      break;
    case 'pwd_beneficiaries':
      existing = await prisma.pWDBeneficiary.findUnique({ where: { residentId } });
      break;
    case 'student_beneficiaries':
      existing = await prisma.studentBeneficiary.findUnique({ where: { residentId } });
      break;
    case 'solo_parent_beneficiaries':
      existing = await prisma.soloParentBeneficiary.findUnique({ where: { residentId } });
      break;
  }

  if (existing) {
    console.info(`[beneficiary-sync] Found existing record for resident ${residentId} in ${table} (status: ${existing.status})`);
    // If it was deactivated, reactivate to PENDING
    if (existing.status === 'INACTIVE') {
      const updateData = { status: initialStatus, updatedAt: new Date() };
      switch (table) {
        case 'senior_citizen_beneficiaries':
          await prisma.seniorCitizenBeneficiary.update({ where: { residentId }, data: updateData as any });
          break;
        case 'pwd_beneficiaries':
          await prisma.pWDBeneficiary.update({ where: { residentId }, data: updateData as any });
          break;
        case 'student_beneficiaries':
          await prisma.studentBeneficiary.update({ where: { residentId }, data: updateData as any });
          break;
        case 'solo_parent_beneficiaries':
          await prisma.soloParentBeneficiary.update({ where: { residentId }, data: updateData as any });
          break;
      }
      console.info(`[beneficiary-sync] Reactivated ${table} record for resident ${residentId}`);

      // Emit update
      await socketService.emitBeneficiaryUpdate(existing.id, tableToSocketType[table], {
        residentId,
        status: initialStatus,
        oldStatus: existing.status,
        updatedAt: new Date(),
      });
    }
    // Also update any type-specific detail fields from the new classification
    await syncBeneficiaryDetails(table, residentId, details);
    return;
  }

  console.info(`[beneficiary-sync] No existing record found for resident ${residentId} in ${table}. Creating new PENDING record.`);

  // Generate display ID: PREFIX-YEAR-### (e.g. SC-2026-003)
  const displayId = await generateBeneficiaryId(table, prefix);

  // Insert using Prisma client to ensure IDs (UUIDs) are generated correctly
  try {
    switch (table) {
      case 'pwd_beneficiaries':
        await prisma.pWDBeneficiary.create({
          data: {
            residentId,
            pwdId: displayId,
            disabilityTypeId: (details.disabilityTypeId as string) || null,
            disabilityLevel: (details.disabilityLevel as string) || null,
            status: initialStatus as any,
          },
        });
        break;
      case 'student_beneficiaries':
        await prisma.studentBeneficiary.create({
          data: {
            residentId,
            studentId: displayId,
            gradeLevelId: (details.gradeLevelId as string) || null,
            status: initialStatus as any,
          },
        });
        break;
      case 'solo_parent_beneficiaries':
        await prisma.soloParentBeneficiary.create({
          data: {
            residentId,
            soloParentId: displayId,
            categoryId: (details.categoryId as string) || null,
            status: initialStatus as any,
          },
        });
        break;
      case 'senior_citizen_beneficiaries':
        await prisma.seniorCitizenBeneficiary.create({
          data: {
            residentId,
            seniorCitizenId: displayId,
            status: initialStatus as any,
            pensionTypes: details.pensionTypeIds && Array.isArray(details.pensionTypeIds)
              ? {
                  create: (details.pensionTypeIds as string[]).map((settingId) => ({ settingId })),
                }
              : undefined,
          },
        });
        break;
    }

    const createdRecord = await (prisma as any)[table.replace(/_([a-z])/g, (g) => g[1].toUpperCase()).replace(/s$/, '')].findUnique({
      where: { residentId },
    });

    if (createdRecord) {
      await socketService.emitBeneficiaryNew({
        beneficiaryId: createdRecord.id,
        type: tableToSocketType[table],
        residentId,
        status: initialStatus,
        createdAt: new Date(),
      });
    }

    console.info(`[beneficiary-sync] Created PENDING ${table} for resident ${residentId} (${displayId})`);
  } catch (err: any) {
    console.error(`[beneficiary-sync] Failed to create ${table} for ${residentId}: ${err.message}`);
    throw err;
  }
}
