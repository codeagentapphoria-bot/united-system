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
    return result.rows[0];
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
    return result.rows[0];
  }

  static async deleteClassification({ classificationId }) {
    const result = await pool.query(DELETE_CLASSIFICATION, [classificationId]);
    return result.rows[0];
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

  static async deleteClassificationType({ id, municipalityId }) {
    const result = await pool.query(DELETE_CLASSIFICATION_TYPE, [id, municipalityId]);
    return result.rows[0];
  }
}

export default Resident;
