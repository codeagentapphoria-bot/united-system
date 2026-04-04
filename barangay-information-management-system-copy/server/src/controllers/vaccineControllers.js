import { pool } from "../config/db.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";

// Create a new vaccine record
export const createVaccine = async (req, res, next) => {
  try {
    const { target_type, target_id, vaccine_name, vaccine_type, vaccine_description, vaccination_date } = req.body;

    // Validate required fields
    if (!target_type || !target_id || !vaccine_name || !vaccination_date) {
      throw new ApiError(400, "Missing required fields");
    }

    // Validate target_type
    if (!['pet', 'resident'].includes(target_type)) {
      throw new ApiError(400, "Invalid target_type. Must be 'pet' or 'resident'");
    }

    // Check if target exists
    const targetTable = target_type === 'pet' ? 'pets' : 'residents';
    const targetCheck = await pool.query(
      `SELECT id FROM ${targetTable} WHERE id = $1`,
      [target_id]
    );

    if (targetCheck.rows.length === 0) {
      throw new ApiError(404, `${target_type} not found`);
    }

    // Insert vaccine record
    const result = await pool.query(
      `INSERT INTO vaccines (target_type, target_id, vaccine_name, vaccine_type, vaccine_description, vaccination_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [target_type, target_id, vaccine_name, vaccine_type, vaccine_description, vaccination_date]
    );

    res.status(201).json({
      success: true,
      message: "Vaccine record created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Get vaccines by target (pet or resident)
export const getVaccinesByTarget = async (req, res, next) => {
  try {
    const { targetType, targetId } = req.params;

    // Validate target_type
    if (!['pet', 'resident'].includes(targetType)) {
      throw new ApiError(400, "Invalid target_type. Must be 'pet' or 'resident'");
    }

    // Get vaccines for the target
    const result = await pool.query(
      `SELECT * FROM vaccines 
       WHERE target_type = $1 AND target_id = $2 
       ORDER BY vaccination_date DESC`,
      [targetType, targetId]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Get vaccine by ID
export const getVaccineById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM vaccines WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, "Vaccine record not found");
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Update vaccine record
export const updateVaccine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vaccine_name, vaccine_type, vaccine_description, vaccination_date } = req.body;

    // Check if vaccine exists
    const existingVaccine = await pool.query(
      `SELECT * FROM vaccines WHERE id = $1`,
      [id]
    );

    if (existingVaccine.rows.length === 0) {
      throw new ApiError(404, "Vaccine record not found");
    }

    // Update vaccine record
    const result = await pool.query(
      `UPDATE vaccines 
       SET vaccine_name = COALESCE($1, vaccine_name),
           vaccine_type = $2,
           vaccine_description = $3,
           vaccination_date = COALESCE($4, vaccination_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [vaccine_name, vaccine_type, vaccine_description, vaccination_date, id]
    );

    res.status(200).json({
      success: true,
      message: "Vaccine record updated successfully",
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Delete vaccine record
export const deleteVaccine = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if vaccine exists
    const existingVaccine = await pool.query(
      `SELECT * FROM vaccines WHERE id = $1`,
      [id]
    );

    if (existingVaccine.rows.length === 0) {
      throw new ApiError(404, "Vaccine record not found");
    }

    // Delete vaccine record
    await pool.query(
      `DELETE FROM vaccines WHERE id = $1`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Vaccine record deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};
