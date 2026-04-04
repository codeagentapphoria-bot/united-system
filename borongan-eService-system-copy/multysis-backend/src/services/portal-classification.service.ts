/**
 * portal-classification.service.ts
 *
 * Read-only access to the BIMS resident_classifications table for the
 * resident portal. Uses raw SQL against the shared PostgreSQL database
 * (same pattern as portal-household.service.ts).
 *
 * Mounted at: GET /api/portal/classifications/my
 */

import prisma from '../config/database';
import cacheService from './cache.service';

export interface ResidentClassification {
  id: number;
  classification_type: string;
  classification_details: any[];
  type_name: string | null;
  type_color: string | null;
  type_description: string | null;
}

/**
 * Fetch all BIMS classifications assigned to a resident.
 * Joins resident_classifications → classification_types for display metadata.
 * Returns an empty array (not an error) if the resident has no classifications.
 * Results are cached for 30 minutes.
 */
export const getMyClassifications = async (
  residentId: string
): Promise<ResidentClassification[]> => {
  const cacheKey = `resident:${residentId}:classifications`;
  
  const cached = await cacheService.get<ResidentClassification[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = await prisma.$queryRaw<ResidentClassification[]>`
    SELECT
      rc.id,
      rc.classification_type,
      COALESCE(rc.classification_details, '[]'::jsonb) AS classification_details,
      ct.name        AS type_name,
      ct.color       AS type_color,
      ct.description AS type_description
    FROM resident_classifications rc
    LEFT JOIN classification_types ct
      ON ct.name = rc.classification_type
      AND ct.is_active = true
    WHERE rc.resident_id = ${residentId}
    ORDER BY rc.classification_type ASC
  `;

  await cacheService.set(cacheKey, rows, 1800); // 30 min TTL
  return rows;
};

/**
 * Invalidate classification cache for a resident.
 * Call this when classifications are added/removed.
 */
export const invalidateClassificationCache = async (residentId: string): Promise<void> => {
  await cacheService.del(`resident:${residentId}:classifications`);
};
