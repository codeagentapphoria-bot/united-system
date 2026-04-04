/**
 * portalHouseholdRoutes.js
 *
 * Household self-registration endpoints for the resident portal.
 *
 * Residents log in to the portal, register their household details,
 * and add family members by entering their resident IDs.
 * No free-text names — member lookup is by resident ID only.
 *
 * Auth: uses the JWT from the E-Services portal (resident token)
 *       validated via the same JWT_SECRET.
 */

import express from "express";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware: verify resident portal JWT
const verifyPortalResident = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = req.cookies?.["portal_access_token"] || req.cookies?.["access_token"];

  if (!token && authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "resident") {
      return res.status(403).json({ message: "Resident access required" });
    }
    req.resident = decoded; // { id, username, role, type }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// =============================================================================
// GET /api/portal/household/my
// Returns the authenticated resident's household (as head or member)
// =============================================================================
router.get("/my", verifyPortalResident, async (req, res) => {
  try {
    const residentId = req.resident.id;

    const result = await pool.query(
      `SELECT
        h.id, h.house_number, h.street, h.barangay_id,
        h.house_head, h.housing_type, h.structure_type,
        h.electricity, h.water_source, h.toilet_facility,
        h.household_image_path,
        b.barangay_name,
        m.municipality_name,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'family_id', f.id,
              'family_group', f.family_group,
              'family_head', f.family_head,
              'members', fm_agg.members
            )
          ) FILTER (WHERE f.id IS NOT NULL),
          '[]'::jsonb
        ) AS families
      FROM households h
      LEFT JOIN barangays b ON h.barangay_id = b.id
      LEFT JOIN municipalities m ON b.municipality_id = m.id
      LEFT JOIN families f ON f.household_id = h.id
      LEFT JOIN LATERAL (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'member_id', fm.family_member,
            'relationship', fm.relationship_to_head,
            'resident_name', CONCAT(r2.first_name, ' ', r2.last_name)
          )
        ), '[]'::jsonb) AS members
        FROM family_members fm
        JOIN residents r2 ON r2.id = fm.family_member
        WHERE fm.family_id = f.id
      ) fm_agg ON true
      WHERE h.house_head = $1
         OR $1 IN (
           SELECT fm2.family_member FROM family_members fm2
           JOIN families f2 ON f2.id = fm2.family_id
           WHERE f2.household_id = h.id
         )
      GROUP BY h.id, b.barangay_name, m.municipality_name`,
      [residentId]
    );

    res.json({ data: result.rows[0] || null });
  } catch (error) {
    logger.error("Get household error:", error);
    res.status(500).json({ message: "Error fetching household" });
  }
});

