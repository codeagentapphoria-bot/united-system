import fs from "fs/promises";
import path from "path";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import {
  INSERT_RESIDENT,
  UPDATE_RESIDENT,
  INSERT_CLASSIFICATION,
  VIEW_RESIDENT_INFORMATION,
  VIEW_PUBLIC_RESIDENT_INFORMATION,
  CLASSIFICATION_LIST,
  GET_CLASSIFICATION_TYPES,
  GET_CLASSIFICATION_TYPE_BY_ID,
  INSERT_CLASSIFICATION_TYPE,
  UPDATE_CLASSIFICATION_TYPE,
  DELETE_CLASSIFICATION_TYPE,
  CHECK_CLASSIFICATION_TYPE_EXISTS,
  DELETE_CLASSIFICATION,
} from "../queries/resident.queries.js";
import { GET_PREFIX, INSERT_PREFIX } from "../queries/counter.queries.js";
// import { finalization } from "process"; // Removed - not available in Node.js 18

async function generateResidentId() {
  const currentYear = new Date().getFullYear();
  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const prefixResult = await client.query(GET_PREFIX);
    const prefix = prefixResult.rows[0]?.prefix?.trim() || "DFLT";
    const result = await client.query(INSERT_PREFIX, [currentYear, prefix]);
    const nextId = String(result.rows[0].counter).padStart(7, "0");
    const residentId = `${prefix}-${currentYear}-${nextId}`;

    await client.query("COMMIT");

    return residentId;
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        logger.error("Error during rollback", rollbackError);
      }
    }
    logger.error("Error generating resident ID", error);
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        logger.error("Error releasing client", releaseError);
      }
    }
  }
}

