/**
 * residentServices.js  — v2 (Unified Schema)
 *
 * BIMS resident service — READ ONLY + Classification management.
 *
 * Residents are created exclusively through the portal (E-Services).
 * BIMS can read resident data and manage classifications.
 *
 * REMOVED:
 *   - insertResident (portal handles registration)
 *   - updateResident (portal / E-Services admin)
 *   - deleteResident
 *   - generateResidentId (portal-registration.service.ts)
 *   - Mobile sync methods
 */

import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import {
  VIEW_RESIDENT_INFORMATION,
  VIEW_PUBLIC_RESIDENT_INFORMATION,
  INSERT_CLASSIFICATION,
  UPDATE_CLASSIFICATION,
  CLASSIFICATION_LIST,
  GET_CLASSIFICATION_TYPES,
  GET_CLASSIFICATION_TYPE_BY_ID,
  INSERT_CLASSIFICATION_TYPE,
  UPDATE_CLASSIFICATION_TYPE,
  DELETE_CLASSIFICATION_TYPE,
  CHECK_CLASSIFICATION_TYPE_EXISTS,
  DELETE_CLASSIFICATION,
} from "../queries/resident.queries.js";

/**
 * Normalize classification detail keys coming from the BIMS form
 * (which uses the field descriptor key names) to the DB column key names
 * expected by _syncBeneficiaryOnInsert and _syncBeneficiaryDetails.
 *
 * The BIMS classification form stores values under the "key" from the
 * classification_types.details descriptor, e.g. "disabilityType", "gradeLevel".
 * The beneficiary sync functions expect "disabilityTypeId", "gradeLevelId", etc.
 */
function normalizeDetails(classificationType, raw = {}) {
  switch (classificationType) {
    case 'Person with Disability':
      return {
        disabilityTypeId: raw.disabilityType || raw.disabilityTypeId || null,
        disabilityLevel:  raw.disabilityLevel || null,
      };
    case 'Student':
    case 'College Student':
      return {
        gradeLevelId: raw.gradeLevel || raw.gradeLevelId || null,
      };
    case 'Solo Parent':
      return {
        categoryId: raw.category || raw.categoryId || null,
      };
    case 'Senior Citizen':
      return {
        pensionTypeIds: Array.isArray(raw.pensionTypes)
          ? raw.pensionTypes
          : Array.isArray(raw.pensionTypeIds)
          ? raw.pensionTypeIds
          : [],
      };
    default:
      return raw;
  }
}

