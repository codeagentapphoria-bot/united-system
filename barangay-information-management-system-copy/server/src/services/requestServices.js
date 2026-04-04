import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";

class Request {
  static async createRequest(requestData) {
    const client = await pool.connect();
    try {
      const {
        residentId,
        fullName,
        contactNumber,
        email,
        address,
        barangayId,
        type,
        status,
        certificateType,
        urgency,
        purpose,
        requirements,
        appointmentWith,
        appointmentDate,
      } = requestData;

      const query = `
        INSERT INTO requests (
          resident_id,
          full_name,
          contact_number,
          email,
          address,
          barangay_id,
          type,
          status,
          certificate_type,
          urgency,
          purpose,
          requirements,
          appointment_with,
          appointment_date,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *, uuid
      `;

      const values = [
        residentId,
        fullName,
        contactNumber,
        email,
        address,
        barangayId,
        type,
        status,
        certificateType,
        urgency,
        purpose,
        requirements ? JSON.stringify(requirements) : null,
        appointmentWith,
        appointmentDate,
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error("Error creating request:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRequestById(requestId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          r.*,
          CASE 
            WHEN r.type = 'certificate' AND r.resident_id IS NOT NULL THEN
              jsonb_build_object(
                'first_name', res.first_name,
                'last_name', res.last_name,
                'middle_name', res.middle_name,
                'extension_name', res.extension_name,
                'contact_number', res.contact_number,
                'email', res.email,
                'sex', res.sex,
                'civil_status', res.civil_status,
                'birthdate', res.birthdate,
                'monthly_income', res.monthly_income,
                'house_number', h.house_number,
                'street', h.street,
                'barangay_name', b.barangay_name,
                'municipality_name', m.municipality_name
              )
            ELSE NULL
          END as resident_info
        FROM requests r
        LEFT JOIN residents res ON r.resident_id = res.id
        LEFT JOIN family_members fm ON res.id = fm.family_member
        LEFT JOIN families f ON fm.family_id = f.id
        LEFT JOIN households h ON f.household_id = h.id OR res.id = h.house_head
        LEFT JOIN barangays b ON res.barangay_id = b.id
        LEFT JOIN municipalities m ON b.municipality_id = m.id
        WHERE r.id = $1
      `;
      const result = await client.query(query, [requestId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Error getting request by ID:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRequestByUuid(requestUuid) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          r.*,
          CASE 
            WHEN r.type = 'certificate' AND r.resident_id IS NOT NULL THEN
              jsonb_build_object(
                'first_name', res.first_name,
                'last_name', res.last_name,
                'middle_name', res.middle_name,
                'extension_name', res.extension_name,
                'contact_number', res.contact_number,
                'email', res.email,
                'sex', res.sex,
                'civil_status', res.civil_status,
                'birthdate', res.birthdate,
                'monthly_income', res.monthly_income,
                'house_number', h.house_number,
                'street', h.street,
                'barangay_name', b.barangay_name,
                'municipality_name', m.municipality_name
              )
            ELSE NULL
          END as resident_info
        FROM requests r
        LEFT JOIN residents res ON r.resident_id = res.id
        LEFT JOIN family_members fm ON res.id = fm.family_member
        LEFT JOIN families f ON fm.family_id = f.id
        LEFT JOIN households h ON f.household_id = h.id OR res.id = h.house_head
        LEFT JOIN barangays b ON res.barangay_id = b.id
        LEFT JOIN municipalities m ON b.municipality_id = m.id
        WHERE r.uuid = $1
      `;
      const result = await client.query(query, [requestUuid]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Error getting request by UUID:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRequestsByBarangay(barangayId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          r.*,
          CASE 
            WHEN r.type = 'certificate' AND r.resident_id IS NOT NULL THEN
              jsonb_build_object(
                'first_name', res.first_name,
                'last_name', res.last_name,
                'middle_name', res.middle_name,
                'extension_name', res.extension_name,
                'contact_number', res.contact_number,
                'email', res.email,
                'sex', res.sex,
                'civil_status', res.civil_status,
                'birthdate', res.birthdate,
                'monthly_income', res.monthly_income,
                'house_number', h.house_number,
                'street', h.street,
                'barangay_name', b.barangay_name,
                'municipality_name', m.municipality_name
              )
            ELSE NULL
          END as resident_info
        FROM requests r
        LEFT JOIN residents res ON r.resident_id = res.id
        LEFT JOIN family_members fm ON res.id = fm.family_member
        LEFT JOIN families f ON fm.family_id = f.id
        LEFT JOIN households h ON f.household_id = h.id OR res.id = h.house_head
        LEFT JOIN barangays b ON res.barangay_id = b.id
        LEFT JOIN municipalities m ON b.municipality_id = m.id
        WHERE r.barangay_id = $1 
        ORDER BY r.created_at DESC
      `;
      const result = await client.query(query, [barangayId]);
      return result.rows;
    } catch (error) {
      logger.error("Error getting requests by barangay:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateRequestStatus(requestId, status, notes = null) {
    const client = await pool.connect();
    try {
      const query = `
        UPDATE requests 
        SET status = $1, notes = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `;
      const result = await client.query(query, [status, notes, requestId]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error updating request status:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllRequests({ barangayId, status, type, page, perPage }) {
    const client = await pool.connect();
    try {
      let query = `
        SELECT 
          r.*,
          CASE 
            WHEN r.type = 'certificate' AND r.resident_id IS NOT NULL THEN
              jsonb_build_object(
                'first_name', res.first_name,
                'last_name', res.last_name,
                'middle_name', res.middle_name,
                'extension_name', res.extension_name,
                'contact_number', res.contact_number,
                'email', res.email,
                'sex', res.sex,
                'civil_status', res.civil_status,
                'birthdate', res.birthdate,
                'monthly_income', res.monthly_income,
                'house_number', h.house_number,
                'street', h.street,
                'barangay_name', b.barangay_name,
                'municipality_name', m.municipality_name
              )
            ELSE NULL
          END as resident_info
        FROM requests r
        LEFT JOIN residents res ON r.resident_id = res.id
        LEFT JOIN family_members fm ON res.id = fm.family_member
        LEFT JOIN families f ON fm.family_id = f.id
        LEFT JOIN households h ON f.household_id = h.id OR res.id = h.house_head
        LEFT JOIN barangays b ON res.barangay_id = b.id
        LEFT JOIN municipalities m ON b.municipality_id = m.id
        WHERE r.barangay_id = $1
      `;
      const values = [barangayId];
      let paramIndex = 2;

      if (status) {
        query += ` AND r.status = $${paramIndex++}`;
        values.push(status);
      }

      if (type) {
        query += ` AND r.type = $${paramIndex++}`;
        values.push(type);
      }

      // Get total count
      const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) FROM');
      const countResult = await client.query(countQuery, values);
      const totalRecords = parseInt(countResult.rows[0].count, 10);

      // Add pagination
      const offset = (page - 1) * perPage;
      query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      values.push(perPage, offset);

      const result = await client.query(query, values);

      return {
        data: result.rows,
        pagination: {
          page,
          perPage,
          totalRecords,
          totalPages: Math.ceil(totalRecords / perPage),
        },
      };
    } catch (error) {
      logger.error("Error getting all requests:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Request;
