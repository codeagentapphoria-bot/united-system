import logger from "../utils/logger.js";
import { pool } from "../config/db.js";
import { ApiError } from "../utils/apiError.js";
import fs from "fs/promises";
import path from "path";
import {
  INSERT_HOUSEHOLD,
  UPDATE_HOUSEHOLD,
  INSERT_FAMILY,
  INSERT_FAMILY_MEMBER,
  UPDATE_FAMILY,
  UPDATE_FAMILY_MEMBER,
  VIEW_HOUSEHOLD_INFORMATION,
  CHECK_HOUSEHOLD_BY_HOUSE_HEAD,
  CHECK_RESIDENT_IN_HOUSEHOLD,
  CHECK_HOUSEHOLD_EXISTS,
  CHECK_FAMILY_EXISTS,
  CHECK_FAMILY_MEMBER_EXISTS,
  SYNC_HOUSEHOLD_INSERT,
  SYNC_HOUSEHOLD_UPDATE,
  SYNC_FAMILY_INSERT,
  SYNC_FAMILY_UPDATE,
  SYNC_FAMILY_MEMBER_INSERT,
  SYNC_FAMILY_MEMBER_UPDATE,
} from "../queries/household.queries.js";

class Household {
  static async insertHousehold({
    houseNumber,
    street,
    barangayId,
    houseHead,
    housingType,
    structureType,
    electricity,
    waterSource,
    toiletFacility,
    geom,
    area,
    families,
    household_image_path,
  }) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Prepare longitude and latitude for PostGIS
      let geomSQL = null;
      if (geom && geom.lat && geom.lng) {
        const lat = parseFloat(geom.lat);
        const lng = parseFloat(geom.lng);
        geomSQL = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
      }

      // Prepare images as JSONB
      const household_image_pathJSON = household_image_path
        ? JSON.stringify(household_image_path)
        : "[]";

      console.log("INSERT_HOUSEHOLD:", [
        houseNumber,
        street,
        barangayId,
        houseHead,
        housingType,
        structureType,
        electricity,
        waterSource,
        toiletFacility,
        geomSQL,
        area,
        household_image_pathJSON,
      ]);

      // Use raw SQL for geometry to avoid parameter type issues
      const insertQuery = `
        INSERT INTO households(
          house_number,
          street,
          barangay_id,
          house_head,
          housing_type,
          structure_type,
          electricity,
          water_source,
          toilet_facility,
          geom,
          area,
          household_image_path
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          ${geomSQL || "NULL"}, $11, $12)
        RETURNING id;
      `;

      const { rows: householdRows } = await client.query(insertQuery, [
        houseNumber,
        street,
        barangayId,
        houseHead,
        housingType,
        structureType,
        electricity,
        waterSource,
        toiletFacility,
        area,
        household_image_pathJSON,
      ]);

      const householdId = householdRows[0].id;

      // Only process families if there are any
      if (families && Object.keys(families).length > 0) {
        let familyGroupCounter = 1;
        for (const familyKey of Object.keys(families)) {
          const family = families[familyKey];

          // Validate that family has a head
          if (!family.familyHeadId) {
            console.warn(
              `Family ${familyKey} has no familyHeadId, skipping...`
            );
            continue;
          }

          console.log("INSERT_FAMILY:", [
            householdId,
            `Group ${familyGroupCounter}`,
            family.familyHeadId,
          ]);
          const { rows: familyRows } = await client.query(INSERT_FAMILY, [
            householdId,
            `Group ${familyGroupCounter}`,
            family.familyHeadId,
          ]);

          const familyId = familyRows[0].id;

          for (const memberKey of Object.keys(family.familyMembers)) {
            const member = family.familyMembers[memberKey];
            // Defensive: Only insert if member and member.memberId are valid
            if (!member || !member.memberId) continue;
            console.log("INSERT_FAMILY_MEMBER:", [
              familyId,
              member.memberId,
              member.relationshipToHead,
            ]);
            await client.query(INSERT_FAMILY_MEMBER, [
              familyId,
              member.memberId,
              member.relationshipToHead,
            ]);
          }

          familyGroupCounter++;
        }
      }