// =============================================================================
// POST /api/portal/household
// Register a new household (resident becomes house head).
// Optionally accepts families[] with members[] to create in the same transaction.
//
// Body:
//   houseNumber, street, barangayId, housingType, structureType,
//   electricity, waterSource, toiletFacility,
//   families: [{ groupName: string, members: [{ residentId: string, relationshipToHead?: string }] }]
// =============================================================================
router.post("/", verifyPortalResident, async (req, res) => {
  const residentId = req.resident.id;

  const {
    houseNumber, street, barangayId,
    housingType, structureType,
    electricity, waterSource, toiletFacility,
    families = [],
  } = req.body;

  // Validate resident exists and is active
  const residentCheck = await pool.query(
    "SELECT id, barangay_id FROM residents WHERE id = $1 AND status = 'active'",
    [residentId]
  );
  if (residentCheck.rows.length === 0) {
    return res.status(403).json({ message: "Active resident account required to register a household" });
  }

  // Check if resident already has a household
  const existing = await pool.query(
    `SELECT id FROM households WHERE house_head = $1
     UNION
     SELECT h.id FROM households h
     JOIN families f ON f.household_id = h.id
     JOIN family_members fm ON fm.family_id = f.id
     WHERE fm.family_member = $1
     LIMIT 1`,
    [residentId]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: "You are already registered in a household" });
  }

  // Collect and validate all member IDs from the families payload
  const allMemberIds = families
    .flatMap((f) => (f.members || []).map((m) => m.residentId))
    .filter(Boolean);
  const uniqueMemberIds = [...new Set(allMemberIds)];

  // Member IDs must not include the house head themselves
  if (uniqueMemberIds.includes(residentId)) {
    return res.status(400).json({ message: "You cannot add yourself as a family member — you are the house head." });
  }

  if (uniqueMemberIds.length > 0) {
    // All member resident IDs must exist and be active
    const memberRows = await pool.query(
      `SELECT id FROM residents WHERE id = ANY($1::text[]) AND status = 'active'`,
      [uniqueMemberIds]
    );
    if (memberRows.rows.length !== uniqueMemberIds.length) {
      const foundIds = new Set(memberRows.rows.map((r) => r.id));
      const notFound = uniqueMemberIds.filter((id) => !foundIds.has(id));
      return res.status(400).json({
        message: `Resident(s) not found or not active: ${notFound.join(", ")}`,
      });
    }

    // No member may already belong to another household
    const alreadyAssigned = await pool.query(
      `SELECT fm.family_member AS id FROM family_members fm
         JOIN families f ON f.id = fm.family_id
        WHERE fm.family_member = ANY($1::text[])
       UNION
       SELECT house_head AS id FROM households
        WHERE house_head = ANY($1::text[])`,
      [uniqueMemberIds]
    );
    if (alreadyAssigned.rows.length > 0) {
      const taken = alreadyAssigned.rows.map((r) => r.id);
      return res.status(409).json({
        message: `Some residents are already registered in a household: ${taken.join(", ")}`,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create the household record
    const household = await client.query(
      `INSERT INTO households (
        house_number, street, barangay_id, house_head,
        housing_type, structure_type, electricity, water_source, toilet_facility
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        houseNumber || null,
        street || null,
        barangayId || residentCheck.rows[0].barangay_id,
        residentId,
        housingType || null,
        structureType || null,
        electricity === true || electricity === "true" || electricity === "Yes",
        waterSource || null,
        toiletFacility || null,
      ]
    );
    const householdId = household.rows[0].id;

    // 2. Create family groups and their members
    for (const family of families) {
      const members = (family.members || []).filter((m) => m.residentId);
      if (members.length === 0) continue;

      const groupName = (family.groupName || "Main Family").trim();

      const familyResult = await client.query(
        `INSERT INTO families (household_id, family_group, family_head)
         VALUES ($1, $2, $3) RETURNING id`,
        [householdId, groupName, residentId]
      );
      const familyId = familyResult.rows[0].id;

      for (const member of members) {
        await client.query(
          `INSERT INTO family_members (family_id, family_member, relationship_to_head)
           VALUES ($1, $2, $3)`,
          [familyId, member.residentId, member.relationshipToHead || null]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ data: household.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Create household error:", error);
    res.status(500).json({ message: "Error creating household" });
  } finally {
    client.release();
  }
});

// =============================================================================
// POST /api/portal/household/:householdId/members
// Add a family member by resident ID
// =============================================================================
router.post("/:householdId/members", verifyPortalResident, async (req, res) => {
  const residentId = req.resident.id;
  const { householdId } = req.params;
  const { memberResidentId, relationshipToHead, familyGroup = "Main Family" } = req.body;

  // Verify requester is the house head
  const householdCheck = await pool.query(
    "SELECT id, house_head FROM households WHERE id = $1",
    [householdId]
  );
  if (householdCheck.rows.length === 0) {
    return res.status(404).json({ message: "Household not found" });
  }
  if (householdCheck.rows[0].house_head !== residentId) {
    return res.status(403).json({ message: "Only the house head can add members" });
  }

  // Verify the member exists and is active
  const memberCheck = await pool.query(
    "SELECT id, first_name, last_name FROM residents WHERE id = $1 AND status = 'active'",
    [memberResidentId]
  );
  if (memberCheck.rows.length === 0) {
    return res.status(404).json({ message: "Resident not found or not active" });
  }

  // Check member is not already in another household
  const memberHousehold = await pool.query(
    `SELECT h.id FROM households h WHERE h.house_head = $1
     UNION
     SELECT h.id FROM households h
     JOIN families f ON f.household_id = h.id
     JOIN family_members fm ON fm.family_id = f.id
     WHERE fm.family_member = $1
     LIMIT 1`,
    [memberResidentId]
  );
  if (memberHousehold.rows.length > 0) {
    return res.status(409).json({ message: "This resident is already registered in a household" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Get or create family group
    let familyResult = await client.query(
      "SELECT id FROM families WHERE household_id = $1 AND family_group = $2 LIMIT 1",
      [householdId, familyGroup]
    );

    if (familyResult.rows.length === 0) {
      familyResult = await client.query(
        "INSERT INTO families (household_id, family_group, family_head) VALUES ($1, $2, $3) RETURNING id",
        [householdId, familyGroup, residentId]
      );
    }

    const familyId = familyResult.rows[0].id;

    await client.query(
      "INSERT INTO family_members (family_id, family_member, relationship_to_head) VALUES ($1, $2, $3)",
      [familyId, memberResidentId, relationshipToHead || null]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Member added successfully",
      member: {
        residentId: memberResidentId,
        name: `${memberCheck.rows[0].first_name} ${memberCheck.rows[0].last_name}`,
        relationship: relationshipToHead || null,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Add member error:", error);
    res.status(500).json({ message: "Error adding member" });
  } finally {
    client.release();
  }
});

// =============================================================================
// DELETE /api/portal/household/:householdId/members/:memberId
// Remove a family member
// =============================================================================
router.delete("/:householdId/members/:memberId", verifyPortalResident, async (req, res) => {
  const residentId = req.resident.id;
  const { householdId, memberId } = req.params;

  // Verify requester is the house head or is removing themselves
  const householdCheck = await pool.query(
    "SELECT house_head FROM households WHERE id = $1",
    [householdId]
  );
  if (householdCheck.rows.length === 0) {
    return res.status(404).json({ message: "Household not found" });
  }

  if (householdCheck.rows[0].house_head !== residentId && memberId !== residentId) {
    return res.status(403).json({ message: "Only the house head can remove members, or you can remove yourself" });
  }

  await pool.query(
    `DELETE FROM family_members
     WHERE family_member = $1
     AND family_id IN (SELECT id FROM families WHERE household_id = $2)`,
    [memberId, householdId]
  );

  res.json({ message: "Member removed successfully" });
});

export default router;
