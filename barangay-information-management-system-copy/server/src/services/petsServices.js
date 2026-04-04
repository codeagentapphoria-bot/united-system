import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import fs from "fs/promises";
import path from "path";
import {
  INSERT_PET,
  UPDATE_PET,
  DELETE_PET,
  LIST_PETS,
  PET_INFO,
  PET_INFO_BY_UUID,
  PET_PICTURE_PATH,
} from "../queries/pets.queries.js";

class Pet {
  static async insertPet({
    ownerId,
    petName,
    species,
    breed,
    sex,
    birthdate,
    color,
    picturePath,
    description,
  }) {
    const client = await pool.connect();
    try {
      const result = await client.query(INSERT_PET, [
        ownerId,
        petName,
        species,
        breed,
        sex,
        birthdate,
        color,
        picturePath,
        description,
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error("Error inserting pet:", error);
      throw new ApiError(500, "Failed to insert pet");
    } finally {
      client.release();
    }
  }

  static async updatePet({
    petId,
    ownerId,
    petName,
    species,
    breed,
    sex,
    birthdate,
    color,
    picturePath,
    description,
    _metadata,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get current pet data
      const { rows: currentPetRows } = await client.query(PET_INFO, [petId]);
      const currentPet = currentPetRows[0];

      if (!currentPet) {
        throw new ApiError(404, "Pet not found");
      }

      // Handle partial updates
      if (_metadata && _metadata.updateType === "partial") {
        console.log("Partial update detected:", _metadata.changedFields);

        // For partial updates, preserve existing data for fields not being changed
        if (!_metadata.changedFields.includes("ownerId"))
          ownerId = currentPet.owner_id;
        if (!_metadata.changedFields.includes("petName"))
          petName = currentPet.pet_name;
        if (!_metadata.changedFields.includes("species"))
          species = currentPet.species;
        if (!_metadata.changedFields.includes("breed"))
          breed = currentPet.breed;
        if (!_metadata.changedFields.includes("sex")) sex = currentPet.sex;
        if (!_metadata.changedFields.includes("birthdate"))
          birthdate = currentPet.birthdate;
        if (!_metadata.changedFields.includes("color"))
          color = currentPet.color;
        if (!_metadata.changedFields.includes("description"))
          description = currentPet.description;
        if (!_metadata.changedFields.includes("picturePath"))
          picturePath = currentPet.picture_path;
      }

      // Use existing picture if no new picture is provided
      const finalPicturePath = picturePath || currentPet.picture_path;

      // Update pet
      const result = await client.query(UPDATE_PET, [
        petId,
        ownerId,
        petName,
        species,
        breed,
        sex,
        birthdate,
        color,
        finalPicturePath,
        description,
      ]);

      // Remove old picture only if a new picture was provided and it's different
      if (
        picturePath &&
        currentPet.picture_path &&
        currentPet.picture_path !== picturePath
      ) {
        try {
          await fs.unlink(path.resolve(currentPet.picture_path));
        } catch (error) {
          if (error.code !== "ENOENT")
            logger.warn("Failed to delete pet picture", error);
        }
      }

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error updating pet:", error);
      throw new ApiError(500, "Failed to update pet");
    } finally {
      client.release();
    }
  }

  static async deletePet(petId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // Get picture path
      const { rows: pictureRows } = await client.query(PET_PICTURE_PATH, [
        petId,
      ]);
      const picturePath = pictureRows[0]?.picture_path;
      // Delete pet
      const result = await client.query(DELETE_PET, [petId]);
      // Remove picture file
      if (picturePath) {
        try {
          await fs.unlink(path.resolve(picturePath));
        } catch (error) {
          if (error.code !== "ENOENT")
            logger.warn("Failed to delete pet picture", error);
        }
      }
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error deleting pet:", error);
      throw new ApiError(500, "Failed to delete pet");
    } finally {
      client.release();
    }
  }

  static async petList({
    species,
    search = "",
    page = 1,
    perPage = 10,
    sortBy = "pet_name",
    sortOrder = "asc",
    barangayId,
    purokId,
    userTargetType,
    userTargetId,
  } = {}) {
    const client = await pool.connect();
    try {
      if (page < 1 || perPage < 1) {
        throw new Error("Page and perPage must be positive integers");
      }
      let query = `SELECT p.id AS pet_id, p.uuid, p.owner_id, p.pet_name, p.species, p.breed, p.sex, p.birthdate, p.color, p.picture_path, p.description, p.created_at, p.updated_at,
                   CONCAT(r.first_name, ' ', r.last_name) AS owner_name,
                   r.contact_number AS owner_contact,
                   b.barangay_name,
                   CASE WHEN p.picture_path IS NOT NULL THEN CONCAT('${
                     process.env.BASE_URL || "http://localhost:5000"
                   }/', p.picture_path) ELSE NULL END AS picture_path
                   FROM pets p
                   LEFT JOIN residents r ON p.owner_id = r.id
                   LEFT JOIN barangays b ON r.barangay_id = b.id`;
      const whereClauses = [];
      const values = [];
      let paramIndex = 1;

      if (species) {
        whereClauses.push(`p.species = $${paramIndex++}`);
        values.push(species);
      }

      if (search) {
        whereClauses.push(
          `(p.pet_name ILIKE $${paramIndex++} OR CONCAT(r.first_name, ' ', r.last_name) ILIKE $${paramIndex++})`
        );
        values.push(`%${search}%`, `%${search}%`);
      }

      if (userTargetType === "municipality") {
        whereClauses.push(`b.municipality_id = $${paramIndex++}`);
        values.push(userTargetId);
      }

      if (barangayId) {
        whereClauses.push(`r.barangay_id = $${paramIndex++}`);
        values.push(barangayId);
      }

      if (whereClauses.length > 0) {
        query += " WHERE " + whereClauses.join(" AND ");
      }

      // Validate sortBy field to prevent SQL injection
      const allowedSortFields = [
        "pet_name",
        "species",
        "breed",
        "sex",
        "birthdate",
        "color",
        "owner_name",
        "barangay_name",
      ];
      let validSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "pet_name";
      const validSortOrder =
        sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";

      if (validSortBy === "owner_name") {
        validSortBy = "CONCAT(r.first_name, ' ', r.last_name)";
      } else if (validSortBy === "barangay_name") {
        validSortBy = "b.barangay_name";
      } else {
        validSortBy = `p.${validSortBy}`;
      }

      const offset = (page - 1) * perPage;
      query += ` ORDER BY ${validSortBy} ${validSortOrder} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      values.push(perPage, offset);
      const result = await client.query(query, values);
      // Count query
      let countQuery = `SELECT COUNT(*) AS total FROM pets p
                       LEFT JOIN residents r ON p.owner_id = r.id
                       LEFT JOIN barangays b ON r.barangay_id = b.id`;
      const countWhereClauses = [];
      const countValues = [];
      let countParamIndex = 1;
      if (species) {
        countWhereClauses.push(`p.species = $${countParamIndex++}`);
        countValues.push(species);
      }
      if (search) {
        countWhereClauses.push(
          `(p.pet_name ILIKE $${countParamIndex++} OR CONCAT(r.first_name, ' ', r.last_name) ILIKE $${countParamIndex++})`
        );
        countValues.push(`%${search}%`, `%${search}%`);
      }
      if (userTargetType === "municipality") {
        countWhereClauses.push(`b.municipality_id = $${countParamIndex++}`);
        countValues.push(userTargetId);
      }
      if (barangayId) {
        countWhereClauses.push(`r.barangay_id = $${countParamIndex++}`);
        countValues.push(barangayId);
      }
      if (countWhereClauses.length > 0) {
        countQuery += " WHERE " + countWhereClauses.join(" AND ");
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
      logger.error("Error fetching pets list:", error);
      throw new ApiError(500, "Failed to fetch pets list");
    } finally {
      client.release();
    }
  }

  static async petInfo(petId) {
    const client = await pool.connect();
    try {
      const result = await client.query(PET_INFO, [petId]);
      const pet = result.rows[0];

      // Add full URL to picture_path if it exists
      if (pet && pet.picture_path) {
        pet.picture_path = `${
          process.env.BASE_URL || "http://localhost:5000"
        }/${pet.picture_path}`;
      }

      return pet;
    } catch (error) {
      logger.error("Error fetching pet info:", error);
      throw new ApiError(500, "Failed to fetch pet info");
    } finally {
      client.release();
    }
  }

  static async petInfoByUuid(petUuid) {
    const client = await pool.connect();
    try {
      const result = await client.query(PET_INFO_BY_UUID, [petUuid]);
      const pet = result.rows[0];

      // Add full URL to picture_path if it exists
      if (pet && pet.picture_path) {
        pet.picture_path = `${
          process.env.BASE_URL || "http://localhost:5000"
        }/${pet.picture_path}`;
      }

      return pet;
    } catch (error) {
      logger.error("Error fetching pet info by UUID:", error);
      throw new ApiError(500, "Failed to fetch pet info by UUID");
    } finally {
      client.release();
    }
  }

  static async getPetsByHousehold(householdId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          p.id AS pet_id,
          p.uuid,
          p.pet_name,
          p.species,
          p.breed,
          p.sex,
          p.birthdate,
          p.color,
          p.picture_path,
          p.description,
          CONCAT(r.first_name, ' ', r.last_name) AS owner_name,
          r.id AS owner_id,
          CASE WHEN p.picture_path IS NOT NULL THEN CONCAT('${
            process.env.BASE_URL || "http://localhost:5000"
          }/', p.picture_path) ELSE NULL END AS picture_path
        FROM pets p
        LEFT JOIN residents r ON p.owner_id = r.id
        WHERE r.id IN (
          -- Get house head
          SELECT h.house_head 
          FROM households h 
          WHERE h.id = $1
          UNION
          -- Get all family members
          SELECT fm.family_member
          FROM families f
          JOIN family_members fm ON f.id = fm.family_id
          WHERE f.household_id = $1
        )
        ORDER BY p.pet_name ASC
      `;

      const result = await client.query(query, [householdId]);
      return result.rows;
    } catch (error) {
      logger.error("Error fetching pets by household:", error);
      throw new ApiError(500, "Failed to fetch pets by household");
    } finally {
      client.release();
    }
  }

  static async getPetsByOwner(ownerId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          p.id AS pet_id,
          p.uuid,
          p.pet_name,
          p.species,
          p.breed,
          p.sex,
          p.birthdate,
          p.color,
          p.picture_path,
          p.description,
          CONCAT(r.first_name, ' ', r.last_name) AS owner_name,
          r.contact_number AS owner_contact,
          r.id AS owner_id,
          CASE WHEN p.picture_path IS NOT NULL THEN CONCAT('${
            process.env.BASE_URL || "http://localhost:5000"
          }/', p.picture_path) ELSE NULL END AS picture_path
        FROM pets p
        LEFT JOIN residents r ON p.owner_id = r.id
        WHERE p.owner_id = $1
        ORDER BY p.pet_name ASC
      `;

      const result = await client.query(query, [ownerId]);
      return result.rows;
    } catch (error) {
      logger.error("Error fetching pets by owner:", error);
      throw new ApiError(500, "Failed to fetch pets by owner");
    } finally {
      client.release();
    }
  }

  static async searchPets({ pet_uuid }) {
    const client = await pool.connect();
    try {
      // Security: Only allow UUID-based search to prevent enumeration attacks
      // Pet name search has been removed for security reasons
      if (!pet_uuid) {
        throw new ApiError(400, "Pet UUID is required for search");
      }

      let query = `
        SELECT
          p.id AS pet_id,
          p.uuid,
          p.pet_name,
          p.species,
          p.breed,
          p.sex,
          p.picture_path,
          CONCAT(r.first_name, ' ', r.last_name) AS owner_name,
          r.contact_number AS owner_contact,
          h.house_number,
          h.street,
          CONCAT(
            COALESCE(h.house_number, ''),
            CASE WHEN h.house_number IS NOT NULL AND h.street IS NOT NULL THEN ' ' ELSE '' END,
            COALESCE(h.street, ''),
            CASE WHEN (h.house_number IS NOT NULL OR h.street IS NOT NULL) AND b.barangay_name IS NOT NULL THEN ', ' ELSE '' END,
            COALESCE(b.barangay_name, ''),
            CASE WHEN (h.house_number IS NOT NULL OR h.street IS NOT NULL OR b.barangay_name IS NOT NULL) AND m.municipality_name IS NOT NULL THEN ', ' ELSE '' END,
            COALESCE(m.municipality_name, '')
          ) AS address
        FROM pets p
        LEFT JOIN residents r ON p.owner_id = r.id
        LEFT JOIN (
          SELECT r.id as resident_id, h.id, h.house_number, h.street
          FROM residents r
          JOIN households h ON h.house_head = r.id
          WHERE r.status = 'active'
          UNION
          SELECT r.id as resident_id, h.id, h.house_number, h.street
          FROM residents r
          JOIN family_members fm ON fm.family_member = r.id
          JOIN families f ON f.id = fm.family_id
          JOIN households h ON h.id = f.household_id
          WHERE r.status = 'active'
        ) h ON h.resident_id = r.id
        LEFT JOIN barangays b ON b.id = r.barangay_id
        LEFT JOIN municipalities m ON b.municipality_id = m.id
        WHERE p.uuid = $1
      `;

      const result = await client.query(query, [pet_uuid]);
      return result.rows;
    } catch (error) {
      logger.error("Error searching pets:", error);
      // Include actual error message for debugging
      const errorMessage = error.message || "Unknown database error";
      logger.error("Search pets error details:", { pet_uuid, errorMessage, stack: error.stack });
      throw new ApiError(500, `Failed to search pets: ${errorMessage}`);
    } finally {
      client.release();
    }
  }
}

export default Pet;