      await client.query("COMMIT");
      return householdId;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error inserting household:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateHousehold({
    householdId,
    houseNumber,
    street,
    barangayId,
    houseHead,
    housingType,
    structureType,
    electricity,
    waterSource,
    toiletFacility,
    geom,
    area,
    families,
    household_image_path,
    _metadata,
  }) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Log the update type and changed fields
      if (_metadata) {
        console.log("Update type:", _metadata.updateType);
        if (_metadata.changedFields) {
          console.log("Changed fields:", _metadata.changedFields);
        }
        if (_metadata.oldData) {
          console.log("Old data included in payload");
        }
      }

      // Prepare longitude and latitude for PostGIS (only used if geom was explicitly passed)

      // Fetch OLD household images FIRST (before any update) for cleanup comparison
      // Store in temp variable - will be used AFTER successful update
      let oldHouseholdImages = [];
      if (household_image_path !== undefined) {
        try {
          const oldHousehold = await client.query(
            "SELECT household_image_path FROM households WHERE id = $1",
            [householdId]
          );
          oldHouseholdImages = oldHousehold.rows.length > 0 ? (oldHousehold.rows[0].household_image_path || []) : [];
          logger.debug(`Fetched old household images for cleanup: ${JSON.stringify(oldHouseholdImages)}`);
        } catch (error) {
          logger.warn("Error fetching old household images:", error);
        }
      }

      // Prepare images as JSONB
      const household_image_pathJSON = household_image_path
        ? JSON.stringify(household_image_path)
        : "[]";

      // Build dynamic update query for partial updates
      const updateFields = [];
      const updateValues = [householdId]; // $1 is always the household ID
      let paramIndex = 2;

      if (houseNumber !== undefined) {
        updateFields.push(`house_number = $${paramIndex}`);
        updateValues.push(houseNumber);
        paramIndex++;
      }
      if (street !== undefined) {
        updateFields.push(`street = $${paramIndex}`);
        updateValues.push(street);
        paramIndex++;
      }
      if (barangayId !== undefined) {
        updateFields.push(`barangay_id = $${paramIndex}`);
        updateValues.push(barangayId);
        paramIndex++;
      }
      if (houseHead !== undefined) {
        updateFields.push(`house_head = $${paramIndex}`);
        updateValues.push(houseHead);
        paramIndex++;
      }
      if (housingType !== undefined) {
        updateFields.push(`housing_type = $${paramIndex}`);
        updateValues.push(housingType);
        paramIndex++;
      }
      if (structureType !== undefined) {
        updateFields.push(`structure_type = $${paramIndex}`);
        updateValues.push(structureType);
        paramIndex++;
      }
      if (electricity !== undefined) {
        updateFields.push(`electricity = $${paramIndex}`);
        updateValues.push(electricity);
        paramIndex++;
      }
      if (waterSource !== undefined) {
        updateFields.push(`water_source = $${paramIndex}`);
        updateValues.push(waterSource);
        paramIndex++;
      }
      if (toiletFacility !== undefined) {
        updateFields.push(`toilet_facility = $${paramIndex}`);
        updateValues.push(toiletFacility);
        paramIndex++;
      }
      // Only touch geom if it was explicitly included in the update payload.
      // Checking `geom !== undefined` (not `geomWKT !== undefined`) prevents
      // partial updates (e.g. editing housing type) from wiping a saved location.
      if (geom !== undefined) {
        if (geom && geom.lat && geom.lng) {
          const lat = parseFloat(geom.lat);
          const lng = parseFloat(geom.lng);
          // Embed inline so ST_GeomFromText sets SRID 4326 (matches query path)
          updateFields.push(`geom = ST_GeomFromText($${paramIndex}, 4326)`);
          updateValues.push(`POINT(${lng} ${lat})`);
        } else {
          // Explicit null/empty → clear the pin
          updateFields.push(`geom = NULL`);
        }
        paramIndex++;
      }
      if (area !== undefined) {
        updateFields.push(`area = $${paramIndex}`);
        updateValues.push(area);
        paramIndex++;
      }
      if (household_image_pathJSON !== undefined) {
        updateFields.push(`household_image_path = $${paramIndex}`);
        updateValues.push(household_image_pathJSON);
        paramIndex++;
      }

