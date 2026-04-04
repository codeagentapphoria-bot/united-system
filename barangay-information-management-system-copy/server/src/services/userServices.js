import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import { cacheUtils } from "../config/redis.js";
import {
  INSERT_USER,
  UPDATE_USER,
  UPDATE_USER_WITHOUT_PASSWORD,
  FIND_BY_EMAIL,
  GET_USERS_BY_TARGET,
  GET_USER_BY_ID,
} from "../queries/user.queries.js";

const SALT_ROUNDS = 12;

class User {
  static async findByEmail(email) {
    const client = await pool.connect();
    try {
      const result = await client.query(FIND_BY_EMAIL, [email]);
      return result.rows[0];
    } catch (error) {
      logger.error("Failed to fetch user by email", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async insertUser({
    targetType,
    targetId,
    fullname,
    email,
    password,
    role,
    picturePath,
  }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // If no password provided (setup email flow), generate a random placeholder.
      // The user sets their own password after clicking the setup link in their email.
      const { randomBytes } = await import("crypto");
      const rawPassword = (password && password.trim() !== "") ? password : randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);
      const result = await client.query(INSERT_USER, [
        targetType,
        targetId,
        fullname,
        email,
        hashedPassword,
        role,
        picturePath || null,
      ]);
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to insert user:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateUser({
    userId,
    targetType,
    targetId,
    fullname,
    email,
    password,
    role,
    picturePath,
  }) {
    console.log("updateUser - Input params:", { userId, targetType, targetId, fullname, email, role, picturePath });
    
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Load existing record to use as fallback for fields not supplied in the update
      const oldResult = await client.query(
        "SELECT picture_path, target_type, target_id, role FROM bims_users WHERE id = $1",
        [userId]
      );
      const oldRow = oldResult.rows[0];
      const oldPicturePath = oldRow?.picture_path;

      // Preserve existing values when caller omits them (e.g. setup-account password flow)
      if (!targetType) targetType = oldRow?.target_type;
      if (!targetId)   targetId   = oldRow?.target_id;
      if (!role)       role       = oldRow?.role;
      console.log("updateUser - Old picture path:", oldPicturePath);

      let result;
      if (password && password.trim() !== "") {
        // Update with new password
      // If no password provided (admin added via setup email flow), generate a random placeholder.
      // The user sets their own password after clicking the setup link in their email.
      const { randomBytes } = await import("crypto");
      const rawPassword = password && password.trim() !== "" ? password : randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);
        console.log("updateUser - Updating with password, picturePath:", picturePath);
        result = await client.query(UPDATE_USER, [
          userId,
          targetType,
          targetId,
          fullname,
          email,
          hashedPassword,
          role,
          picturePath,
        ]);
      } else {
        // Update without changing password
        console.log("updateUser - Updating without password, picturePath:", picturePath);
        result = await client.query(UPDATE_USER_WITHOUT_PASSWORD, [
          userId,
          targetType,
          targetId,
          fullname,
          email,
          role,
          picturePath,
        ]);
      }

      if (oldPicturePath && oldPicturePath !== picturePath) {
        try {
          console.log("updateUser - Deleting old picture file:", oldPicturePath);
          await fs.unlink(path.resolve(oldPicturePath));
        } catch (error) {
          if (error.code !== "ENOENT")
            logger.warn("Failed to delete old file", error);
        }
      }

      await client.query("COMMIT");
      console.log("updateUser - Update completed successfully");

      cacheUtils.del(`bims:user:${userId}`).catch(() => {});

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("updateUser - Error:", error);
      logger.error("Failed to update user:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteUser(userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT picture_path FROM bims_users WHERE id = $1",
        [userId]
      );
      if (rows.length === 0) {
        throw new Error(`User with ID ${userId} not found.`);
      }

      const picturePath = rows[0].picture_path;

      await client.query("DELETE FROM bims_users WHERE id = $1", [userId]);

      if (picturePath) {
        try {
          await fs.unlink(path.resolve(picturePath));
        } catch (error) {
          if (error.code !== "ENOENT")
            logger.warn("Failed to delete user picture file", error);
        }
      }

      await client.query("COMMIT");

      cacheUtils.del(`bims:user:${userId}`).catch(() => {});

      return { message: "User deleted successfully." };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to delete user:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async userList({ targetId, search = "", page = 1, perPage = 10 }) {
    const client = await pool.connect();
    try {
      if (page < 1 || perPage < 1) {
        throw new Error("Page and perPage must be positive integers");
      }

      let values = [targetId];
      let paramIndex = 2;

      let query = `
      SELECT 
        id AS user_id,
        full_name,
        email,
        role
      FROM bims_users
      WHERE target_id = $1
    `;

      if (search) {
        query += ` AND (full_name ILIKE $${paramIndex})`;
        values.push(`%${search}%`);
        paramIndex++;
      }

      const offset = (page - 1) * perPage;
      query += ` ORDER BY full_name ASC LIMIT $${paramIndex} OFFSET $${
        paramIndex + 1
      }`;
      values.push(perPage, offset);

      const result = await client.query(query, values);

      let countQuery = `SELECT COUNT(*) FROM bims_users WHERE target_id = $1`;
      let countValues = [targetId];

      if (search) {
        countQuery += ` AND (full_name ILIKE $2)`;
        countValues.push(`%${search}%`);
      }

      const countResult = await client.query(countQuery, countValues);
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
      logger.error("Error fetching users list:", error.message);
      throw new ApiError(500, "Failed to fetch user list");
    } finally {
      client.release();
    }
  }

  static async userInfo(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(GET_USER_BY_ID, [userId]);

      return result.rows[0];
    } catch (error) {
      logger.error("Error fetching users information", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getUsersByTarget(targetType, targetId) {
    const client = await pool.connect();
    try {
      const result = await client.query(GET_USERS_BY_TARGET, [
        targetType,
        targetId,
      ]);
      return result.rows;
    } catch (error) {
      logger.error("Error fetching users by target:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAdminUsers() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id,
          full_name,
          email,
          role,
          target_type,
          target_id,
          is_active,
          last_login,
          created_at,
          updated_at
        FROM bims_users
        WHERE role = 'admin'
        ORDER BY full_name ASC
      `);
      return result.rows;
    } catch (error) {
      logger.error("Failed to fetch admin users", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default User;
