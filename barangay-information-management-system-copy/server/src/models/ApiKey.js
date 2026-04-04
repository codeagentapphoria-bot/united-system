import crypto from "crypto";
import { pool } from "../config/db.js";
import logger from "../utils/logger.js";

class ApiKeyModel {
  static async ensureTable() {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          municipality_id INTEGER NOT NULL,
          scopes TEXT[] NOT NULL DEFAULT ARRAY['read']::TEXT[],
          rate_limit_per_minute INTEGER DEFAULT 60,
          expires_at TIMESTAMP NULL,
          revoked BOOLEAN DEFAULT FALSE,
          created_by_user_id INTEGER NOT NULL,
          last_used_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // Simple trigger to auto-update updated_at if not already present globally
      await client.query(`
        CREATE OR REPLACE FUNCTION set_updated_at_api_keys()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'trg_api_keys_set_updated_at'
          ) THEN
            CREATE TRIGGER trg_api_keys_set_updated_at
            BEFORE UPDATE ON api_keys
            FOR EACH ROW EXECUTE FUNCTION set_updated_at_api_keys();
          END IF;
        END$$;
      `);
    } catch (error) {
      logger.error("Failed ensuring api_keys table:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static generateKey() {
    return crypto.randomBytes(32).toString("hex");
  }

  static async createKey({ name, municipalityId, scopes = ["read"], rateLimitPerMinute = 60, expiresAt = null, createdByUserId }) {
    const client = await pool.connect();
    try {
      const key = this.generateKey();
      const result = await client.query(
        `INSERT INTO api_keys (key, name, municipality_id, scopes, rate_limit_per_minute, expires_at, created_by_user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, key, name, municipality_id as municipalityId, scopes, rate_limit_per_minute as rateLimitPerMinute, expires_at as expiresAt, revoked, created_by_user_id as createdByUserId, last_used_at as lastUsedAt, created_at as createdAt, updated_at as updatedAt`,
        [key, name, municipalityId, scopes, rateLimitPerMinute, expiresAt, createdByUserId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error("Failed creating API key:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async listKeys({ municipalityId }) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, key, name, municipality_id as "municipalityId", scopes, rate_limit_per_minute as "rateLimitPerMinute", expires_at as "expiresAt", revoked,
                created_by_user_id as "createdByUserId", last_used_at as "lastUsedAt", created_at as "createdAt", updated_at as "updatedAt"
         FROM api_keys
         WHERE municipality_id = $1
         ORDER BY created_at DESC`,
        [municipalityId]
      );
      return result.rows;
    } catch (error) {
      logger.error("Failed listing API keys:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async revokeKey({ id, municipalityId }) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE api_keys SET revoked = TRUE WHERE id = $1 AND municipality_id = $2 RETURNING id`,
        [id, municipalityId]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.error("Failed revoking API key:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findValidByKey(key) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, key, name, municipality_id as "municipalityId", scopes, rate_limit_per_minute as "rateLimitPerMinute",
                expires_at as "expiresAt", revoked, created_by_user_id as "createdByUserId", last_used_at as "lastUsedAt",
                created_at as "createdAt", updated_at as "updatedAt"
         FROM api_keys
         WHERE key = $1 AND revoked = FALSE AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1`,
        [key]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed finding API key:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async markUsed(id) {
    const client = await pool.connect();
    try {
      await client.query(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [id]);
    } catch (error) {
      logger.warn("Failed updating last_used_at for api key:", error.message);
    } finally {
      client.release();
    }
  }

  static async getKeyById({ id, municipalityId }) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, key, name, municipality_id as "municipalityId", revoked
         FROM api_keys WHERE id = $1 AND municipality_id = $2 LIMIT 1`,
        [id, municipalityId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error("Failed getting API key by id:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteKey({ id, municipalityId }) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM api_keys WHERE id = $1 AND municipality_id = $2`,
        [id, municipalityId]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.error("Failed deleting API key:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default ApiKeyModel;


