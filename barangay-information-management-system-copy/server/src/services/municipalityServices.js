import fs from "fs/promises";
import path from "path";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import {
  UPDATE_MUNICIPALITY,
  MUNICIPALITY_INFORMATION,
  MUNICIPALITY_INFORMATION_BY_ID,
} from "../queries/municipality.queries.js";
import { ApiError } from "../utils/apiError.js";

class Municipality {
  static async updateMunicipality({
    municipalityId,
    municipalityName,
    municipalityCode,
    region,
    province,
    description,
    gisCode,
    municipalityLogoPath,
    idBackgroundFrontPath,
    idBackgroundBackPath,
    removeMunicipalityLogoPath = false,
    removeIdBackgroundFrontPath = false,
    removeIdBackgroundBackPath = false,
  }) {
    const client = await pool.connect();
    console.log(municipalityId, municipalityName, municipalityCode, region, province, description, gisCode, municipalityLogoPath, idBackgroundFrontPath, idBackgroundBackPath);
    try {
      await client.query("BEGIN");
      const { rows: checkResult } = await client.query(
        "SELECT municipality_logo_path, id_background_front_path, id_background_back_path FROM municipalities WHERE id = $1",
        [municipalityId]
      );

      if (checkResult.length === 0) {
        logger.info(`No existing municipality with id ${municipalityId}`);
        throw new Error(`No municipality found with id ${municipalityId}`);
      }

      const oldLogoPath = checkResult[0]?.municipality_logo_path;
      const oldIdBackgroundFrontPath = checkResult[0]?.id_background_front_path;
      const oldIdBackgroundBackPath = checkResult[0]?.id_background_back_path;

      // Handle image paths - consider removal flags
      let finalLogoPath = oldLogoPath;
      let finalIdBackgroundFrontPath = oldIdBackgroundFrontPath;
      let finalIdBackgroundBackPath = oldIdBackgroundBackPath;

      // Set new paths if provided
      if (municipalityLogoPath) {
        finalLogoPath = municipalityLogoPath;
      } else if (removeMunicipalityLogoPath) {
        finalLogoPath = null;
      }

      if (idBackgroundFrontPath) {
        finalIdBackgroundFrontPath = idBackgroundFrontPath;
      } else if (removeIdBackgroundFrontPath) {
        finalIdBackgroundFrontPath = null;
      }

      if (idBackgroundBackPath) {
        finalIdBackgroundBackPath = idBackgroundBackPath;
      } else if (removeIdBackgroundBackPath) {
        finalIdBackgroundBackPath = null;
      }

      const { rows: updateResult } = await client.query(UPDATE_MUNICIPALITY, [
        municipalityId,
        municipalityName,
        municipalityCode,
        region,
        province,
        description,
        gisCode,
        finalLogoPath,
        finalIdBackgroundFrontPath,
        finalIdBackgroundBackPath,
      ]);

      if (!updateResult || updateResult.length === 0 || !updateResult[0]?.id) {
        logger.error("Failed to update municipality");
        throw new Error("Failed to update municipality");
      }

      const pathToDelete = [];

      // Delete old files if new files are provided or if images are being removed
      if (
        (municipalityLogoPath && oldLogoPath && oldLogoPath !== municipalityLogoPath) ||
        (removeMunicipalityLogoPath && oldLogoPath)
      ) {
        pathToDelete.push(oldLogoPath);
      }
      if (
        (idBackgroundFrontPath && oldIdBackgroundFrontPath && oldIdBackgroundFrontPath !== idBackgroundFrontPath) ||
        (removeIdBackgroundFrontPath && oldIdBackgroundFrontPath)
      ) {
        pathToDelete.push(oldIdBackgroundFrontPath);
      }
      if (
        (idBackgroundBackPath && oldIdBackgroundBackPath && oldIdBackgroundBackPath !== idBackgroundBackPath) ||
        (removeIdBackgroundBackPath && oldIdBackgroundBackPath)
      ) {
        pathToDelete.push(oldIdBackgroundBackPath);
      }

      for (const filePath of pathToDelete) {
        try {
          await fs.unlink(path.resolve(filePath));
        } catch (error) {
          if (error.code !== "ENOENT")
            logger.warn("Failed to delete old logo file", error);
        }
      }

      await client.query("COMMIT");

      logger.info(
        `Municipality with id ${municipalityId} successfully updated`
      );
      return updateResult[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error updating municipality: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async municipalityInfo() {
    const client = await pool.connect();
    try {
      const result = await client.query(MUNICIPALITY_INFORMATION);

      return result.rows;
    } catch (error) {
      logger.error("Error fetching municipality information", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async municipalityInfoById(municipalityId) {
    const client = await pool.connect();
    try {
      const result = await client.query(MUNICIPALITY_INFORMATION_BY_ID, [
        municipalityId,
      ]);

      if (result.rows.length === 0) {
        throw new ApiError(404, "Municipality not found");
      }

      return result.rows[0];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error("Error fetching municipality information by ID", error);
      throw new ApiError(500, "Failed to fetch municipality information");
    } finally {
      client.release();
    }
  }

  static async checkForConflicts(municipalityName, municipalityCode, excludeId = null) {
    const client = await pool.connect();
    try {
      const conflicts = [];

      // Check for municipality name conflicts
      let nameQuery = "SELECT id, municipality_name FROM municipalities WHERE municipality_name = $1";
      let nameParams = [municipalityName];
      
      if (excludeId) {
        nameQuery += " AND id != $2";
        nameParams.push(excludeId);
      }

      const { rows: nameConflicts } = await client.query(nameQuery, nameParams);
      if (nameConflicts.length > 0) {
        conflicts.push({
          field: "municipality_name",
          message: `Municipality with name "${municipalityName}" already exists`,
          existingId: nameConflicts[0].id
        });
      }

      // Check for municipality code conflicts
      let codeQuery = "SELECT id, municipality_code FROM municipalities WHERE municipality_code = $1";
      let codeParams = [municipalityCode];
      
      if (excludeId) {
        codeQuery += " AND id != $2";
        codeParams.push(excludeId);
      }

      const { rows: codeConflicts } = await client.query(codeQuery, codeParams);
      if (codeConflicts.length > 0) {
        conflicts.push({
          field: "municipality_code",
          message: `Municipality with code "${municipalityCode}" already exists`,
          existingId: codeConflicts[0].id
        });
      }

      return {
        hasConflicts: conflicts.length > 0,
        conflicts
      };
    } catch (error) {
      logger.error("Error checking for municipality conflicts", error);
      throw new ApiError(500, "Failed to check for conflicts");
    } finally {
      client.release();
    }
  }

  static async exportResidents(municipalityId, filters = {}) {
    const client = await pool.connect();
    try {
      // Import required module for Excel creation
      const XLSX = await import("xlsx");

      // Build the WHERE clause based on filters
      let whereConditions = ["b.municipality_id = $1", "r.status = 'active'"];
      let queryParams = [municipalityId];
      let paramIndex = 2;

      // Add barangay filter (for municipality level, this filters by specific barangay)
      if (filters.barangayId && filters.barangayId !== "all") {
        whereConditions.push(`r.barangay_id = $${paramIndex}`);
        queryParams.push(filters.barangayId);
        paramIndex++;
      }

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

      // Export residents data with joined barangay information for all barangays in municipality
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
        ORDER BY b.barangay_name, r.last_name, r.first_name`,
        queryParams
      );

      // Export resident classifications for all barangays in municipality
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
         ORDER BY b.barangay_name, r.last_name, r.first_name`,
        queryParams
      );

      // Create Excel workbook
      const workbook = XLSX.default.utils.book_new();

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
        throw new Error("No data available for export");
      }

      // Write Excel file to buffer (no temp file)
      const excelBuffer = XLSX.default.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      return excelBuffer;
    } catch (error) {
      logger.error("Failed to export municipality residents data:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async exportHouseholds(municipalityId, filters = {}) {
    const client = await pool.connect();
    try {
      // Import required module for Excel creation
      const XLSX = await import("xlsx");

      // Build the WHERE clause based on filters
      let whereConditions = ["b.municipality_id = $1", "r.status = 'active'"];
      let queryParams = [municipalityId];
      let paramIndex = 2;

      // Add barangay filter (for municipality level, this filters by specific barangay)
      if (filters.barangayId && filters.barangayId !== "all") {
        whereConditions.push(`h.barangay_id = $${paramIndex}`);
        queryParams.push(filters.barangayId);
        paramIndex++;
      }

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

      // Export households data with family members for all barangays in municipality
      const householdsResult = await client.query(
        `SELECT 
          h.id as household_id,
          h.house_number,
          h.street,
          h.barangay_id,
          h.house_head,
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
              WHERE r_house.id = h.house_head
              UNION
              -- Get family head incomes
              SELECT r_fam.monthly_income
              FROM families fam
              JOIN residents r_fam ON fam.family_head = r_fam.id
              WHERE fam.household_id = h.id
              UNION
              -- Get family member incomes
              SELECT r_mem.monthly_income
              FROM families fam2
              JOIN family_members fm2 ON fam2.id = fm2.family_id
              JOIN residents r_mem ON fm2.family_member = r_mem.id
              WHERE fam2.household_id = h.id
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
        ORDER BY b.barangay_name, h.house_number, h.street, f.family_group, r_member.last_name, r_member.first_name`,
        queryParams
      );

      // Create Excel workbook
      const workbook = XLSX.default.utils.book_new();

      // Group households by barangay
      const householdsByBarangay = {};
      householdsResult.rows.forEach((row) => {
        const barangayName = row.barangay_name || "Unknown Barangay";
        if (!householdsByBarangay[barangayName]) {
          householdsByBarangay[barangayName] = [];
        }
        householdsByBarangay[barangayName].push(row);
      });

      // Create a sheet for each barangay
      Object.keys(householdsByBarangay).forEach((barangayName) => {
        const barangayHouseholds = householdsByBarangay[barangayName];

        // Process data to include family members
        const processedRows = [];
        const processedFamilies = new Set(); // Track processed families to avoid duplicates
        const processedHouseholds = new Set(); // Track processed households to avoid duplicating house head and address

        barangayHouseholds.forEach((row) => {
          const familyKey = `${row.household_id}-${row.family_id}`;
          const householdKey = `${row.household_id}`;

          // Add family head as first row for each family
          if (!processedFamilies.has(familyKey)) {
            processedFamilies.add(familyKey);

            processedRows.push({
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
              Address: "", // Empty to avoid duplication
              "House Head Name": "", // Empty to avoid duplication
              Group: "", // Empty to avoid duplication
              "Household Resident Name (Family Head)": "", // Empty to avoid duplication
              "Household Resident Name (Family Member)": `${
                row.member_first_name || ""
              } ${row.member_last_name || ""}`.trim(),
              Contact: "", // Empty - contact only for house head
              "Household Monthly Income": "", // Empty - income only for house head
              "Relationship to Head": row.relationship_to_head || "",
            });
          }
        });

        const householdsSheet = XLSX.default.utils.json_to_sheet(processedRows);

        // Set column widths for better readability
        const columnWidths = [
          { wch: 15 }, // Purok
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
        const sheetName = barangayName
          .replace(/[\[\]*?/\\]/g, "")
          .substring(0, 31);
        XLSX.default.utils.book_append_sheet(
          workbook,
          householdsSheet,
          sheetName
        );
      });

      // Check if workbook has any sheets
      if (workbook.SheetNames.length === 0) {
        throw new Error("No data available for export");
      }

      // Write Excel file to buffer (no temp file)
      const excelBuffer = XLSX.default.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      return excelBuffer;
    } catch (error) {
      logger.error("Failed to export municipality households data:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Municipality;