class Resident {
  // ==========================================================================
  // LIST RESIDENTS
  //
  // Accepts: { barangayId, classificationType, search, page, perPage,
  //             userTargetType, userTargetId, statusFilter }
  //
  // NOTE: purokId parameter removed (puroks no longer exist)
  // Field renames: resident_status → status, extension_name → extension_name
  // ==========================================================================
  static async residentList({
    barangayId,
    classificationType,
    search = "",
    statusFilter,
    page = 1,
    perPage = 10,
    userTargetType,
    userTargetId,
  }) {
    if (page < 1 || perPage < 1) {
      throw new Error("Page and perPage must be positive integers");
    }

    const joins = [];
    const whereClauses = [];
    const values = [];
    let paramIndex = 1;

    let query = `
      SELECT DISTINCT
        r.id,
        r.resident_id,
        r.last_name,
        r.first_name,
        r.middle_name,
        r.extension_name,
        r.birthdate,
        r.status,
        r.civil_status,
        r.sex,
        r.contact_number,
        r.email,
        r.occupation,
        r.street_address,
        b.barangay_name
      FROM residents r
    `;

    joins.push(`LEFT JOIN barangays b ON r.barangay_id = b.id`);

    if (classificationType) {
      joins.push(`LEFT JOIN resident_classifications rc ON rc.resident_id = r.id`);
      whereClauses.push(`rc.classification_type = $${paramIndex++}`);
      values.push(classificationType);
    }

    if (userTargetType === "municipality") {
      whereClauses.push(`b.municipality_id = $${paramIndex++}`);
      values.push(userTargetId);
    } else if (barangayId) {
      // Explicit barangay filter
      whereClauses.push(`r.barangay_id = $${paramIndex++}`);
      values.push(barangayId);
    } else if (userTargetType === "barangay") {
      // Scoped to the logged-in user's barangay
      whereClauses.push(`r.barangay_id = $${paramIndex++}`);
      values.push(userTargetId);
    }

    if (barangayId && userTargetType !== "barangay") {
      // Additional barangay filter for municipality users
      whereClauses.push(`r.barangay_id = $${paramIndex++}`);
      values.push(barangayId);
    }

    const effectiveStatus = statusFilter || 'active';
    whereClauses.push(`r.status = $${paramIndex++}`);
    values.push(effectiveStatus);

    if (search) {
      // Use full-text search index instead of ILIKE CONCAT_WS
      // The idx_residents_full_text GIN index is on (last_name || ' ' || first_name || ' ' || COALESCE(middle_name, ''))
      // For proper index usage, we use plainto_tsquery for prefix matching
      whereClauses.push(
        `(to_tsvector('english', COALESCE(r.last_name, '') || ' ' || COALESCE(r.middle_name, '') || ' ' || COALESCE(r.first_name, '')) @@ plainto_tsquery('english', $${paramIndex})
         OR r.resident_id ILIKE $${paramIndex}
         OR r.username ILIKE $${paramIndex})`
      );
      values.push(`%${search}%`);
      paramIndex++;
    }

    query += joins.join(" ");
    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    // Count query (same filters without pagination)
    const countQuery = `SELECT COUNT(DISTINCT r.id) AS total FROM residents r ${joins.join(" ")}${whereClauses.length > 0 ? " WHERE " + whereClauses.join(" AND ") : ""}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total || 0);

    const offset = (page - 1) * perPage;
    query += ` ORDER BY r.last_name ASC, r.first_name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(perPage, offset);

    const result = await pool.query(query, values);

    return {
      residents: result.rows,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  // ==========================================================================
  // GET SINGLE RESIDENT (full profile)
  // ==========================================================================
  static async residentInfo({ residentId }) {
    const result = await pool.query(VIEW_RESIDENT_INFORMATION, [residentId]);
    return result.rows[0] || null;
  }

  // ==========================================================================
  // PUBLIC QR SCAN (masked name, no sensitive data)
  // ==========================================================================
  static async publicResidentInfo({ residentId }) {
    const result = await pool.query(VIEW_PUBLIC_RESIDENT_INFORMATION, [residentId]);
    return result.rows[0] || null;
  }

  // ==========================================================================
  // CLASSIFICATIONS
  // ==========================================================================

  static async insertClassification({ residentId, classificationType, classificationDetails }) {
    const result = await pool.query(INSERT_CLASSIFICATION, [
      residentId,
      classificationType,
      JSON.stringify(classificationDetails || []),
    ]);

    // Normalize keys before syncing so BIMS form output keys (e.g. "disabilityType")
    // map correctly to beneficiary table columns (e.g. "disabilityTypeId")
    const normalized = normalizeDetails(classificationType, classificationDetails || {});
    await Resident._syncBeneficiaryOnInsert(residentId, classificationType, normalized);

    return result.rows[0];
  }

  // Mapping from BIMS classification names → beneficiary table info
  static BENEFICIARY_SYNC_MAP = {
    'Senior Citizen':         { table: 'senior_citizen_beneficiaries', idCol: 'senior_citizen_id', prefix: 'SC'  },
    'Person with Disability': { table: 'pwd_beneficiaries',            idCol: 'pwd_id',            prefix: 'PWD' },
    'Student':                { table: 'student_beneficiaries',        idCol: 'student_id',        prefix: 'ST'  },
    'College Student':        { table: 'student_beneficiaries',        idCol: 'student_id',        prefix: 'ST'  },
    'Solo Parent':            { table: 'solo_parent_beneficiaries',    idCol: 'solo_parent_id',    prefix: 'SP'  },
  };

  static async _syncBeneficiaryOnInsert(residentId, classificationType, classificationDetails = {}) {
    const mapping = Resident.BENEFICIARY_SYNC_MAP[classificationType];
    if (!mapping) return;

    const { table, idCol, prefix } = mapping;

    // Check if a record already exists for this resident
    const existing = await pool.query(
      `SELECT id, status FROM ${table} WHERE resident_id = $1`,
      [residentId]
    );
    if (existing.rows.length > 0) {
      // If it was deactivated (BIMS removed then re-added), reactivate to PENDING
      if (existing.rows[0].status === 'INACTIVE') {
        await pool.query(
          `UPDATE ${table} SET status = 'PENDING', updated_at = now() WHERE resident_id = $1`,
          [residentId]
        );
        logger.info(`[beneficiary-sync] Reactivated INACTIVE ${table} to PENDING for resident ${residentId}`);
      }
      // Also update any type-specific detail fields from the new classification
      await Resident._syncBeneficiaryDetails(table, residentId, classificationDetails);
      return;
    }

    // Generate display ID: PREFIX-YEAR-### (e.g. SC-2025-003)
    const year = new Date().getFullYear();
    const countResult = await pool.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
    const seq = parseInt(countResult.rows[0].cnt, 10) + 1;
    const displayId = `${prefix}-${year}-${String(seq).padStart(3, '0')}`;

    // Insert with type-specific fields from classificationDetails
    if (table === 'pwd_beneficiaries') {
      const disabilityTypeId = classificationDetails?.disabilityTypeId || null;
      const disabilityLevel  = classificationDetails?.disabilityLevel  || null;
      await pool.query(
        `INSERT INTO pwd_beneficiaries (resident_id, pwd_id, disability_type_id, disability_level, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [residentId, displayId, disabilityTypeId, disabilityLevel]
      );
    } else if (table === 'student_beneficiaries') {
      const gradeLevelId = classificationDetails?.gradeLevelId || null;
      await pool.query(
        `INSERT INTO student_beneficiaries (resident_id, student_id, grade_level_id, status)
         VALUES ($1, $2, $3, 'PENDING')`,
        [residentId, displayId, gradeLevelId]
      );
    } else if (table === 'solo_parent_beneficiaries') {
      const categoryId = classificationDetails?.categoryId || null;
      await pool.query(
        `INSERT INTO solo_parent_beneficiaries (resident_id, solo_parent_id, category_id, status)
         VALUES ($1, $2, $3, 'PENDING')`,
        [residentId, displayId, categoryId]
      );
    } else {
      // senior_citizen_beneficiaries (no nullable FK columns)
      await pool.query(
        `INSERT INTO senior_citizen_beneficiaries (resident_id, senior_citizen_id, status)
         VALUES ($1, $2, 'PENDING')`,
        [residentId, displayId]
      );
    }

    // Pension type pivots for senior citizens (multi-select)
    if (table === 'senior_citizen_beneficiaries') {
      const pensionTypeIds = Array.isArray(classificationDetails?.pensionTypeIds)
        ? classificationDetails.pensionTypeIds : [];
      if (pensionTypeIds.length > 0) {
        const ben = await pool.query(
          `SELECT id FROM senior_citizen_beneficiaries WHERE resident_id = $1`, [residentId]
        );
        if (ben.rows.length > 0) {
          const benId = ben.rows[0].id;
          for (const settingId of pensionTypeIds) {
            await pool.query(
              `INSERT INTO senior_citizen_pension_type_pivots (beneficiary_id, setting_id)
               VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [benId, settingId]
            );
          }
        }
      }
    }

