import fs from "fs/promises";
import path from "path";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import {
  INSERT_BARANGAY,
  UPDATE_BARANGAY,
  ADD_OFFICIAL,
  UPDATE_OFFICIAL,
  GET_OFFICIALS_LIST,
  GET_OFFICIAL_INFO,
  DELETE_OFFICIAL,
} from "../queries/barangay.queries.js";
import { ApiError } from "../utils/apiError.js";

class Barangay {
  static async checkForConflicts(barangayName, barangayCode, excludeId = null) {
    const client = await pool.connect();
    try {
      const conflicts = [];
      
      // Check for duplicate barangay name
      let nameQuery = "SELECT id, barangay_name FROM barangays WHERE barangay_name = $1";
      let nameParams = [barangayName];
      if (excludeId) {
        nameQuery += " AND id != $2";
        nameParams.push(excludeId);
      }
      const { rows: nameConflicts } = await client.query(nameQuery, nameParams);
      
      if (nameConflicts.length > 0) {
        conflicts.push({
          field: "barangay_name",
          message: `Barangay with name "${barangayName}" already exists`,
          existingId: nameConflicts[0].id
        });
      }
      
      // Check for duplicate barangay code (if it has unique constraint)
      let codeQuery = "SELECT id, barangay_code FROM barangays WHERE barangay_code = $1";
      let codeParams = [barangayCode];
      if (excludeId) {
        codeQuery += " AND id != $2";
        codeParams.push(excludeId);
      }
      const { rows: codeConflicts } = await client.query(codeQuery, codeParams);
      
      if (codeConflicts.length > 0) {
        conflicts.push({
          field: "barangay_code",
          message: `Barangay with code "${barangayCode}" already exists`,
          existingId: codeConflicts[0].id
        });
      }
      
      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };
    } catch (error) {
      logger.error("Error checking for barangay conflicts", error);
      throw new ApiError(500, "Failed to check for conflicts");
    } finally {
      client.release();
    }
  }



  static async insertBarangay({
    municipalityId,
    barangayName,
    barangayCode,
    barangayLogoPath,
    certificateBackgroundPath,
    organizationalChartPath,
    contactNumber,
    email,
    gisCode,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(INSERT_BARANGAY, [
        municipalityId,
        barangayName,
        barangayCode,
        barangayLogoPath,
        certificateBackgroundPath,
        organizationalChartPath,
        contactNumber,
        email,
        gisCode,
      ]);
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to insert barangay:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateBarangay({
    barangayId,
    municipalityId,
    barangayName,
    barangayCode,
    barangayLogoPath,
    certificateBackgroundPath,
    organizationalChartPath,
    contactNumber,
    email,
    gisCode,
    removeBarangayLogoPath = false,
    removeCertificateBackgroundPath = false,
    removeOrganizationalChartPath = false,
  }) {
    const client = await pool.connect();
    console.log(
      barangayId,
      municipalityId,
      barangayName,
      barangayCode,
      barangayLogoPath,
      certificateBackgroundPath,
      organizationalChartPath,
      contactNumber,
      email,
      gisCode
    );
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `
        SELECT 
        barangay_logo_path, 
        certificate_background_path, 
        organizational_chart_path
        FROM barangays 
        WHERE id = $1
        `,
        [barangayId]
      );

      const current = rows[0];

      // Handle image paths - consider removal flags
      let finalBarangayLogoPath = current.barangay_logo_path;
      let finalCertificateBackgroundPath = current.certificate_background_path;
      let finalOrganizationalChartPath = current.organizational_chart_path;

      // Set new paths if provided
      if (barangayLogoPath) {
        finalBarangayLogoPath = barangayLogoPath;
      } else if (removeBarangayLogoPath) {
        finalBarangayLogoPath = null;
      }

      if (certificateBackgroundPath) {
        finalCertificateBackgroundPath = certificateBackgroundPath;
      } else if (removeCertificateBackgroundPath) {
        finalCertificateBackgroundPath = null;
      }

      if (organizationalChartPath) {
        finalOrganizationalChartPath = organizationalChartPath;
      } else if (removeOrganizationalChartPath) {
        finalOrganizationalChartPath = null;
      }

      const result = await client.query(UPDATE_BARANGAY, [
        barangayId,
        municipalityId,
        barangayName,
        barangayCode,
        finalBarangayLogoPath,
        finalCertificateBackgroundPath,
        finalOrganizationalChartPath,
        contactNumber,
        email,
        gisCode,
      ]);

      const pathsToDelete = [];

      // Delete old files if new files are provided or if images are being removed
      if (
        (barangayLogoPath && current.barangay_logo_path && current.barangay_logo_path !== barangayLogoPath) ||
        (removeBarangayLogoPath && current.barangay_logo_path)
      ) {
        pathsToDelete.push(current.barangay_logo_path);
      }
      if (
        (certificateBackgroundPath && current.certificate_background_path && current.certificate_background_path !== certificateBackgroundPath) ||
        (removeCertificateBackgroundPath && current.certificate_background_path)
      ) {
        pathsToDelete.push(current.certificate_background_path);
      }
      if (
        (organizationalChartPath && current.organizational_chart_path && current.organizational_chart_path !== organizationalChartPath) ||
        (removeOrganizationalChartPath && current.organizational_chart_path)
      ) {
        pathsToDelete.push(current.organizational_chart_path);
      }

      for (const filePath of pathsToDelete) {
        try {
          await fs.unlink(path.resolve(filePath));
        } catch (err) {
          if (err.code !== "ENOENT") {
            logger.warn(`Failed to delete old file at ${filePath}:`, err);
          }
        }
      }

      await client.query("COMMIT");

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to update barangay:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteBarangay(barangayId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM barangays WHERE id = $1 RETURNING *",
        [barangayId]
      );
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to delete barangay:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async createBackupData(barangayId) {
    const client = await pool.connect();
    try {
      // Get counts for backup data
      const householdsResult = await client.query(
        "SELECT COUNT(*) as count FROM households WHERE barangay_id = $1",
        [barangayId]
      );
      
      const residentsResult = await client.query(
        "SELECT COUNT(*) as count FROM residents WHERE barangay_id = $1 AND status = 'active'",
        [barangayId]
      );
      
      const officialsResult = await client.query(
        "SELECT COUNT(*) as count FROM officials WHERE barangay_id = $1",
        [barangayId]
      );

      return {
        households: parseInt(householdsResult.rows[0]?.count || 0),
        residents: parseInt(residentsResult.rows[0]?.count || 0),
        officials: parseInt(officialsResult.rows[0]?.count || 0),
      };
    } catch (error) {
      logger.error("Failed to create backup data:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async barangayList({ search = "", page = 1, perPage = 10 }) {
    const client = await pool.connect();
    try {
      if (page < 1 || perPage < 1)
        throw new Error("Page and perPage must be positive integers");

      let query = `
      SELECT 
        b.id,
        b.municipality_id,
        b.barangay_name,
        b.barangay_code,
        b.contact_number,
        b.email,
        m.municipality_name
      FROM barangays b
      LEFT JOIN municipalities m ON m.id = b.municipality_id
      `;

      const values = [];
      let paramIndex = 1;

      if (search) {
        query += `
        WHERE 
        b.barangay_name ILIKE $${paramIndex++} OR
        b.barangay_code ILIKE $${paramIndex++} OR
        b.contact_number ILIKE $${paramIndex++} OR
        b.email ILIKE $${paramIndex++}
        `;
        values.push(...Array(4).fill(`%${search}%`));
      }

      const offset = (page - 1) * perPage;
      query += ` ORDER BY barangay_name ASC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      values.push(perPage, offset);

      const result = await client.query(query, values);

      const countQuery = `
      SELECT COUNT(*) 
      FROM barangays b
      ${
        search
          ? "WHERE b.barangay_name ILIKE $1 OR b.barangay_code ILIKE $1 OR b.contact_number ILIKE $1 OR b.email ILIKE $1"
          : ""
      }
      `;
      const countResult = await client.query(
        countQuery,
        search ? [`%${search}%`] : []
      );
      const totalRecords = parseInt(countResult.rows[0].count, 10);

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
      logger.error("Error fetching barangay list:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async barangayInfo(barangayId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT
          b.id,
          b.municipality_id,
          b.barangay_name,
          b.barangay_code,
          b.barangay_logo_path,
          b.certificate_background_path,
          b.organizational_chart_path,
          b.contact_number,
          b.email,
          b.gis_code,
          m.municipality_name,
          m.province,
          m.region,
          m.municipality_logo_path
        FROM barangays b
        LEFT JOIN municipalities m ON b.municipality_id = m.id
        WHERE b.id = $1
      `;

      const result = await client.query(query, [barangayId]);
      if (result.rows.length === 0) {
        throw new ApiError(404, "Barangay not found");
      }
      return result.rows[0];
    } catch (error) {
      logger.error("Error fetching barangay info:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async barangayInfoWithCaptain(barangayId) {
    const client = await pool.connect();
    try {
      // First, let's get all officials for this barangay to see what positions exist
      const officialsQuery = `
        SELECT o.position, o.resident_id, r.first_name, r.last_name
        FROM officials o
        LEFT JOIN residents r ON o.resident_id = r.id
        WHERE o.barangay_id = $1
        ORDER BY o.position
      `;
      
      const officialsResult = await client.query(officialsQuery, [barangayId]);
      logger.info(`Found ${officialsResult.rows.length} officials for barangay ${barangayId}:`, officialsResult.rows);

      // Main query with more flexible captain detection
      const query = `
        SELECT
          b.id,
          b.municipality_id,
          b.barangay_name,
          b.barangay_code,
          b.barangay_logo_path,
          b.certificate_background_path,
          b.organizational_chart_path,
          b.contact_number,
          b.email,
          b.gis_code,
          m.municipality_name,
          m.province,
          m.region,
          m.municipality_logo_path,
          o.position as captain_position,
          CONCAT(r.first_name, ' ', r.last_name) as captain_name
        FROM barangays b
        LEFT JOIN municipalities m ON b.municipality_id = m.id
        LEFT JOIN officials o ON b.id = o.barangay_id AND (
          LOWER(o.position) LIKE '%captain%' OR 
          LOWER(o.position) LIKE '%punong barangay%' OR
          LOWER(o.position) LIKE '%barangay captain%' OR
          LOWER(o.position) LIKE '%pb%'
        )
        LEFT JOIN residents r ON o.resident_id = r.id
        WHERE b.id = $1
        LIMIT 1
      `;

      const result = await client.query(query, [barangayId]);
      if (result.rows.length === 0) {
        throw new ApiError(404, "Barangay not found");
      }
      
      const barangayData = result.rows[0];
      
      // If no captain found, try to get the first official as fallback
      if (!barangayData.captain_name && officialsResult.rows.length > 0) {
        const firstOfficial = officialsResult.rows[0];
        barangayData.captain_position = firstOfficial.position;
        barangayData.captain_name = `${firstOfficial.first_name} ${firstOfficial.last_name}`;
        logger.info(`Using first official as captain: ${barangayData.captain_name} (${barangayData.captain_position})`);
      } else if (!barangayData.captain_name) {
        // If no officials found at all, use default values
        barangayData.captain_position = "Barangay Captain";
        barangayData.captain_name = "[Name of Barangay Captain]";
        logger.warn(`No officials found for barangay ${barangayId}, using default captain name`);
      }
      
      return barangayData;
    } catch (error) {
      logger.error("Error fetching barangay info with captain:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async insertOfficial({
    barangayId,
    residentId,
    position,
    committee,
    termStart,
    termEnd,
    responsibilities,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(ADD_OFFICIAL, [
        barangayId,
        residentId,
        position,
        committee,
        termStart,
        termEnd,
        responsibilities,
      ]);

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error adding official", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateOfficial({
    officialId,
    barangayId,
    residentId,
    position,
    committee,
    termStart,
    termEnd,
    responsibilities,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(UPDATE_OFFICIAL, [
        officialId,
        barangayId,
        residentId,
        position,
        committee,
        termStart,
        termEnd,
        responsibilities,
      ]);

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error updating official", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async officialList(barangayId) {
    const client = await pool.connect();
    try {
      const result = await client.query(GET_OFFICIALS_LIST, [barangayId]);
      return result.rows;
    } catch (error) {
      logger.error("Error fetching official list", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async officialInfo(officialId) {
    const client = await pool.connect();
    try {
      const result = await client.query(GET_OFFICIAL_INFO, [officialId]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error fetching official information", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteOfficial(officialId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(DELETE_OFFICIAL, [officialId]);
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error deleting official", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async exportBarangayData(barangayId) {
    const client = await pool.connect();
    try {
      // Import required modules for ZIP and Excel creation
      const archiver = await import("archiver");
      const XLSX = await import("xlsx");
      const fs = await import("fs");
      const path = await import("path");
      const stream = await import("stream");

      // Export all data tables
      const dataToExport = {};

      // Export barangay info
      try {
        const barangayResult = await client.query(
          "SELECT * FROM barangays WHERE id = $1",
          [barangayId]
        );
        dataToExport.barangay = barangayResult.rows[0];
      } catch (error) {
        logger.warn("Could not export barangay data:", error.message);
        dataToExport.barangay = null;
      }

      // Export residents
      try {
        const residentsResult = await client.query(
          "SELECT * FROM residents WHERE barangay_id = $1 AND status = 'active'",
          [barangayId]
        );
        dataToExport.residents = residentsResult.rows;
      } catch (error) {
        logger.warn("Could not export residents data:", error.message);
        dataToExport.residents = [];
      }

      // Export resident classifications
      try {
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'resident_classifications'
          )`
        );

        if (tableExists.rows[0].exists) {
          const classificationsResult = await client.query(
            `SELECT rc.* FROM resident_classifications rc
             JOIN residents r ON rc.resident_id = r.id
             WHERE r.barangay_id = $1`,
            [barangayId]
          );
          dataToExport.resident_classifications = classificationsResult.rows;
        } else {
          logger.info(
            "Resident classifications table does not exist, skipping export"
          );
          dataToExport.resident_classifications = [];
        }
      } catch (error) {
        logger.warn(
          "Could not export resident classifications:",
          error.message
        );
        dataToExport.resident_classifications = [];
      }

      // Export households
      try {
        const householdsResult = await client.query(
          "SELECT * FROM households WHERE barangay_id = $1",
          [barangayId]
        );
        dataToExport.households = householdsResult.rows;
      } catch (error) {
        logger.warn("Could not export households data:", error.message);
        dataToExport.households = [];
      }

      // Export families
      try {
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'families'
          )`
        );

        if (tableExists.rows[0].exists) {
          const familiesResult = await client.query(
            `SELECT f.* FROM families f
             JOIN households h ON f.household_id = h.id
             WHERE h.barangay_id = $1`,
            [barangayId]
          );
          dataToExport.families = familiesResult.rows;
        } else {
          logger.info("Families table does not exist, skipping export");
          dataToExport.families = [];
        }
      } catch (error) {
        logger.warn("Could not export families data:", error.message);
        dataToExport.families = [];
      }

      // Export family members
      try {
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'family_members'
          )`
        );

        if (tableExists.rows[0].exists) {
          const familyMembersResult = await client.query(
            `SELECT fm.* FROM family_members fm
             JOIN families f ON fm.family_id = f.id
             JOIN households h ON f.household_id = h.id
             WHERE h.barangay_id = $1`,
            [barangayId]
          );
          dataToExport.family_members = familyMembersResult.rows;
        } else {
          logger.info("Family members table does not exist, skipping export");
          dataToExport.family_members = [];
        }
      } catch (error) {
        logger.warn("Could not export family members data:", error.message);
        dataToExport.family_members = [];
      }

      // Export officials
      try {
        const officialsResult = await client.query(
          "SELECT * FROM officials WHERE barangay_id = $1",
          [barangayId]
        );
        dataToExport.officials = officialsResult.rows;
      } catch (error) {
        logger.warn("Could not export officials data:", error.message);
        dataToExport.officials = [];
      }

      // Export pets
      try {
        // Check if pets table exists first
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'pets'
          )`
        );

        if (tableExists.rows[0].exists) {
          const petsResult = await client.query(
            `SELECT p.* FROM pets p
             JOIN residents r ON p.resident_id = r.id
             WHERE r.barangay_id = $1`,
            [barangayId]
          );
          dataToExport.pets = petsResult.rows;
        } else {
          logger.info("Pets table does not exist, skipping pets export");
          dataToExport.pets = [];
        }
      } catch (error) {
        logger.warn("Could not export pets data:", error.message);
        dataToExport.pets = [];
      }

      // Export archives
      try {
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'archives'
          )`
        );

        if (tableExists.rows[0].exists) {
          const archivesResult = await client.query(
            "SELECT * FROM archives WHERE barangay_id = $1",
            [barangayId]
          );
          dataToExport.archives = archivesResult.rows;
        } else {
          logger.info("Archives table does not exist, skipping export");
          dataToExport.archives = [];
        }
      } catch (error) {
        logger.warn("Could not export archives data:", error.message);
        dataToExport.archives = [];
      }

      // Export inventories
      try {
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'inventories'
          )`
        );

        if (tableExists.rows[0].exists) {
          const inventoriesResult = await client.query(
            "SELECT * FROM inventories WHERE barangay_id = $1",
            [barangayId]
          );
          dataToExport.inventories = inventoriesResult.rows;
        } else {
          logger.info("Inventories table does not exist, skipping export");
          dataToExport.inventories = [];
        }
      } catch (error) {
        logger.warn("Could not export inventories data:", error.message);
        dataToExport.inventories = [];
      }

      // Export requests
      try {
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'requests'
          )`
        );

        if (tableExists.rows[0].exists) {
          const requestsResult = await client.query(
            `SELECT req.* FROM requests req
             JOIN residents r ON req.resident_id = r.id
             WHERE r.barangay_id = $1`,
            [barangayId]
          );
          dataToExport.requests = requestsResult.rows;
        } else {
          logger.info("Requests table does not exist, skipping export");
          dataToExport.requests = [];
        }
      } catch (error) {
        logger.warn("Could not export requests data:", error.message);
        dataToExport.requests = [];
      }

      // Export vaccines
      try {
        const tableExists = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'vaccines'
          )`
        );

        if (tableExists.rows[0].exists) {
          const vaccinesResult = await client.query(
            `SELECT v.* FROM vaccines v
             JOIN residents r ON v.resident_id = r.id
             WHERE r.barangay_id = $1`,
            [barangayId]
          );
          dataToExport.vaccines = vaccinesResult.rows;
        } else {
          logger.info("Vaccines table does not exist, skipping export");
          dataToExport.vaccines = [];
        }
      } catch (error) {
        logger.warn("Could not export vaccines data:", error.message);
        dataToExport.vaccines = [];
      }

      // Create Excel workbook in memory
      logger.info("Starting Excel workbook creation...");
      let excelBuffer;
      try {
        const workbook = XLSX.default.utils.book_new();

        // Helper function to format sheet data
        const formatSheetData = (data, sheetName) => {
          if (!data || data.length === 0) return null;

          try {
            // Convert data to sheet
            const sheet = XLSX.default.utils.json_to_sheet(data);

            // Auto-size columns
            const colWidths = [];
            const headers = Object.keys(data[0] || {});

            headers.forEach((header, index) => {
              const maxLength = Math.max(
                header.length,
                ...data.map((row) => String(row[header] || "").length)
              );
              colWidths[index] = Math.min(Math.max(maxLength + 2, 10), 50);
            });

            sheet["!cols"] = colWidths.map((width) => ({ width }));

            return sheet;
          } catch (error) {
            logger.error(`Error formatting sheet ${sheetName}:`, error.message);
            return null;
          }
        };

        // Add worksheets for each data type
        if (dataToExport.barangay) {
          const barangaySheet = formatSheetData(
            [dataToExport.barangay],
            "Barangay Info"
          );
          if (barangaySheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              barangaySheet,
              "Barangay Info"
            );
          }
        }

        if (dataToExport.residents && dataToExport.residents.length > 0) {
          const residentsSheet = formatSheetData(
            dataToExport.residents,
            "Residents"
          );
          if (residentsSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              residentsSheet,
              "Residents"
            );
          }
        }

        if (
          dataToExport.resident_classifications &&
          dataToExport.resident_classifications.length > 0
        ) {
          const classificationsSheet = formatSheetData(
            dataToExport.resident_classifications,
            "Classifications"
          );
          if (classificationsSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              classificationsSheet,
              "Classifications"
            );
          }
        }

        if (dataToExport.households && dataToExport.households.length > 0) {
          const householdsSheet = formatSheetData(
            dataToExport.households,
            "Households"
          );
          if (householdsSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              householdsSheet,
              "Households"
            );
          }
        }

        if (dataToExport.families && dataToExport.families.length > 0) {
          const familiesSheet = formatSheetData(
            dataToExport.families,
            "Families"
          );
          if (familiesSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              familiesSheet,
              "Families"
            );
          }
        }

        if (
          dataToExport.family_members &&
          dataToExport.family_members.length > 0
        ) {
          const familyMembersSheet = formatSheetData(
            dataToExport.family_members,
            "Family Members"
          );
          if (familyMembersSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              familyMembersSheet,
              "Family Members"
            );
          }
        }

        if (dataToExport.officials && dataToExport.officials.length > 0) {
          const officialsSheet = formatSheetData(
            dataToExport.officials,
            "Officials"
          );
          if (officialsSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              officialsSheet,
              "Officials"
            );
          }
        }

        if (dataToExport.pets && dataToExport.pets.length > 0) {
          const petsSheet = formatSheetData(dataToExport.pets, "Pets");
          if (petsSheet) {
            XLSX.default.utils.book_append_sheet(workbook, petsSheet, "Pets");
          }
        }

        if (dataToExport.vaccines && dataToExport.vaccines.length > 0) {
          const vaccinesSheet = formatSheetData(
            dataToExport.vaccines,
            "Vaccines"
          );
          if (vaccinesSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              vaccinesSheet,
              "Vaccines"
            );
          }
        }

        if (dataToExport.archives && dataToExport.archives.length > 0) {
          const archivesSheet = formatSheetData(
            dataToExport.archives,
            "Archives"
          );
          if (archivesSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              archivesSheet,
              "Archives"
            );
          }
        }

        if (dataToExport.inventories && dataToExport.inventories.length > 0) {
          const inventoriesSheet = formatSheetData(
            dataToExport.inventories,
            "Inventories"
          );
          if (inventoriesSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              inventoriesSheet,
              "Inventories"
            );
          }
        }

        if (dataToExport.requests && dataToExport.requests.length > 0) {
          const requestsSheet = formatSheetData(
            dataToExport.requests,
            "Requests"
          );
          if (requestsSheet) {
            XLSX.default.utils.book_append_sheet(
              workbook,
              requestsSheet,
              "Requests"
            );
          }
        }

        // Add summary sheet
        const summaryData = [
          {
            "Data Type": "Barangay Information",
            Records: dataToExport.barangay ? 1 : 0,
            Status: dataToExport.barangay ? "✓ Included" : "✗ No Data",
          },

          {
            "Data Type": "Residents",
            Records: dataToExport.residents ? dataToExport.residents.length : 0,
            Status:
              dataToExport.residents && dataToExport.residents.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Resident Classifications",
            Records: dataToExport.resident_classifications
              ? dataToExport.resident_classifications.length
              : 0,
            Status:
              dataToExport.resident_classifications &&
              dataToExport.resident_classifications.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Households",
            Records: dataToExport.households
              ? dataToExport.households.length
              : 0,
            Status:
              dataToExport.households && dataToExport.households.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Families",
            Records: dataToExport.families ? dataToExport.families.length : 0,
            Status:
              dataToExport.families && dataToExport.families.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Family Members",
            Records: dataToExport.family_members
              ? dataToExport.family_members.length
              : 0,
            Status:
              dataToExport.family_members &&
              dataToExport.family_members.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Officials",
            Records: dataToExport.officials ? dataToExport.officials.length : 0,
            Status:
              dataToExport.officials && dataToExport.officials.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Pets",
            Records: dataToExport.pets ? dataToExport.pets.length : 0,
            Status:
              dataToExport.pets && dataToExport.pets.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Vaccines",
            Records: dataToExport.vaccines ? dataToExport.vaccines.length : 0,
            Status:
              dataToExport.vaccines && dataToExport.vaccines.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Archives",
            Records: dataToExport.archives ? dataToExport.archives.length : 0,
            Status:
              dataToExport.archives && dataToExport.archives.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Inventories",
            Records: dataToExport.inventories
              ? dataToExport.inventories.length
              : 0,
            Status:
              dataToExport.inventories && dataToExport.inventories.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
          {
            "Data Type": "Requests",
            Records: dataToExport.requests ? dataToExport.requests.length : 0,
            Status:
              dataToExport.requests && dataToExport.requests.length > 0
                ? "✓ Included"
                : "✗ No Data",
          },
        ];

        const summarySheet = formatSheetData(summaryData, "Summary");
        if (summarySheet) {
          XLSX.default.utils.book_append_sheet(
            workbook,
            summarySheet,
            "Summary"
          );
        }

        // Write Excel file to buffer
        logger.info("Writing Excel file to buffer...");
        excelBuffer = XLSX.default.write(workbook, {
          type: "buffer",
          bookType: "xlsx",
        });
        logger.info("Excel file written to buffer");
      } catch (error) {
        logger.error("Error creating Excel workbook:", error.message);
        throw error;
      }

      // Create ZIP archive in memory
      logger.info("Creating ZIP archive in memory...");
      const archive = archiver.default("zip", { zlib: { level: 9 } });

      // We'll collect the ZIP data in a buffer
      const zipChunks = [];
      archive.on("data", (chunk) => zipChunks.push(chunk));

      // Add the Excel file as a virtual file
      archive.append(excelBuffer, { name: "barangay_data.xlsx" });

      // Add uploaded files if they exist
      try {
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (fs.existsSync(uploadsDir)) {
          archive.directory(uploadsDir, "uploads");
        }
      } catch (error) {
        logger.warn(
          "Could not add uploads directory to archive:",
          error.message
        );
      }

      // Finalize and collect the ZIP buffer
      await archive.finalize();

      await new Promise((resolve, reject) => {
        archive.on("end", resolve);
        archive.on("error", reject);
      });

      const zipBuffer = Buffer.concat(zipChunks);

      return zipBuffer;
    } catch (error) {
      logger.error("Failed to export barangay data:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async exportResidents(barangayId, filters = {}) {
    const client = await pool.connect();
    try {
      // Import required modules for Excel creation
      const XLSX = await import("xlsx");

      // Build the WHERE clause based on filters
      let whereConditions = ["r.barangay_id = $1", "r.status = 'active'"];
      let queryParams = [barangayId];
      let paramIndex = 2;

      // Add search filter
      if (filters.search) {
        whereConditions.push(`(
          LOWER(r.first_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(r.last_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(r.middle_name) LIKE LOWER($${paramIndex}) OR
          LOWER(r.contact_number) LIKE LOWER($${paramIndex})
        )`);
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Add classification filter
      if (filters.classificationType && filters.classificationType !== "all") {
        whereConditions.push(`EXISTS (
          SELECT 1 FROM resident_classifications rc 
          WHERE rc.resident_id = r.id 
          AND rc.classification_type = $${paramIndex}
        )`);
        queryParams.push(filters.classificationType);
        paramIndex++;
      }

      const whereClause = whereConditions.join(" AND ");

      // Export residents data with joined barangay information
      const residentsResult = await client.query(
        `SELECT 
          r.id,
          r.last_name,
          r.first_name,
          r.middle_name,
          r.extension_name,
          r.sex,
          r.civil_status,
          r.birthdate,
          r.birth_region,
          r.contact_number,
          r.email,
          r.occupation,
          r.monthly_income,
          r.employment_status,
          r.education_attainment,
          r.status,
          r.picture_path,
          r.indigenous_person,
          b.barangay_name,
          h.house_number,
          h.street,
          CASE 
            WHEN h.house_number IS NOT NULL AND h.street IS NOT NULL 
            THEN h.house_number || ' ' || h.street
            WHEN h.house_number IS NOT NULL 
            THEN h.house_number
            WHEN h.street IS NOT NULL 
            THEN h.street
            ELSE ''
          END as full_address
        FROM residents r
        LEFT JOIN barangays b ON r.barangay_id = b.id
        LEFT JOIN (
          -- Get household info for house heads
          SELECT r.id as resident_id, h.id, h.house_number, h.street
          FROM residents r
          JOIN households h ON h.house_head = r.id
          UNION
          -- Get household info for family heads
          SELECT r.id as resident_id, h.id, h.house_number, h.street
          FROM residents r
          JOIN families f ON f.family_head = r.id
          JOIN households h ON h.id = f.household_id
          UNION
          -- Get household info for family members
          SELECT r.id as resident_id, h.id, h.house_number, h.street
          FROM residents r
          JOIN family_members fm ON fm.family_member = r.id
          JOIN families f ON f.id = fm.family_id
          JOIN households h ON h.id = f.household_id
        ) h ON h.resident_id = r.id
        WHERE ${whereClause}
        ORDER BY r.last_name, r.first_name`,
        queryParams
      );

      // Export resident classifications with the same filters
      const classificationsResult = await client.query(
        `SELECT 
          rc.id,
          rc.classification_type,
          rc.classification_details,
          r.first_name,
          r.last_name,
          b.barangay_name
         FROM resident_classifications rc
         JOIN residents r ON rc.resident_id = r.id
         LEFT JOIN barangays b ON r.barangay_id = b.id
         LEFT JOIN family_members fm ON r.id = fm.family_member
         LEFT JOIN families f ON fm.family_id = f.id
         LEFT JOIN households h ON f.household_id = h.id OR r.id = h.house_head
         WHERE ${whereClause}
         ORDER BY r.last_name, r.first_name`,
        queryParams
      );

      // Create Excel workbook
      const workbook = XLSX.default.utils.book_new();

      // Extract barangay name from query results (used in empty-sheet fallback)
      const barangayName = residentsResult.rows[0]?.barangay_name || 
                           classificationsResult.rows[0]?.barangay_name || 
                           'Unknown';

      // Process residents data for export
      if (residentsResult.rows.length > 0) {
        const processedResidents = residentsResult.rows.map((resident) => ({
          Barangay: resident.barangay_name,
          "House Number": resident.house_number || "",
          Street: resident.street || "",
          "Resident ID": resident.id,
          "Last Name": resident.last_name,
          "First Name": resident.first_name,
          "Middle Name": resident.middle_name || "",
          Suffix: resident.extension_name || "",
          Sex: resident.sex,
          "Civil Status": resident.civil_status,
          "Birth Date": resident.birthdate,
          "Birth Place": resident.birth_region || "",
          "Contact Number": resident.contact_number || "",
          Email: resident.email || "",
          Occupation: resident.occupation || "",
          "Monthly Income": resident.monthly_income || "",
          "Employment Status": resident.employment_status || "",
          "Education Attainment": resident.education_attainment || "",
          "Resident Status": resident.status,
          "Indigenous Person": resident.indigenous_person ? "Yes" : "No",
        }));

        const residentsSheet =
          XLSX.default.utils.json_to_sheet(processedResidents);
        XLSX.default.utils.book_append_sheet(
          workbook,
          residentsSheet,
          "Residents"
        );
      }

      // Process classifications data for export
      if (classificationsResult.rows.length > 0) {
        const processedClassifications = classificationsResult.rows.map(
          (classification) => ({
            "Classification ID": classification.id,
            "Classification Type": classification.classification_type,
            "Classification Details": JSON.stringify(
              classification.classification_details
            ),
            "Resident First Name": classification.first_name,
            "Resident Last Name": classification.last_name,
            Barangay: classification.barangay_name,
          })
        );

        const classificationsSheet = XLSX.default.utils.json_to_sheet(
          processedClassifications
        );
        XLSX.default.utils.book_append_sheet(
          workbook,
          classificationsSheet,
          "Classifications"
        );
      }

      // Check if workbook has any sheets
      if (workbook.SheetNames.length === 0) {
        // Create a default sheet with no data message
        const noDataSheet = XLSX.default.utils.aoa_to_sheet([
          ["BIMS - Residents Export"],
          ["Barangay: " + (barangayName || "Unknown")],
          ["Export Date: " + new Date().toLocaleDateString('en-US')],
          ["Export Time: " + new Date().toLocaleTimeString('en-US')],
          [""],
          ["No Data Available"],
          ["This barangay has no residents to export."],
          [""],
          ["Note: This is a valid Excel file with no data content."]
        ]);
        
        // Set column widths
        noDataSheet['!cols'] = [
          { width: 30 },
          { width: 20 }
        ];
        
        XLSX.default.utils.book_append_sheet(workbook, noDataSheet, "Residents");
      }

      // Write Excel file to buffer (in-memory, no temp file)
      const excelBuffer = XLSX.default.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
        compression: true,
        bookSST: false,
        cellStyles: true
      });

      // Validate the buffer
      if (!excelBuffer || excelBuffer.length === 0) {
        throw new Error("Failed to generate Excel file buffer");
      }

      return excelBuffer;
    } catch (error) {
      logger.error("Failed to export residents data:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async importResidents(barangayId, filePath) {
    const client = await pool.connect();
    try {
      // Import required modules
      const XLSX = await import("xlsx");
      const fs = await import("fs");

      // Read the Excel file
      const workbook = XLSX.default.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.default.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new ApiError(400, "No data found in the Excel file");
      }

      if (data.length > 1000) {
        throw new ApiError(400, "Maximum 1000 residents allowed per import");
      }

      let importedCount = 0;
      let errors = [];

      await client.query("BEGIN");

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Validate required fields
          if (
            !row.first_name ||
            !row.last_name ||
            !row.birth_date ||
            !row.gender ||
            !row.civil_status
          ) {
            errors.push(
              `Row ${
                i + 2
              }: Missing required fields (first_name, last_name, birth_date, gender, civil_status)`
            );
            continue;
          }

          // Validate date format
          const birthDate = new Date(row.birth_date);
          if (isNaN(birthDate.getTime())) {
            errors.push(
              `Row ${i + 2}: Invalid birth_date format. Use YYYY-MM-DD`
            );
            continue;
          }

          // Validate gender
          if (!["male", "female"].includes(row.gender?.toLowerCase())) {
            errors.push(
              `Row ${i + 2}: Invalid gender. Must be 'male' or 'female'`
            );
            continue;
          }

          // Validate civil status
          const validCivilStatus = [
            "single",
            "married",
            "widowed",
            "divorced",
            "separated",
          ];
          if (!validCivilStatus.includes(row.civil_status?.toLowerCase())) {
            errors.push(
              `Row ${
                i + 2
              }: Invalid civil_status. Must be one of: ${validCivilStatus.join(
                ", "
              )}`
            );
            continue;
          }

          // Generate resident ID
          const currentYear = new Date().getFullYear();
          const prefixResult = await client.query("SELECT prefix FROM resident_counters WHERE year = $1", [currentYear]);
          const prefix = prefixResult.rows[0]?.prefix?.trim() || "BRGN";
          
          // Get next counter value
          const counterResult = await client.query(
            `INSERT INTO resident_counters (year, counter, prefix) 
             VALUES ($1, 1, $2) 
             ON CONFLICT (year) 
             DO UPDATE SET counter = resident_counters.counter + 1 
             RETURNING counter`,
            [currentYear, prefix]
          );
          
          const nextId = String(counterResult.rows[0].counter).padStart(7, "0");
          const residentId = `${prefix}-${currentYear}-${nextId}`;

          // Validate employment status (case-insensitive)
          if (row.employment_status && !["employed", "unemployed", "self-employed", "student", "retired", "not_applicable"].includes(row.employment_status?.toLowerCase())) {
            errors.push(
              `Row ${i + 2}: Invalid employment_status. Must be one of: employed, unemployed, self-employed, student, retired, not_applicable`
            );
            continue;
          }

          // Insert resident
          const result = await client.query(
            `INSERT INTO residents (
              id, barangay_id, first_name, last_name, middle_name, extension_name,
              birthdate, birth_region, sex, civil_status, contact_number,
              email, occupation, employment_status, education_attainment, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
            RETURNING id`,
            [
              residentId,
              barangayId,
              row.first_name,
              row.last_name,
              row.middle_name || null,
              row.extension_name || null,
              row.birth_date,
              row.birth_region || row.birth_place || null,
              row.gender?.toLowerCase(),
              row.civil_status?.toLowerCase(),
              row.contact_number || null,
              row.email || null,
              row.occupation || null,
              row.employment_status?.toLowerCase() || null,
              row.educational_attainment || null,
            ]
          );

          importedCount++;
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        await client.query("ROLLBACK");
        throw new ApiError(
          400,
          `Import completed with errors: ${errors.join("; ")}`
        );
      }

      await client.query("COMMIT");

      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        logger.warn("Could not delete uploaded file:", error.message);
      }

      return {
        importedCount,
        totalRows: data.length,
        errors: errors.length > 0 ? errors : null,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to import residents:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async exportHouseholds(barangayId, filters = {}) {
    const client = await pool.connect();
    try {
      // Import required modules for Excel creation
      const XLSX = await import("xlsx");

      // Build the WHERE clause based on filters
      let whereConditions = ["h.barangay_id = $1"];
      let queryParams = [barangayId];
      let paramIndex = 2;

      // Add search filter
      if (filters.search) {
        whereConditions.push(`(
          LOWER(r.first_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(r.last_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(h.house_number) LIKE LOWER($${paramIndex}) OR
          LOWER(h.street) LIKE LOWER($${paramIndex})
        )`);
        queryParams.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(" AND ");

      // Export households data with family members
      const householdsResult = await client.query(
        `SELECT 
          h.id as household_id,
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
          b.barangay_name,
          -- House head information
          r_house_head.first_name as house_head_first_name,
          r_house_head.last_name as house_head_last_name,
          r_house_head.contact_number as house_head_contact,
          r_house_head.email as house_head_email,
          r_house_head.sex as house_head_sex,
          r_house_head.civil_status as house_head_civil_status,
          r_house_head.birthdate as house_head_birthdate,
          r_house_head.occupation as house_head_occupation,
          r_house_head.education_attainment as house_head_education,
          r_house_head.employment_status as house_head_employment,
          r_house_head.monthly_income as house_head_income,
          -- Family information
          f.id as family_id,
          f.family_group,
          f.family_head as family_head_id,
          -- Family head information
          r_family_head.first_name as family_head_first_name,
          r_family_head.last_name as family_head_last_name,
          r_family_head.contact_number as family_head_contact,
          r_family_head.email as family_head_email,
          r_family_head.monthly_income as family_head_income,
          -- Family member information
          r_member.id as member_id,
          r_member.first_name as member_first_name,
          r_member.last_name as member_last_name,
          r_member.sex as member_sex,
          r_member.civil_status as member_civil_status,
          r_member.birthdate as member_birthdate,
          r_member.occupation as member_occupation,
          r_member.education_attainment as member_education,
          r_member.employment_status as member_employment,
          r_member.monthly_income as member_income,
          r_member.contact_number as member_contact,
          r_member.email as member_email,
          fm.relationship_to_head,
          -- Calculate accurate total household income (sum of unique resident incomes)
          (
            SELECT COALESCE(SUM(DISTINCT r_income.monthly_income), 0)
            FROM (
              -- Get house head income
              SELECT r_house.monthly_income
              FROM residents r_house
              WHERE r_house.id = h.house_head AND r_house.status = 'active'
              UNION
              -- Get family head incomes
              SELECT r_fam.monthly_income
              FROM families fam
              JOIN residents r_fam ON fam.family_head = r_fam.id
              WHERE fam.household_id = h.id AND r_fam.status = 'active'
              UNION
              -- Get family member incomes
              SELECT r_mem.monthly_income
              FROM families fam2
              JOIN family_members fm2 ON fam2.id = fm2.family_id
              JOIN residents r_mem ON fm2.family_member = r_mem.id
              WHERE fam2.household_id = h.id AND r_mem.status = 'active'
            ) r_income
            WHERE r_income.monthly_income IS NOT NULL
          ) as total_household_income,
          CASE 
            WHEN h.house_number IS NOT NULL AND h.street IS NOT NULL 
            THEN h.house_number || ' ' || h.street
            WHEN h.house_number IS NOT NULL 
            THEN h.house_number
            WHEN h.street IS NOT NULL 
            THEN h.street
            ELSE ''
          END as full_address
        FROM households h
        LEFT JOIN barangays b ON h.barangay_id = b.id
        LEFT JOIN residents r_house_head ON h.house_head = r_house_head.id
        LEFT JOIN families f ON f.household_id = h.id
        LEFT JOIN residents r_family_head ON f.family_head = r_family_head.id
        LEFT JOIN family_members fm ON fm.family_id = f.id
         LEFT JOIN residents r_member ON fm.family_member = r_member.id
         WHERE ${whereClause}
         ORDER BY h.house_number, h.street, f.family_group, r_member.last_name, r_member.first_name`,
        queryParams
      );

      // Create Excel workbook
      const workbook = XLSX.default.utils.book_new();

      // Extract barangay name from query results (used in empty-sheet fallback)
      const barangayName = householdsResult.rows[0]?.barangay_name || 'Unknown';

      // Create a single sheet with all households (purok no longer exists in v2)
      const allHouseholds = householdsResult.rows;

      // Process data to include family members
      const processedRows = [];
      const processedFamilies = new Set(); // Track processed families to avoid duplicates
      const processedHouseholds = new Set(); // Track processed households to avoid duplicating house head and address

      allHouseholds.forEach((row) => {
          const familyKey = `${row.household_id}-${row.family_id}`;
          const householdKey = `${row.household_id}`;

          // Add family head as first row for each family
          if (!processedFamilies.has(familyKey)) {
            processedFamilies.add(familyKey);

            processedRows.push({
              // Basic Information (no purok column for barangay export)
              Address: processedHouseholds.has(householdKey)
                ? ""
                : row.full_address || "",
              "House Head Name": processedHouseholds.has(householdKey)
                ? ""
                : `${row.house_head_first_name || ""} ${
                    row.house_head_last_name || ""
                  }`.trim(),
              Group: row.family_group || "",
              "Household Resident Name (Family Member)": `${
                row.family_head_first_name || ""
              } ${row.family_head_last_name || ""}`.trim(),
              Contact: processedHouseholds.has(householdKey)
                ? ""
                : `${row.house_head_contact || ""}${
                    row.house_head_email ? ` / ${row.house_head_email}` : ""
                  }`,
              "Household Monthly Income": processedHouseholds.has(householdKey)
                ? ""
                : row.total_household_income || "",
              "Relationship to Head": "Family Head",
            });

            // Mark this household as processed
            processedHouseholds.add(householdKey);
          }

          // Add family members (excluding family head to avoid duplication)
          if (row.member_id && row.member_id !== row.family_head_id) {
            processedRows.push({
              // Basic Information (no purok column for barangay export)
              Address: "", // Empty to avoid duplication
              "House Head Name": "", // Empty to avoid duplication
              Group: "", // Empty to avoid duplication
              "Household Resident Name": `${row.member_first_name || ""} ${
                row.member_last_name || ""
              }`.trim(),
              Contact: "", // Empty - contact only for house head
              "Household Monthly Income": "", // Empty - income only for house head
              "Relationship to Head": row.relationship_to_head || "",
            });
          }
        });

        const householdsSheet = XLSX.default.utils.json_to_sheet(processedRows);

        // Set column widths for better readability
        const columnWidths = [
          { wch: 30 }, // Address
          { wch: 25 }, // House Head Name
          { wch: 15 }, // Group
          { wch: 30 }, // Household Resident Name (Family Member)
          { wch: 25 }, // Contact
          { wch: 20 }, // Household Monthly Income
          { wch: 20 }, // Relationship to Head
        ];

        householdsSheet["!cols"] = columnWidths;

        // Create sheet name (sanitize for Excel)
        const sheetName = "Households";
        XLSX.default.utils.book_append_sheet(
          workbook,
          householdsSheet,
          sheetName
        );

      // Check if workbook has any sheets
      if (workbook.SheetNames.length === 0) {
        // Create a default sheet with no data message
        const noDataSheet = XLSX.default.utils.aoa_to_sheet([
          ["BIMS - Households Export"],
          ["Barangay: " + (barangayName || "Unknown")],
          ["Export Date: " + new Date().toLocaleDateString('en-US')],
          ["Export Time: " + new Date().toLocaleTimeString('en-US')],
          [""],
          ["No Data Available"],
          ["This barangay has no households to export."],
          [""],
          ["Note: This is a valid Excel file with no data content."]
        ]);
        
        // Set column widths
        noDataSheet['!cols'] = [
          { width: 30 },
          { width: 20 }
        ];
        
        XLSX.default.utils.book_append_sheet(workbook, noDataSheet, "Households");
      }

      // Write Excel file to buffer (in-memory, no temp file)
      const excelBuffer = XLSX.default.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
        compression: true,
        bookSST: false,
        cellStyles: true
      });

      // Validate the buffer
      if (!excelBuffer || excelBuffer.length === 0) {
        throw new Error("Failed to generate Excel file buffer");
      }

      return excelBuffer;
    } catch (error) {
      logger.error("Failed to export households data:", error);
      if (error.code === "42P01") {
        throw new ApiError(
          500,
          "Database table not found. Please check if all required tables exist."
        );
      } else if (error.code === "42703") {
        throw new ApiError(
          500,
          "Database column not found. Please check if the database schema is correct."
        );
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  }

  static async importHouseholds(barangayId, filePath) {
    const client = await pool.connect();
    try {
      // Import required modules
      const XLSX = await import("xlsx");
      const fs = await import("fs");

      // Read the Excel file
      const workbook = XLSX.default.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.default.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new ApiError(400, "No data found in the Excel file");
      }

      if (data.length > 500) {
        throw new ApiError(400, "Maximum 500 households allowed per import");
      }

      let importedCount = 0;
      let errors = [];

      await client.query("BEGIN");

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          // Validate required fields
          if (
            !row.house_number ||
            !row.house_head_name ||
            !row.street
          ) {
            errors.push(
              `Row ${
                i + 2
              }: Missing required fields (house_number, house_head_name, street)`
            );
            continue;
          }

          // Check if household number already exists
          const existingHousehold = await client.query(
            "SELECT id FROM households WHERE house_number = $1 AND barangay_id = $2",
            [row.house_number, barangayId]
          );

          if (existingHousehold.rows.length > 0) {
            errors.push(
              `Row ${i + 2}: Household number ${
                row.house_number
              } already exists`
            );
            continue;
          }

          // Find resident by name (house head) - use JavaScript for better name matching
          const allResidents = await client.query(
            `SELECT id, first_name, last_name, middle_name, extension_name
             FROM residents
             WHERE barangay_id = $1 AND status = 'active'`,
            [barangayId]
          );

          // Try to find matching resident by name
          let houseHeadId = null;
          const searchName = row.house_head_name.trim().toLowerCase();
          
          for (const resident of allResidents.rows) {
            const fullName = [
              resident.first_name,
              resident.middle_name,
              resident.last_name,
              resident.extension_name
            ].filter(Boolean).join(' ').toLowerCase();
            
            const nameWithInitial = [
              resident.first_name,
              resident.middle_name ? resident.middle_name.charAt(0) + '.' : null,
              resident.last_name,
              resident.extension_name
            ].filter(Boolean).join(' ').toLowerCase();
            
            const nameOnly = [
              resident.first_name,
              resident.last_name,
              resident.extension_name
            ].filter(Boolean).join(' ').toLowerCase();
            
            const lastNameFirst = [
              resident.last_name,
              resident.first_name,
              resident.middle_name,
              resident.extension_name
            ].filter(Boolean).join(', ').toLowerCase();

            if (fullName === searchName ||
                nameWithInitial === searchName ||
                nameOnly === searchName ||
                lastNameFirst === searchName) {
              houseHeadId = resident.id;
              break;
            }
          }

          if (!houseHeadId) {
            errors.push(
              `Row ${i + 2}: House head "${
                row.house_head_name
              }" not found in residents. Please add the resident first.`
            );
            continue;
          }

          // Insert household with resident ID
          const householdResult = await client.query(
            `INSERT INTO households (
              barangay_id, house_number, house_head, street,
              housing_type, electricity, water_source, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING id`,
            [
              barangayId,
              row.house_number,
              houseHeadId,
              row.street,
              row.housing_type || null,
              row.electricity === 'Yes' ? true : (row.electricity === 'No' ? false : null),
              row.water_source || null,
            ]
          );

          const householdId = householdResult.rows[0].id;

          // Create default family for the household
          const familyResult = await client.query(
            `INSERT INTO families (
              household_id, family_group, family_head, created_at, updated_at
            ) VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING id`,
            [
              householdId,
              `F${row.house_number}`, // Default family group
              houseHeadId, // Family head is the same as house head
            ]
          );

          const familyId = familyResult.rows[0].id;

          // Add house head as family member
          await client.query(
            `INSERT INTO family_members (
              family_id, family_member, relationship_to_head
            ) VALUES ($1, $2, $3)`,
            [familyId, houseHeadId, "Head"]
          );

          // Handle additional family members if provided
          if (row.family_members) {
            const familyMembers = row.family_members
              .split(";")
              .map((member) => member.trim());

            for (const memberInfo of familyMembers) {
              if (!memberInfo) continue;

              // Expected format: "Name:Relationship" or just "Name"
              const [memberName, relationship = "Member"] = memberInfo
                .split(":")
                .map((s) => s.trim());

              // Get all residents and match by name in JavaScript for better flexibility
              const allResidents = await client.query(
                `SELECT id, first_name, last_name, middle_name, extension_name
                 FROM residents
                 WHERE barangay_id = $1 AND status = 'active'`,
                [barangayId]
              );

              // Try to find matching resident by name
              let memberId = null;
              for (const resident of allResidents.rows) {
                const fullName = [
                  resident.first_name,
                  resident.middle_name,
                  resident.last_name,
                  resident.extension_name
                ].filter(Boolean).join(' ').toLowerCase();
                
                const nameWithInitial = [
                  resident.first_name,
                  resident.middle_name ? resident.middle_name.charAt(0) + '.' : null,
                  resident.last_name,
                  resident.extension_name
                ].filter(Boolean).join(' ').toLowerCase();
                
                const nameOnly = [
                  resident.first_name,
                  resident.last_name,
                  resident.extension_name
                ].filter(Boolean).join(' ').toLowerCase();
                
                const lastNameFirst = [
                  resident.last_name,
                  resident.first_name,
                  resident.middle_name,
                  resident.extension_name
                ].filter(Boolean).join(', ').toLowerCase();
                
                const searchName = memberName.toLowerCase();
                
                if (fullName === searchName || 
                    nameWithInitial === searchName || 
                    nameOnly === searchName || 
                    lastNameFirst === searchName) {
                  memberId = resident.id;
                  break;
                }
              }

              if (memberId) {

                // Check if member is already in this family
                const existingMember = await client.query(
                  `SELECT id FROM family_members 
                   WHERE family_id = $1 AND family_member = $2`,
                  [familyId, memberId]
                );

                if (existingMember.rows.length === 0) {
                  await client.query(
                    `INSERT INTO family_members (
                      family_id, family_member, relationship_to_head
                    ) VALUES ($1, $2, $3)`,
                    [familyId, memberId, relationship]
                  );
                }
              } else {
                errors.push(
                  `Row ${
                    i + 2
                  }: Family member "${memberName}" not found in residents. Please add the resident first.`
                );
              }
            }
          }

          importedCount++;
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        await client.query("ROLLBACK");
        throw new ApiError(
          400,
          `Import completed with errors: ${errors.join("; ")}`
        );
      }

      await client.query("COMMIT");

      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        logger.warn("Could not delete uploaded file:", error.message);
      }

      return {
        importedCount,
        totalRows: data.length,
        errors: errors.length > 0 ? errors : null,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to import households:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Barangay;