      // Only update if there are fields to update
      if (updateFields.length > 0) {
        const dynamicUpdateQuery = `
          UPDATE households SET
            ${updateFields.join(", ")}
          WHERE id = $1
          RETURNING id;
        `;

        console.log("Dynamic UPDATE_HOUSEHOLD:", updateValues);
        console.log("Update fields:", updateFields);
        await client.query(dynamicUpdateQuery, updateValues);
      }

      // Only update families if they were changed or if this is a full update
      const shouldUpdateFamilies =
        !_metadata ||
        _metadata.updateType === "full" ||
        (_metadata.changedFields &&
          _metadata.changedFields.includes("families"));

      if (shouldUpdateFamilies) {
        await client.query(`DELETE FROM families WHERE household_id = $1;`, [
          householdId,
        ]);

        // Only process families if there are any
        if (families && Object.keys(families).length > 0) {
          let familyGroupCounter = 1;
          for (const familyKey of Object.keys(families)) {
            const family = families[familyKey];

            // Validate that family has a head
            if (!family.familyHeadId) {
              console.warn(
                `Family ${familyKey} has no familyHeadId, skipping...`
              );
              continue;
            }

            console.log("INSERT_FAMILY (update):", [
              householdId,
              `Group ${familyGroupCounter}`,
              family.familyHeadId,
            ]);
            const { rows: familyRows } = await client.query(INSERT_FAMILY, [
              householdId,
              `Group ${familyGroupCounter}`,
              family.familyHeadId,
            ]);

            const familyId = familyRows[0].id;

            for (const memberKey of Object.keys(family.familyMembers)) {
              const member = family.familyMembers[memberKey];
              // Defensive: Only insert if member and member.memberId are valid
              if (!member || !member.memberId) continue;
              console.log("INSERT_FAMILY_MEMBER (update):", [
                familyId,
                member.memberId,
                member.relationshipToHead,
              ]);
              await client.query(INSERT_FAMILY_MEMBER, [
                familyId,
                member.memberId,
                member.relationshipToHead,
              ]);
            }

            familyGroupCounter++;
          }
        }
      } else {
        console.log("Skipping families update - no changes detected");
      }

      // AFTER successful update, clean up orphaned image files
      // Compare old images (temp variable) with new images to find removed files
      if (household_image_path !== undefined && oldHouseholdImages.length > 0) {
        try {
          const newImages = household_image_path || [];
          
          // Find images that were removed (exist in old but not in new)
          const imagesToDelete = oldHouseholdImages.filter(oldImage => 
            !newImages.some(newImage => newImage === oldImage)
          );
          
          if (imagesToDelete.length > 0) {
            logger.debug(`Cleaning up removed household images:`);
            logger.debug(`  Old images: ${JSON.stringify(oldHouseholdImages)}`);
            logger.debug(`  New images: ${JSON.stringify(newImages)}`);
            logger.debug(`  Images to delete: ${JSON.stringify(imagesToDelete)}`);
            
            // Delete orphaned image files from uploads folder
            for (const imagePath of imagesToDelete) {
              try {
                const fullPath = path.resolve(imagePath);
                await fs.unlink(fullPath);
                logger.info(`✅ Deleted orphaned household image: ${imagePath}`);
              } catch (error) {
                if (error.code !== "ENOENT") {
                  logger.warn(`Failed to delete household image ${imagePath}:`, error);
                }
              }
            }
          } else {
            logger.debug(`No household images to clean up`);
          }
        } catch (error) {
          logger.warn("Error cleaning up household images:", error);
        }
      }

      // Release temp variable
      oldHouseholdImages = null;

