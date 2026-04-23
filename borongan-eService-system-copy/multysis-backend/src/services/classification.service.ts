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

// =============================================================================
// TYPES
// =============================================================================

export interface ResidentClassification {
  id: number;
  resident_id: string;
  classification_type: string;
  classification_details: unknown;
  created_at: Date;
  updated_at: Date;
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
}: InsertClassificationInput): Promise<ResidentClassification> => {
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
    RETURNING *
  `;

  // Invalidate cache for this resident
  await cacheService.del(`resident:${residentId}:classifications`);

  return result[0];
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