function parseJSONSafe(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

class Resident {
  static async insertResident({
    barangayId,
    lastName,
    firstName,
    middleName,
    suffix,
    sex,
    civilStatus,
    birthdate,
    birthplace,
    contactNumber,
    email,
    occupation,
    monthlyIncome,
    employmentStatus,
    educationAttainment,
    residentStatus,
    picturePath,
    indigentPerson,
    classifications,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const residentId = await generateResidentId();

      // Handle empty strings for numeric fields
      const sanitizedMonthlyIncome =
        monthlyIncome === "" || monthlyIncome === null || monthlyIncome === undefined 
          ? null 
          : parseFloat(monthlyIncome);

      // Handle empty strings for boolean fields
      const sanitizedIndigenousPerson =
        indigentPerson === ""
          ? false
          : indigentPerson === "Yes" || indigentPerson === "True"
          ? true
          : false;

      const residentResult = await client.query(INSERT_RESIDENT, [
        residentId,
        barangayId,
        lastName,
        firstName,
        middleName,
        suffix,
        sex,
        civilStatus,
        birthdate,
        birthplace,
        contactNumber,
        email,
        occupation,
        sanitizedMonthlyIncome,
        employmentStatus,
        educationAttainment,
        residentStatus,
        picturePath,
        sanitizedIndigenousPerson,
      ]);

      const classificationResults = [];
      for (const classification of classifications) {
        const details = JSON.stringify(classification.details || "");

        const result = await client.query(INSERT_CLASSIFICATION, [
          residentId,
          classification.type,
          details,
        ]);
        classificationResults.push(result.rows[0]);
      }

      await client.query("COMMIT");

      return {
        resident: residentResult.rows[0],
        classifications: classificationResults,
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        logger.error("Error during rollback", rollbackError);
      }
      logger.error("Failed to insert resident: ", error);
      throw error;
    } finally {
      try {
        client.release();
      } catch (releaseError) {
        logger.error("Error releasing client", releaseError);
      }
    }
  }

  static async updateResident({
    residentId,
    barangayId,
    lastName,
    firstName,
    middleName,
    suffix,
    sex,
    civilStatus,
    birthdate,
    birthplace,
    contactNumber,
    email,
    occupation,
    monthlyIncome,
    employmentStatus,
    educationAttainment,
    residentStatus,
    picturePath,
    indigentPerson,
    classifications,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Handle empty strings for numeric fields
      const sanitizedMonthlyIncome =
        monthlyIncome === "" || monthlyIncome === null || monthlyIncome === undefined 
          ? null 
          : parseFloat(monthlyIncome);

      // Handle empty strings for boolean fields
      const sanitizedIndigenousPerson =
        indigentPerson === ""
          ? false
          : indigentPerson === "Yes" || indigentPerson === "True"
          ? true
          : false;

      const residentResult = await client.query(UPDATE_RESIDENT, [
        residentId,
        barangayId,
        lastName,
        firstName,
        middleName,
        suffix,
        sex,
        civilStatus,
        birthdate,
        birthplace,
        contactNumber,
        email,
        occupation,
        sanitizedMonthlyIncome,
        employmentStatus,
        educationAttainment,
        residentStatus,
        picturePath,
        sanitizedIndigenousPerson,
      ]);

      await client.query(
        "DELETE FROM resident_classifications WHERE resident_id = $1",
        [residentId]
      );

      const classificationResults = [];
      for (const classification of classifications) {
        const details = JSON.stringify(classification.details || "");

        const result = await client.query(INSERT_CLASSIFICATION, [
          residentId,
          classification.type,
          details,
        ]);
        classificationResults.push(result.rows[0]);
      }

      // Remove old picture only if a new picture is being uploaded
      if (picturePath && picturePath.trim() !== "") {
        const { rows: oldPicturePath } = await client.query(
          "SELECT picture_path FROM residents WHERE id = $1",
          [residentId]
        );

        const oldPicture = oldPicturePath[0]?.picture_path;
        if (oldPicture && oldPicture !== picturePath) {
          try {
            await fs.unlink(path.resolve(oldPicture));
          } catch (error) {
            if (error.code !== "ENOENT")
              logger.warn("Failed to delete picture", error);
          }
        }
      }

      await client.query("COMMIT");

      return {
        resident: residentResult.rows[0],
        classifications: classificationResults,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to update resident: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteResident(residentId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // First, explicitly delete associated resident_classifications
      // This ensures cascade deletion even if foreign key constraints aren't working properly
      const deletedClassifications = await client.query(
        "DELETE FROM resident_classifications WHERE resident_id = $1 RETURNING id",
        [residentId]
      );
      
      logger.info(
        `Deleted ${deletedClassifications.rows.length} resident_classifications for resident ${residentId}`
      );

      // Get resident info before deletion (for picture cleanup)
      const { rows: picturePath } = await client.query(
        "SELECT picture_path FROM residents WHERE id = $1",
        [residentId]
      );

      // Delete the resident record
      const result = await client.query(
        "DELETE FROM residents WHERE id = $1 RETURNING *",
        [residentId]
      );

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        throw new Error(`Resident with ID ${residentId} not found`);
      }

      // Check if picturePath exists and has a valid file path
      if (picturePath?.[0]?.picture_path) {
        try {
          await fs.unlink(path.resolve(picturePath[0].picture_path));
          logger.info(`Deleted picture file for resident ${residentId}`);
        } catch (error) {
          if (error.code !== "ENOENT") {
            logger.warn(`Failed to delete picture for resident ${residentId}:`, error);
          }
        }
      }

      await client.query("COMMIT");

      logger.info(
        `Successfully deleted resident ${residentId} with ${deletedClassifications.rows.length} classifications`
      );

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to delete resident: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async residentList({
    barangayId,
    purokId,
    classificationType,
    search = "",
    page = 1,
    perPage = 10,
    userTargetType,
    userTargetId,
  }) {
    const client = await pool.connect();
    try {
      if (page < 1 || perPage < 1) {
        throw new Error("Page and perPage must be positive integers");
      }

      let query;
      const joins = [];
      const whereClauses = [];
      const values = [];
      let paramIndex = 1;

      joins.push(`LEFT JOIN barangays b ON r.barangay_id = b.id`);

      // Conditionally join puroks if needed
      if (purokId) {
        // Use a subquery to get residents by purok, handling both house heads and family members
        query = `
          SELECT DISTINCT
            r.id,
            r.last_name,
            r.first_name,
            r.middle_name,
            r.suffix,
            r.birthdate,
            r.resident_status,
            r.civil_status,
            r.sex,
            r.contact_number,
            r.email,
            r.occupation,
            b.barangay_name,
            p.purok_name
          FROM residents r
          LEFT JOIN barangays b ON r.barangay_id = b.id
          LEFT JOIN puroks p ON p.id = $${paramIndex++}
          WHERE r.id IN (
            -- Get house heads in this purok
            SELECT h.house_head 
            FROM households h 
            WHERE h.purok_id = $${paramIndex - 1}
            UNION
            -- Get family heads in this purok
            SELECT f.family_head
            FROM families f
            JOIN households h ON h.id = f.household_id
            WHERE h.purok_id = $${paramIndex - 1}
            UNION
            -- Get family members in this purok
            SELECT fm.family_member
            FROM family_members fm
            JOIN families f ON f.id = fm.family_id
            JOIN households h ON h.id = f.household_id
            WHERE h.purok_id = $${paramIndex - 1}
          )
        `;
        values.push(purokId);
      } else {
        // For non-purok filtering, use the standard approach with purok_info join
        query = `
          SELECT DISTINCT
            r.id,
            r.last_name,
            r.first_name,
            r.middle_name,
            r.suffix,
            r.birthdate,
            r.resident_status,
            r.civil_status,
            r.sex,
            r.contact_number,
            r.email,
            r.occupation,
            b.barangay_name,
            purok_info.purok_name
          FROM residents r
        `;

        // Ensure LEFT JOIN puroks even if purokId not given (since we select purok_info.purok_name)
        joins.push(`
          LEFT JOIN (
            -- Get purok info for house heads
            SELECT r.id as resident_id, p.id as purok_id, p.purok_name
            FROM residents r
            JOIN households h ON h.house_head = r.id
            JOIN puroks p ON p.id = h.purok_id
            UNION
            -- Get purok info for family heads
            SELECT r.id as resident_id, p.id as purok_id, p.purok_name
            FROM residents r
            JOIN families f ON f.family_head = r.id
            JOIN households h ON h.id = f.household_id
            JOIN puroks p ON p.id = h.purok_id
            UNION
            -- Get purok info for family members
            SELECT r.id as resident_id, p.id as purok_id, p.purok_name
            FROM residents r
            JOIN family_members fm ON fm.family_member = r.id
            JOIN families f ON f.id = fm.family_id
            JOIN households h ON h.id = f.household_id
            JOIN puroks p ON p.id = h.purok_id
          ) purok_info ON purok_info.resident_id = r.id
        `);
      }

      if (purokId) {
        // For purok filtering, we already have the WHERE clause in the subquery
        // Add additional filters
        if (classificationType) {
          query += ` AND r.id IN (
            SELECT rc.resident_id 
            FROM resident_classifications rc 
            WHERE rc.classification_type = $${paramIndex++}
          )`;
          values.push(classificationType);
        }

        if (userTargetType === "municipality") {
          query += ` AND b.municipality_id = $${paramIndex++}`;
          values.push(userTargetId);
        }

        if (barangayId) {
          query += ` AND r.barangay_id = $${paramIndex++}`;
          values.push(barangayId);
        }

        if (search) {
          query += ` AND (CONCAT_WS(' ', r.first_name, r.middle_name, r.last_name, r.suffix) ILIKE $${paramIndex} OR r.id ILIKE $${paramIndex})`;
          values.push(`%${search}%`);
          paramIndex++;
        }

        const offset = (page - 1) * perPage;
        query += ` ORDER BY r.first_name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(perPage, offset);
      } else {
        // Original logic for non-purok filtering
        if (classificationType) {
          joins.push(`
            LEFT JOIN resident_classifications rc ON rc.resident_id = r.id
          `);
          whereClauses.push(`rc.classification_type = $${paramIndex++}`);
          values.push(classificationType);
        }

        if (userTargetType === "municipality") {
          whereClauses.push(`b.municipality_id = $${paramIndex++}`);
          values.push(userTargetId);
        }

        if (barangayId) {
          whereClauses.push(`r.barangay_id = $${paramIndex++}`);
          values.push(barangayId);
        }

        if (search) {
          whereClauses.push(
            `(CONCAT_WS(' ', r.first_name, r.middle_name, r.last_name, r.suffix) ILIKE $${paramIndex} OR r.id ILIKE $${paramIndex})`
          );
          values.push(`%${search}%`);
          paramIndex++;
        }

        query += joins.join(" ");
        if (whereClauses.length > 0) {
          query += " WHERE " + whereClauses.join(" AND ");
        }

        const offset = (page - 1) * perPage;
        query += ` ORDER BY r.first_name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        values.push(perPage, offset);
      }

      const result = await client.query(query, values);

      // Count query
      let countQuery;
      const countValues = [];
      let countParamIndex = 1;

      if (purokId) {
        // For purok filtering, use the same subquery approach
        countQuery = `
          SELECT COUNT(DISTINCT r.id) AS total
          FROM residents r
          LEFT JOIN barangays b ON r.barangay_id = b.id
          WHERE r.id IN (
            -- Get house heads in this purok
            SELECT h.house_head 
            FROM households h 
            WHERE h.purok_id = $${countParamIndex++}
            UNION
            -- Get family members in this purok
            SELECT fm.family_member
            FROM family_members fm
            JOIN families f ON f.id = fm.family_id
            JOIN households h ON h.id = f.household_id
            WHERE h.purok_id = $${countParamIndex - 1}
          )
        `;
        countValues.push(purokId);

        if (classificationType) {
          countQuery += ` AND r.id IN (
            SELECT rc.resident_id 
            FROM resident_classifications rc 
            WHERE rc.classification_type = $${countParamIndex++}
          )`;
          countValues.push(classificationType);
        }

        if (userTargetType === "municipality") {
          countQuery += ` AND b.municipality_id = $${countParamIndex++}`;
          countValues.push(userTargetId);
        }

        if (barangayId) {
          countQuery += ` AND r.barangay_id = $${countParamIndex++}`;
          countValues.push(barangayId);
        }

        if (search) {
          countQuery += ` AND (CONCAT_WS(' ', r.first_name, r.middle_name, r.last_name, r.suffix) ILIKE $${countParamIndex} OR r.id ILIKE $${countParamIndex})`;
          countValues.push(`%${search}%`);
          countParamIndex++;
        }
      } else {
        // Original count query for non-purok filtering
        countQuery = `
          SELECT COUNT(DISTINCT r.id) AS total
          FROM residents r
        `;

        const countJoins = [...joins];
        const countWhereClauses = [];

        countQuery += countJoins.join(" ");

        if (classificationType) {
          countWhereClauses.push(
            `rc.classification_type = $${countParamIndex++}`
          );
          countValues.push(classificationType);
        }

        if (userTargetType === "municipality") {
          countWhereClauses.push(`b.municipality_id = $${countParamIndex++}`);
          countValues.push(userTargetId);
        }

        if (barangayId) {
          countWhereClauses.push(`r.barangay_id = $${countParamIndex++}`);
          countValues.push(barangayId);
        }

        if (search) {
          countWhereClauses.push(
            `(CONCAT_WS(' ', r.first_name, r.middle_name, r.last_name, r.suffix) ILIKE $${countParamIndex} OR r.id ILIKE $${countParamIndex})`
          );
          countValues.push(`%${search}%`);
          countParamIndex++;
        }

        if (countWhereClauses.length > 0) {
          countQuery += " WHERE " + countWhereClauses.join(" AND ");
        }
      }

      const countResult = await client.query(countQuery, countValues);
      const totalRecords = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(totalRecords / perPage);

      return {
        data: result.rows,
        pagination: {
          page: Number(page),
          perPage: Number(perPage),
          totalRecords,
          totalPages,
        },
      };
    } catch (error) {
      logger.error("Failed to fetch residents list", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async residentInfo(residentId) {
    const client = await pool.connect();
    try {
      const result = await client.query(VIEW_RESIDENT_INFORMATION, [
        residentId,
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("Failed to fetch resident information", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async publicResidentInfo(residentId) {
    const client = await pool.connect();
    try {
      const result = await client.query(VIEW_PUBLIC_RESIDENT_INFORMATION, [
        residentId,
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("Failed to fetch public resident information", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async insertClassification({
    classificationType,
    classificationDetails,
  }) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(INSERT_CLASSIFICATION, [
        classificationType,
        parseJSONSafe(classificationDetails),
      ]);

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error inserting classification: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async classificationList() {
    const client = await pool.connect();
    try {
      const result = await client.query(CLASSIFICATION_LIST);

      return result.rows;
    } catch (error) {
      logger.error("Failed to fetch classification list: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateClassification({
    classificationId,
    classificationType,
    classificationDetails,
  }) {
    const client = await pool.connect();
    try {
      const result = await client.query(UPDATE_CLASSIFICATION, [
        classificationId,
        classificationType,
        classificationDetails,
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update classification: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get barangay by ID
  static async getBarangayById(barangayId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM barangays WHERE id = $1",
        [barangayId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to fetch barangay: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Classification Types Services
  static async getClassificationTypes(municipalityId) {
    const client = await pool.connect();
    try {
      const result = await client.query(GET_CLASSIFICATION_TYPES, [municipalityId]);
      return result.rows;
    } catch (error) {
      logger.error("Failed to fetch classification types: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getClassificationTypeById(id, municipalityId) {
    const client = await pool.connect();
    try {
      const result = await client.query(GET_CLASSIFICATION_TYPE_BY_ID, [id, municipalityId]);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to fetch classification type: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async insertClassificationType({
    municipalityId,
    name,
    description,
    color,
    details,
  }) {
    const client = await pool.connect();
    try {
      // Convert details array to JSONB if it's an array, otherwise use as is
      const detailsJson = Array.isArray(details) ? JSON.stringify(details) : (details || '[]');
      
      // Use UPSERT to handle concurrent inserts from multiple mobile devices
      // If classification already exists, it updates and returns the existing ID
      // This prevents sync failures when multiple devices create the same classification
      const result = await client.query(INSERT_CLASSIFICATION_TYPE, [
        municipalityId,
        name,
        description,
        color,
        detailsJson,
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("Failed to insert classification type: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateClassificationType({
    id,
    municipalityId,
    name,
    description,
    color,
    details,
  }) {
    const client = await pool.connect();
    try {
      // Check if classification type already exists (excluding current one)
      const existsResult = await client.query(
        "SELECT COUNT(*) FROM classification_types WHERE municipality_id = $1 AND name = $2 AND id != $3 AND is_active = true",
        [municipalityId, name, id]
      );
      if (existsResult.rows[0].count > 0) {
        throw new Error("Classification type already exists");
      }

      // Convert details array to JSONB if it's an array, otherwise use as is
      const detailsJson = Array.isArray(details) ? JSON.stringify(details) : (details || '[]');
      
      const result = await client.query(UPDATE_CLASSIFICATION_TYPE, [
        id,
        municipalityId,
        name,
        description,
        color,
        detailsJson,
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("Failed to update classification type: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteClassificationType(id, municipalityId) {
    const client = await pool.connect();
    try {
      const result = await client.query(DELETE_CLASSIFICATION_TYPE, [id, municipalityId]);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to delete classification type: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteClassification(classificationId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(DELETE_CLASSIFICATION, [
        classificationId,
      ]);

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error deleting classification: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async syncResident({
    id,
    barangayId,
    lastName,
    firstName,
    middleName,
    suffix,
    sex,
    civilStatus,
    birthdate,
    birthplace,
    contactNumber,
    email,
    occupation,
    monthlyIncome,
    employmentStatus,
    educationAttainment,
    residentStatus,
    picturePath,
    indigentPerson,
  }) {
    // Input validation
    if (contactNumber && contactNumber.length > 50) {
      logger.warn(`Contact number too long: ${contactNumber.length} characters. Truncating to 50 characters.`);
      contactNumber = contactNumber.substring(0, 50);
    }

    if (residentStatus && residentStatus.length > 20) {
      logger.warn(`Resident status too long: ${residentStatus.length} characters. Truncating to 20 characters.`);
      residentStatus = residentStatus.substring(0, 20);
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if resident exists
      const existingResident = await client.query(
        "SELECT id FROM residents WHERE id = $1",
        [id]
      );

      // Handle empty strings for numeric fields
      const sanitizedMonthlyIncome =
        monthlyIncome === "" || monthlyIncome === null || monthlyIncome === undefined 
          ? null 
          : parseFloat(monthlyIncome);

      // Handle empty strings for boolean fields
      const sanitizedIndigenousPerson =
        indigentPerson === ""
          ? false
          : indigentPerson === "Yes" || indigentPerson === "True"
          ? true
          : false;

      let residentResult;
      let finalResidentId = id; // Default to provided ID

      if (existingResident.rows.length > 0) {
        // Update existing resident
        residentResult = await client.query(UPDATE_RESIDENT, [
          id,
          barangayId,
          lastName,
          firstName,
          middleName,
          suffix,
          sex,
          civilStatus,
          birthdate,
          birthplace,
          contactNumber,
          email,
          occupation,
          sanitizedMonthlyIncome,
          employmentStatus,
          educationAttainment,
          residentStatus,
          picturePath,
          sanitizedIndigenousPerson,
        ]);
      } else {
        // Generate server ID for new resident
        finalResidentId = await generateResidentId();
        
        // Insert new resident with server-generated ID
        residentResult = await client.query(INSERT_RESIDENT, [
          finalResidentId,
          barangayId,
          lastName,
          firstName,
          middleName,
          suffix,
          sex,
          civilStatus,
          birthdate,
          birthplace,
          contactNumber,
          email,
          occupation,
          sanitizedMonthlyIncome,
          employmentStatus,
          educationAttainment,
          residentStatus,
          picturePath,
          sanitizedIndigenousPerson,
        ]);
      }

      await client.query("COMMIT");

      return {
        resident: {
          ...residentResult.rows[0],
          id: finalResidentId // Ensure we return the final ID (server-generated for new, original for existing)
        },
        action: existingResident.rows.length > 0 ? "updated" : "created",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to sync resident: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async syncClassification({
    residentId,
    classificationType,
    classificationDetails,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check if resident exists
      const residentCheck = await client.query(
        "SELECT id FROM residents WHERE id = $1",
        [residentId]
      );

      if (residentCheck.rows.length === 0) {
        throw new ApiError(404, "Resident not found");
      }

      // Insert the classification
      // Handle classification_details - if it's a string, wrap it in JSON, if it's already JSON, use as is
      let processedDetails = classificationDetails;
      if (typeof classificationDetails === 'string') {
        // If it's a plain string, wrap it in a JSON object
        processedDetails = JSON.stringify(classificationDetails || "");
      } else if (typeof classificationDetails === 'object') {
        // If it's already an object, stringify it
        processedDetails = JSON.stringify(classificationDetails);
      } else if (!classificationDetails || classificationDetails === '') {
        // If empty or null, use empty JSON object
        processedDetails = JSON.stringify({});
      }

      const result = await client.query(INSERT_CLASSIFICATION, [
        residentId,
        classificationType,
        processedDetails,
      ]);

      await client.query("COMMIT");

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to sync classification: ", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Resident;