      await client.query("COMMIT");
      return householdId;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error updating household:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteHousehold(householdId) {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Get household images before deletion for cleanup
      const householdImages = await client.query(
        "SELECT household_image_path FROM households WHERE id = $1",
        [householdId]
      );

      const { rows } = await client.query(
        `
        DELETE FROM households
        WHERE id = $1
        RETURNING *;
        `,
        [householdId]
      );

      // Clean up household image files
      if (householdImages.rows.length > 0) {
        const images = householdImages.rows[0].household_image_path || [];
        for (const imagePath of images) {
          try {
            await fs.unlink(path.resolve(imagePath));
            logger.debug(`Deleted household image: ${imagePath}`);
          } catch (error) {
            if (error.code !== "ENOENT") {
              logger.warn(`Failed to delete household image ${imagePath}:`, error);
            }
          }
        }
      }

      await client.query("COMMIT");

      return rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error deleting household:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async householdList({
    barangayId,
    search,
    page = 1,
    perPage = 10,
    userTargetType,
    userTargetId,
    sortBy = "household_id",
    sortOrder = "desc",
  }) {
    // Whitelist allowed sort columns to prevent SQL injection
    const allowedSortColumns = [
      'household_id', 'house_number', 'street', 'barangay_name',
      'house_head', 'family_count', 'resident_count', 'total_monthly_income', 'created_at'
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'household_id';
    const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    const client = await pool.connect();
    try {
      const offset = (page - 1) * perPage;

      const whereClause = [];
      const values = [];
      const joins = [];

      // Add standard joins
      joins.push("LEFT JOIN residents r ON h.house_head = r.id");

      // For municipality users, join with barangays to filter by municipality
      if (userTargetType === "municipality") {
        joins.push("JOIN barangays b ON h.barangay_id = b.id");
        values.push(userTargetId);
        whereClause.push(`b.municipality_id = $${values.length}`);
      } else {
        // For barangay users, add the standard barangays join
        joins.push("LEFT JOIN barangays b ON h.barangay_id = b.id");
      }

      if (barangayId) {
        values.push(barangayId);
        whereClause.push(`h.barangay_id = $${values.length}`);
      }

      if (search) {
        values.push(`%${search}%`);
        whereClause.push(`(
          h.house_number ILIKE $${values.length} OR
          h.street ILIKE $${values.length} OR
          r.first_name ILIKE $${values.length} OR
          r.last_name ILIKE $${values.length}
        )`);
      }

      const whereSQL = whereClause.length
        ? `WHERE ${whereClause.join(" AND ")}`
        : "";

      const joinsSQL = joins.join(" ");

      // Count total records
      const countResult = await client.query(
        `
        SELECT COUNT(*) AS total
        FROM households h
        ${joinsSQL}
        ${whereSQL}
        `,
        values
      );
      const totalRecords = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalRecords / perPage);

      // Fetch paginated results with family and resident counts
      const result = await client.query(
        `
        SELECT
          h.id AS household_id,
          h.house_number,
          h.street,
          b.barangay_name,
          CONCAT(r.first_name, ' ', r.last_name) AS house_head,
          COALESCE(family_stats.family_count, 0) AS family_count,
          COALESCE(family_stats.resident_count, 0) AS resident_count,
          COALESCE(income_stats.total_monthly_income, 0) AS total_monthly_income
        FROM households h
        ${joinsSQL}
        LEFT JOIN (
          SELECT 
            household_id,
            family_count,
            resident_count
          FROM (
            SELECT 
              f.household_id,
              COUNT(DISTINCT f.id) AS family_count,
              COUNT(DISTINCT f.family_head) + COUNT(DISTINCT fm.family_member) AS resident_count
            FROM families f
            LEFT JOIN family_members fm ON f.id = fm.family_id
            GROUP BY f.household_id
          ) family_stats_sub
        ) family_stats ON h.id = family_stats.household_id
        LEFT JOIN (
          SELECT 
            household_id,
            total_monthly_income
          FROM (
            SELECT 
              h.id as household_id,
              COALESCE(SUM(DISTINCT r_income.monthly_income), 0) as total_monthly_income
            FROM households h
            LEFT JOIN (
              -- Get house head income
              SELECT h_inner.id as household_id, r_house.monthly_income
              FROM households h_inner
              JOIN residents r_house ON r_house.id = h_inner.house_head
              UNION
              -- Get family head incomes
              SELECT fam.household_id, r_fam.monthly_income
              FROM families fam
              JOIN residents r_fam ON fam.family_head = r_fam.id
              UNION
              -- Get family member incomes
              SELECT fam2.household_id, r_mem.monthly_income
              FROM families fam2
              JOIN family_members fm2 ON fam2.id = fm2.family_id
              JOIN residents r_mem ON fm2.family_member = r_mem.id
            ) r_income ON r_income.household_id = h.id
            WHERE r_income.monthly_income IS NOT NULL
            GROUP BY h.id
          ) income_stats_sub
        ) income_stats ON h.id = income_stats.household_id
        ${whereSQL}
        ORDER BY ${safeSortBy} ${safeSortOrder.toUpperCase()}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
        `,
        [...values, perPage, offset]
      );

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
      logger.error("Error fetching household list: ", error);
      throw new ApiError(500, "Failed to fetch households");
    } finally {
      client.release();
    }
  }

  static async householdInfo(householdId) {
    const client = await pool.connect();
    try {
      const result = await client.query(VIEW_HOUSEHOLD_INFORMATION, [
        householdId,
      ]);

      return result.rows[0];
    } catch (error) {
      logger.error("Failed to fetch household information: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async householdFamilyCount() {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_households,
          COUNT(DISTINCT h.id) as households_with_families,
          COALESCE(SUM(family_count), 0) as total_families
        FROM households h
        LEFT JOIN (
          SELECT 
            household_id,
            COUNT(*) as family_count
          FROM families 
          GROUP BY household_id
        ) f ON h.id = f.household_id
      `;
      const { rows } = await client.query(query);
      return rows[0];
    } catch (error) {
      logger.error("Failed to fetch household family count: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async checkHouseholdByHouseHead(houseHeadId) {
    const client = await pool.connect();
    try {
      const result = await client.query(CHECK_HOUSEHOLD_BY_HOUSE_HEAD, [
        houseHeadId,
      ]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to check household by house head: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async checkResidentInHousehold(residentId) {
    const client = await pool.connect();
    try {
      const result = await client.query(CHECK_RESIDENT_IN_HOUSEHOLD, [
        residentId,
      ]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed to check resident in household: ", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getHouseholdLocations({
    barangayId,
    userTargetType,
    userTargetId,
  }) {
    const client = await pool.connect();
    try {
      const whereClause = [];
      const values = [];
      const joins = [];

      // Add standard joins
      joins.push("LEFT JOIN residents r ON h.house_head = r.id");

      // For municipality users, join with barangays to filter by municipality
      if (userTargetType === "municipality") {
        joins.push("JOIN barangays b ON h.barangay_id = b.id");
        values.push(userTargetId);
        whereClause.push(`b.municipality_id = $${values.length}`);
      } else {
        // For barangay users, add the standard barangays join
        joins.push("LEFT JOIN barangays b ON h.barangay_id = b.id");
      }

      if (barangayId) {
        values.push(barangayId);
        whereClause.push(`h.barangay_id = $${values.length}`);
      }

      // Only include households with geographic coordinates
      whereClause.push("h.geom IS NOT NULL");

      const whereSQL = whereClause.length
        ? `WHERE ${whereClause.join(" AND ")}`
        : "";

      const joinsSQL = joins.join(" ");

      const result = await client.query(
        `
        SELECT
          h.id AS household_id,
          h.house_number,
          h.street,
          b.barangay_name,
          CONCAT_WS(' ', r.first_name, r.middle_name, r.last_name, r.extension_name) AS house_head,
          h.housing_type,
          h.structure_type,
          h.electricity,
          h.water_source,
          h.toilet_facility,
          ST_AsGeoJSON(h.geom) AS geom,
          h.area,
          COALESCE(family_stats.family_count, 0) AS family_count,
          COALESCE(family_stats.resident_count, 0) AS resident_count
        FROM households h
        ${joinsSQL}
        LEFT JOIN (
          SELECT 
            household_id,
            family_count,
            resident_count
          FROM (
            SELECT 
              f.household_id,
              COUNT(DISTINCT f.id) AS family_count,
              COUNT(DISTINCT f.family_head) + COUNT(DISTINCT fm.family_member) AS resident_count
            FROM families f
            LEFT JOIN family_members fm ON f.id = fm.family_id
            GROUP BY f.household_id
          ) family_stats_sub
        ) family_stats ON h.id = family_stats.household_id
        ${whereSQL}
        ORDER BY h.id DESC
        `,
        values
      );

      return result.rows;
    } catch (error) {
      logger.error("Error fetching household locations: ", error);
      throw new ApiError(500, "Failed to fetch household locations");
    } finally {
      client.release();
    }
  }

  static async syncHousehold({
    householdData,
    familiesData = [],
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const {
        houseNumber,
        street,
        barangayId,
        houseHead,
        housingType,
        structureType,
        electricity,
        waterSource,
        toiletFacility,
        geom,
        area,
        householdImagePath,
      } = householdData;

      // Note: ID is not required - server will generate its own ID for new households

      if (!barangayId) {
        throw new ApiError(400, "Barangay ID is required for sync");
      }

      if (!houseHead) {
        throw new ApiError(400, "House head is required for sync");
      }

      // Create new household - no need to check if exists
      
      // Prepare geometry for PostGIS
      let geomSQL = null;
      if (geom && geom.lat && geom.lng) {
        const lat = parseFloat(geom.lat);
        const lng = parseFloat(geom.lng);
        geomSQL = `ST_GeomFromText('POINT(${lng} ${lat})', 4326)`;
      }

      // Prepare household image path as JSONB
      const householdImagePathJSON = householdImagePath
        ? JSON.stringify(householdImagePath)
        : "[]";

      let householdResult;
      let householdAction;

      // Always insert new household for mobile sync
      // Insert new household
        const insertQuery = `
          INSERT INTO households(
            house_number,
            street,
            barangay_id,
            house_head,
            housing_type,
            structure_type,
            electricity,
            water_source,
            toilet_facility,
            geom,
            area,
            household_image_path
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
            ${geomSQL || "NULL"}, $11, $12)
          RETURNING id;
        `;

        householdResult = await client.query(insertQuery, [
          houseNumber,
          street,
          barangayId,
          houseHead,
          housingType,
          structureType,
          electricity,
          waterSource,
          toiletFacility,
          area,
          householdImagePathJSON,
        ]);
        householdAction = "created";

      const syncedHouseholdId = householdResult.rows[0].id;
      const familyResults = [];

      // Process families data
      if (familiesData && familiesData.length > 0) {
        for (const familyData of familiesData) {
          const {
            familyHead,
            familyGroupNumber,
            familyMembers = [],
          } = familyData;

          if (!familyHead) {
            logger.warn("Family has no family head, skipping");
            continue;
          }

          // Always create new family for mobile sync
          // Insert new family
          const familyResult = await client.query(`
            INSERT INTO families(
              household_id,
              family_group,
              family_head
            ) VALUES ($1, $2, $3)
            RETURNING id;
          `, [
            syncedHouseholdId,
            familyGroupNumber || `Family #1`,
            familyHead,
          ]);
          
          const familyAction = "created";

          const syncedFamilyId = familyResult.rows[0].id;
          const familyMemberResults = [];

          // Process family members
          if (familyMembers && familyMembers.length > 0) {
            for (const memberData of familyMembers) {
              const {
                familyMember,
                relationship,
              } = memberData;

              if (!familyMember) {
                logger.warn("Family member has no resident ID, skipping");
                continue;
              }

              // Always create new family member for mobile sync
              // Insert new family member
              const memberResult = await client.query(`
                INSERT INTO family_members(
                  family_id,
                  family_member,
                  relationship_to_head
                ) VALUES ($1, $2, $3)
                RETURNING id;
              `, [
                syncedFamilyId,
                familyMember,
                relationship || 'family_member',
              ]);
              
              const memberAction = "created";

              familyMemberResults.push({
                id: memberResult.rows[0].id,
                action: memberAction,
              });
            }
          }

          familyResults.push({
            id: syncedFamilyId,
            action: familyAction,
            members: familyMemberResults,
          });
        }
      }

      await client.query("COMMIT");

      return {
        household: {
          id: syncedHouseholdId,
          action: householdAction,
        },
        families: familyResults,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to sync household: ", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default Household;
