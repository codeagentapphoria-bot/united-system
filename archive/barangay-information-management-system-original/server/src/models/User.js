import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import {
  FIND_USER_BY_EMAIL,
  FIND_USER_BY_ID,
  UPDATE_RESET_TOKEN,
  UPDATE_PASSWORD,
  CLEAR_RESET_TOKEN,
} from "../queries/auth.queries.js";

class User {
  static async findByEmail(email) {
    const { rows } = await pool.query(FIND_USER_BY_EMAIL, [email]);
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await pool.query(FIND_USER_BY_ID, [id]);
    return rows[0];
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  static async updateResetToken(userId, resetToken, resetTokenExpiry) {
    await pool.query(UPDATE_RESET_TOKEN, [
      resetToken,
      resetTokenExpiry,
      userId,
    ]);
  }

  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(UPDATE_PASSWORD, [hashedPassword, userId]);
  }

  static async clearResetToken(userId) {
    await pool.query(CLEAR_RESET_TOKEN, [userId]);
  }
}

export default User;