    logger.info(`[beneficiary-sync] Created PENDING ${table} for resident ${residentId} (${displayId})`);
  }

  // Update type-specific detail columns on an already-existing PENDING record
  static async _syncBeneficiaryDetails(table, residentId, classificationDetails = {}) {
    if (table === 'pwd_beneficiaries') {
      const disabilityTypeId = classificationDetails?.disabilityTypeId || null;
      const disabilityLevel  = classificationDetails?.disabilityLevel  || null;
      if (disabilityTypeId || disabilityLevel) {
        await pool.query(
          `UPDATE pwd_beneficiaries
           SET disability_type_id = COALESCE($2, disability_type_id),
               disability_level   = COALESCE($3, disability_level),
               updated_at = now()
           WHERE resident_id = $1 AND status = 'PENDING'`,
          [residentId, disabilityTypeId, disabilityLevel]
        );
      }
    } else if (table === 'student_beneficiaries') {
      const gradeLevelId = classificationDetails?.gradeLevelId || null;
      if (gradeLevelId) {
        await pool.query(
          `UPDATE student_beneficiaries
           SET grade_level_id = $2, updated_at = now()
           WHERE resident_id = $1 AND status = 'PENDING'`,
          [residentId, gradeLevelId]
        );
      }
    } else if (table === 'solo_parent_beneficiaries') {
      const categoryId = classificationDetails?.categoryId || null;
      if (categoryId) {
        await pool.query(
          `UPDATE solo_parent_beneficiaries
           SET category_id = $2, updated_at = now()
           WHERE resident_id = $1 AND status = 'PENDING'`,
          [residentId, categoryId]
        );
      }
    }
  }

  static async classificationList({ barangayId, userTargetType, userTargetId }) {
    let query = CLASSIFICATION_LIST;
    if (barangayId || userTargetType === "barangay") {
      query = `
        SELECT rc.* FROM resident_classifications rc
        JOIN residents r ON r.id = rc.resident_id
        ${userTargetType === "municipality"
          ? "JOIN barangays b ON r.barangay_id = b.id WHERE b.municipality_id = $1"
          : `WHERE r.barangay_id = $1`}
        ORDER BY rc.id DESC
      `;
      return (await pool.query(query, [barangayId || userTargetId])).rows;
    }
    return (await pool.query(query)).rows;
  }

  static async updateClassification({
    classificationId,
    classificationType,
    classificationDetails,
  }) {
    const result = await pool.query(UPDATE_CLASSIFICATION, [
      classificationId,
      classificationType,
      JSON.stringify(classificationDetails || []),
    ]);
    const updated = result.rows[0];

    // Sync updated detail values to the beneficiary table for the 4 special types
    if (updated) {
      const mapping = Resident.BENEFICIARY_SYNC_MAP[classificationType];
      if (mapping) {
        const normalized = normalizeDetails(classificationType, classificationDetails || {});
        await Resident._syncBeneficiaryDetails(mapping.table, updated.resident_id, normalized);
      }
    }

    return updated;
  }

  static async deleteClassification({ classificationId }) {
    const result = await pool.query(DELETE_CLASSIFICATION, [classificationId]);
    const deleted = result.rows[0];

    // Soft-deactivate the corresponding beneficiary record (preserves program history)
    if (deleted) {
      await Resident._syncBeneficiaryOnDelete(deleted.resident_id, deleted.classification_type);
    }

    return deleted;
  }

  static async _syncBeneficiaryOnDelete(residentId, classificationType) {
    const mapping = Resident.BENEFICIARY_SYNC_MAP[classificationType];
    if (!mapping) return;

    const { table } = mapping;

    await pool.query(
      `UPDATE ${table} SET status = 'INACTIVE', updated_at = now() WHERE resident_id = $1`,
      [residentId]
    );

    logger.info(`[beneficiary-sync] Set ${table} INACTIVE for resident ${residentId}`);
  }

  // ==========================================================================
  // CLASSIFICATION TYPES
  // ==========================================================================

  static async getClassificationTypes({ municipalityId }) {
    const result = await pool.query(GET_CLASSIFICATION_TYPES, [municipalityId]);
    return result.rows;
  }

  static async getClassificationTypeById({ id, municipalityId }) {
    const result = await pool.query(GET_CLASSIFICATION_TYPE_BY_ID, [id, municipalityId]);
    return result.rows[0] || null;
  }

  static async createClassificationType({
    municipalityId,
    name,
    description,
    color,
    details,
  }) {
    const result = await pool.query(INSERT_CLASSIFICATION_TYPE, [
      municipalityId,
      name,
      description || null,
      color || "#4CAF50",
      JSON.stringify(details || []),
    ]);
    return result.rows[0];
  }

  static async updateClassificationType({
    id,
    municipalityId,
    name,
    description,
    color,
    details,
  }) {
    const result = await pool.query(UPDATE_CLASSIFICATION_TYPE, [
      id,
      municipalityId,
      name,
      description || null,
      color || "#4CAF50",
      JSON.stringify(details || []),
    ]);
    return result.rows[0];
  }

  // ==========================================================================
  // SOCIAL AMELIORATION SETTINGS (shared lookup for BIMS classification form)
  // ==========================================================================

  static async getSocialAmeliorationSettings({ type }) {
    const result = await pool.query(
      `SELECT id, name, description FROM social_amelioration_settings
       WHERE type = $1 AND is_active = true ORDER BY name ASC`,
      [type]
    );
    return result.rows;
  }

  static async deleteClassificationType({ id, municipalityId }) {
    const result = await pool.query(DELETE_CLASSIFICATION_TYPE, [id, municipalityId]);
    return result.rows[0];
  }
}

export default Resident;
