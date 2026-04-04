/**
 * portal-household.service.ts
 *
 * Household self-registration service for the resident portal.
 * All SQL runs through Prisma's raw query interface against the shared
 * PostgreSQL database (same DB as the BIMS backend).
 *
 * Design notes:
 * - Members are looked up by their human-readable resident_id (e.g. BIMS-2025-0000001).
 * - The UUID `id` is stored in family_members.family_member for FK integrity.
 * - The GET query returns both the UUID (for DELETE) and the resident_id (for display).
 */

import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import cacheService from './cache.service';
import { CustomError } from '../middleware/error';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface FamilyMemberInput {
  residentId: string;          // human-readable resident_id, e.g. "BIMS-2025-0000002"
  relationshipToHead?: string;
}

export interface FamilyInput {
  groupName?: string;
  members?: FamilyMemberInput[];
}

export interface RegisterHouseholdInput {
  houseNumber?: string;
  street?: string;
  barangayId?: number | null;
  housingType?: string;
  structureType?: string;
  electricity?: boolean;
  waterSource?: string;
  toiletFacility?: string;
  geom?: { lat: number; lng: number } | null;
  area?: number | null;
  householdImagePath?: string | null;
  families?: FamilyInput[];
}

// ---------------------------------------------------------------------------
// GET /my — fetch the resident's household with nested families + members
// Cached for 10 minutes
// ---------------------------------------------------------------------------
export async function getMyHousehold(residentId: string) {
  const cacheKey = `resident:${residentId}:household`;
  
  const cached = await cacheService.get<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      h.id,
      h.house_number,
      h.street,
      h.barangay_id,
      h.house_head,
      h.housing_type,
      h.structure_type,
      h.electricity,
      h.water_source,
      h.toilet_facility,
      h.area,
      h.household_image_path,
      ST_Y(h.geom) AS geom_lat,
      ST_X(h.geom) AS geom_lng,
      b.barangay_name,
      m.municipality_name,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'family_id',    f.id,
            'family_group', f.family_group,
            'family_head',  f.family_head,
            'members',      fm_agg.members
          )
        ) FILTER (WHERE f.id IS NOT NULL),
        '[]'::jsonb
      ) AS families
    FROM households h
    LEFT JOIN barangays b ON h.barangay_id = b.id
    LEFT JOIN municipalities m ON b.municipality_id = m.id
    LEFT JOIN families f ON f.household_id = h.id
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'member_id',         fm.family_member,
            'member_resident_id', r2.resident_id,
            'relationship',      fm.relationship_to_head,
            'resident_name',     CONCAT(r2.first_name, ' ', r2.last_name)
          )
        ),
        '[]'::jsonb
      ) AS members
      FROM family_members fm
      JOIN residents r2 ON r2.id = fm.family_member
      WHERE fm.family_id = f.id
    ) fm_agg ON true
    WHERE h.house_head = ${residentId}
       OR ${residentId} IN (
         SELECT fm2.family_member
         FROM family_members fm2
         JOIN families f2 ON f2.id = fm2.family_id
         WHERE f2.household_id = h.id
       )
    GROUP BY h.id, b.barangay_name, m.municipality_name
  `;

  if (rows.length === 0) return null;

  const row = rows[0];

  // Prisma may return JSONB columns as strings — normalise to objects
  if (typeof row.families === 'string') {
    row.families = JSON.parse(row.families);
  }

  await cacheService.set(cacheKey, row, 600); // 10 min TTL
  return row;
}

// ---------------------------------------------------------------------------
// POST / — register a new household (resident becomes house head)
// ---------------------------------------------------------------------------
export async function registerHousehold(
  residentId: string,
  input: RegisterHouseholdInput
) {
  const {
    houseNumber,
    street,
    barangayId,
    housingType,
    structureType,
    electricity = false,
    waterSource,
    toiletFacility,
    geom,
    area,
    householdImagePath,
    families = [],
  } = input;

  // 1. Resident must exist and be active
  const residentRows = await prisma.$queryRaw<{ id: string; barangay_id: number | null }[]>`
    SELECT id, barangay_id
    FROM residents
    WHERE id = ${residentId} AND status = 'active'
  `;
  if (residentRows.length === 0) {
    throw new CustomError('Active resident account required to register a household', 403);
  }
  const resident = residentRows[0];
  const effectiveBarangayId: number | null = barangayId ?? resident.barangay_id;

  // 2. Must not already be in any household
  const existingRows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM households WHERE house_head = ${residentId}
    UNION
    SELECT h.id
    FROM households h
    JOIN families f ON f.household_id = h.id
    JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.family_member = ${residentId}
    LIMIT 1
  `;
  if (existingRows.length > 0) {
    throw new CustomError('You are already registered in a household', 409);
  }

  // 3. Collect and validate all family member IDs (human-readable resident_id)
  const allMemberResidentIds = families
    .flatMap((f) => (f.members ?? []).map((m) => m.residentId))
    .filter(Boolean);
  const uniqueMemberResidentIds = [...new Set(allMemberResidentIds)];

  // Map: human-readable resident_id → UUID id (populated after DB lookup)
  const memberUuidMap = new Map<string, string>();

  if (uniqueMemberResidentIds.length > 0) {
    // Build an IN list with Prisma.join so parameters stay safe
    const idList = Prisma.join(
      uniqueMemberResidentIds.map((rid) => Prisma.sql`${rid}`)
    );

    const memberRows = await prisma.$queryRaw<{ id: string; resident_id: string }[]>`
      SELECT id, resident_id
      FROM residents
      WHERE resident_id IN (${idList}) AND status = 'active'
    `;

    if (memberRows.length !== uniqueMemberResidentIds.length) {
      const foundRids = new Set(memberRows.map((r) => r.resident_id));
      const notFound = uniqueMemberResidentIds.filter((rid) => !foundRids.has(rid));
      throw new CustomError(
        `Resident(s) not found or not active: ${notFound.join(', ')}`,
        400
      );
    }

    for (const row of memberRows) {
      memberUuidMap.set(row.resident_id, row.id);
    }

    // Check none are already in a household
    const uuids = memberRows.map((r) => r.id);
    const uuidList = Prisma.join(uuids.map((id) => Prisma.sql`${id}`));

    const alreadyRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT fm.family_member AS id
      FROM family_members fm
      JOIN families f ON f.id = fm.family_id
      WHERE fm.family_member IN (${uuidList})
      UNION
      SELECT house_head AS id
      FROM households
      WHERE house_head IN (${uuidList})
    `;

    if (alreadyRows.length > 0) {
      const takenUuids = new Set(alreadyRows.map((r) => r.id));
      const takenRids = memberRows
        .filter((r) => takenUuids.has(r.id))
        .map((r) => r.resident_id);
      throw new CustomError(
        `Some residents are already registered in a household: ${takenRids.join(', ')}`,
        409
      );
    }
  }

  // 4. Create household + families + members in a single transaction
  return prisma.$transaction(async (tx) => {
    // Build geom SQL fragment — ST_MakePoint(lng, lat) per PostGIS convention
    const geomSql = geom
      ? Prisma.sql`ST_SetSRID(ST_MakePoint(${geom.lng}, ${geom.lat}), 4326)`
      : Prisma.sql`NULL::geometry`;

    // Create household
    const householdRows = await tx.$queryRaw<any[]>`
      INSERT INTO households (
        house_number, street, barangay_id, house_head,
        housing_type, structure_type, electricity,
        water_source, toilet_facility, geom, area,
        household_image_path
      )
      VALUES (
        ${houseNumber ?? null},
        ${street ?? null},
        ${effectiveBarangayId},
        ${residentId},
        ${housingType ?? null},
        ${structureType ?? null},
        ${electricity},
        ${waterSource ?? null},
        ${toiletFacility ?? null},
        ${geomSql},
        ${area ?? null},
        ${householdImagePath ? JSON.stringify([householdImagePath]) : '[]'}
      )
      RETURNING
        id, house_number, street, barangay_id, house_head,
        housing_type, structure_type, electricity,
        water_source, toilet_facility, area, household_image_path, created_at,
        ST_Y(geom) AS geom_lat, ST_X(geom) AS geom_lng
    `;
    const household = householdRows[0];

    // Create family groups and members
    for (const family of families) {
      const members = (family.members ?? []).filter((m) => m.residentId);
      if (members.length === 0) continue;

      const groupName = (family.groupName || 'Main Family').trim();

      const familyRows = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO families (household_id, family_group, family_head)
        VALUES (${household.id}, ${groupName}, ${residentId})
        RETURNING id
      `;
      const familyId = familyRows[0].id;

      for (const member of members) {
        const memberUuid = memberUuidMap.get(member.residentId);
        if (!memberUuid) continue;

        await tx.$executeRaw`
          INSERT INTO family_members (family_id, family_member, relationship_to_head)
          VALUES (${familyId}, ${memberUuid}, ${member.relationshipToHead ?? null})
        `;
      }
    }

    // Invalidate cache for all affected residents (house head and family members)
    await invalidateHouseholdCache(residentId);
    for (const member of families.flatMap(f => f.members ?? [])) {
      const uuid = memberUuidMap.get(member.residentId);
      if (uuid && uuid !== residentId) {
        await invalidateHouseholdCache(uuid);
      }
    }

    return household;
  });
}

/**
 * Invalidate household cache for a resident.
 * Call this when household data is modified.
 */
export const invalidateHouseholdCache = async (residentId: string): Promise<void> => {
  await cacheService.del(`resident:${residentId}:household`);
};

// ---------------------------------------------------------------------------
// POST /:householdId/members — add a member to an existing household
// ---------------------------------------------------------------------------
export async function addMember(
  residentId: string,
  householdId: number,
  memberResidentId: string,     // human-readable resident_id
  relationshipToHead: string | null,
  familyGroup: string
) {
  // Requester must be the house head
  const householdRows = await prisma.$queryRaw<{ id: number; house_head: string }[]>`
    SELECT id, house_head FROM households WHERE id = ${householdId}
  `;
  if (householdRows.length === 0) {
    throw new CustomError('Household not found', 404);
  }
  if (householdRows[0].house_head !== residentId) {
    throw new CustomError('Only the house head can add members', 403);
  }

  // Member must exist and be active (looked up by human-readable resident_id)
  const memberRows = await prisma.$queryRaw<{
    id: string;
    first_name: string;
    last_name: string;
    resident_id: string;
  }[]>`
    SELECT id, first_name, last_name, resident_id
    FROM residents
    WHERE resident_id = ${memberResidentId} AND status = 'active'
  `;
  if (memberRows.length === 0) {
    throw new CustomError('Resident not found or not active', 404);
  }
  const member = memberRows[0];

  // Member must not already be in a household
  const memberHouseholdRows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT h.id FROM households h WHERE h.house_head = ${member.id}
    UNION
    SELECT h.id FROM households h
    JOIN families f ON f.household_id = h.id
    JOIN family_members fm ON fm.family_id = f.id
    WHERE fm.family_member = ${member.id}
    LIMIT 1
  `;
  if (memberHouseholdRows.length > 0) {
    throw new CustomError('This resident is already registered in a household', 409);
  }

  const group = (familyGroup || 'Main Family').trim();

  return prisma.$transaction(async (tx) => {
    // Get or create the family group
    let familyRows = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM families
      WHERE household_id = ${householdId} AND family_group = ${group}
      LIMIT 1
    `;

    if (familyRows.length === 0) {
      familyRows = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO families (household_id, family_group, family_head)
        VALUES (${householdId}, ${group}, ${residentId})
        RETURNING id
      `;
    }

    const familyId = familyRows[0].id;

    await tx.$executeRaw`
      INSERT INTO family_members (family_id, family_member, relationship_to_head)
      VALUES (${familyId}, ${member.id}, ${relationshipToHead ?? null})
    `;

    // Invalidate cache for both the member being added and the house head
    await invalidateHouseholdCache(member.id);
    await invalidateHouseholdCache(residentId);

    return {
      name: `${member.first_name} ${member.last_name}`,
      residentId: member.resident_id,
      relationship: relationshipToHead,
    };
  });
}

// ---------------------------------------------------------------------------
// DELETE /:householdId/members/:memberId — remove a member
// memberId is the resident's UUID (used for FK in family_members)
// ---------------------------------------------------------------------------
export async function removeMember(
  residentId: string,
  householdId: number,
  memberId: string   // UUID of the member being removed
) {
  const householdRows = await prisma.$queryRaw<{ house_head: string }[]>`
    SELECT house_head FROM households WHERE id = ${householdId}
  `;
  if (householdRows.length === 0) {
    throw new CustomError('Household not found', 404);
  }

  const isHead       = householdRows[0].house_head === residentId;
  const isRemovingSelf = memberId === residentId;

  if (!isHead && !isRemovingSelf) {
    throw new CustomError(
      'Only the house head can remove members, or you can remove yourself',
      403
    );
  }

  await prisma.$executeRaw`
    DELETE FROM family_members
    WHERE family_member = ${memberId}
      AND family_id IN (
        SELECT id FROM families WHERE household_id = ${householdId}
      )
  `;

  // Invalidate cache for the member being removed and the house head
  await invalidateHouseholdCache(memberId);
  await invalidateHouseholdCache(residentId);
}
