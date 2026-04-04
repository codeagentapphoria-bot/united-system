/**
 * residentControllers.js — v2 (Unified Schema)
 *
 * BIMS Resident controllers — READ ONLY + Classification management.
 * Registration is handled through the portal (E-Services system).
 *
 * REMOVED: upsertResident, deleteResident, syncResident, syncClassification
 */

import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Resident from "../services/residentServices.js";
import { pool } from "../config/db.js";

// =============================================================================
// READ: List residents
// =============================================================================
export const residentList = async (req, res, next) => {
  try {
    const {
      barangayId,
      classificationType,
      search,
      status: statusFilter,
      page,
      perPage,
    } = req.query;

    const userTargetType = req.user?.target_type;
    const userTargetId = req.user?.target_id;

    const result = await Resident.residentList({
      barangayId: barangayId ? parseInt(barangayId) : undefined,
      classificationType,
      search,
      statusFilter,
      page: parseInt(page) || 1,
      perPage: parseInt(perPage) || 10,
      userTargetType,
      userTargetId,
    });

    res.json({
      message: "Residents retrieved successfully",
      data: result.residents,
      pagination: {
        total: result.total,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error("Error fetching resident list:", error);
    next(error);
  }
};

// =============================================================================
// READ: Single resident profile
// =============================================================================
export const residentInfo = async (req, res, next) => {
  try {
    const { residentId } = req.params;
    const resident = await Resident.residentInfo({ residentId });

    if (!resident) {
      return next(new ApiError(404, "Resident not found"));
    }

    res.json({ message: "Resident retrieved successfully", data: resident });
  } catch (error) {
    logger.error("Error fetching resident info:", error);
    next(error);
  }
};

// =============================================================================
// READ: QR code scan (authenticated — returns more data than public QR)
// =============================================================================
export const residentInfoForQR = async (req, res, next) => {
  try {
    const { residentId } = req.params;
    const resident = await Resident.residentInfo({ residentId });

    if (!resident) {
      return next(new ApiError(404, "Resident not found"));
    }

    res.json({ message: "Resident retrieved successfully", data: resident });
  } catch (error) {
    logger.error("Error fetching resident for QR:", error);
    next(error);
  }
};

// =============================================================================
// READ: Public QR scan (no auth — masked name only)
// =============================================================================
export const publicResidentInfoForQR = async (req, res, next) => {
  try {
    const { residentId } = req.params;
    const resident = await Resident.publicResidentInfo({ residentId });

    if (!resident) {
      return next(new ApiError(404, "Resident not found"));
    }

    res.json({ message: "Resident retrieved successfully", data: resident });
  } catch (error) {
    logger.error("Error fetching public resident info:", error);
    next(error);
  }
};

// =============================================================================
// CLASSIFICATIONS
// =============================================================================

export const classificationList = async (req, res, next) => {
  try {
    const { barangayId } = req.query;
    const userTargetType = req.user?.target_type;
    const userTargetId = req.user?.target_id;

    const classifications = await Resident.classificationList({
      barangayId: barangayId ? parseInt(barangayId) : undefined,
      userTargetType,
      userTargetId,
    });

    res.json({
      message: "Classifications retrieved successfully",
      data: classifications,
    });
  } catch (error) {
    logger.error("Error fetching classifications:", error);
    next(error);
  }
};

export const insertClassification = async (req, res, next) => {
  try {
    const { residentId, classificationType, classificationDetails } = req.body;

    const classification = await Resident.insertClassification({
      residentId,
      classificationType,
      classificationDetails,
    });

    res.status(201).json({
      message: "Classification added successfully",
      data: classification,
    });
  } catch (error) {
    logger.error("Error inserting classification:", error);
    next(error);
  }
};

export const updateClassification = async (req, res, next) => {
  try {
    const { classificationId } = req.params;
    const { classificationType, classificationDetails } = req.body;

    const classification = await Resident.updateClassification({
      classificationId,
      classificationType,
      classificationDetails,
    });

    if (!classification) {
      return next(new ApiError(404, "Classification not found"));
    }

    res.json({
      message: "Classification updated successfully",
      data: classification,
    });
  } catch (error) {
    logger.error("Error updating classification:", error);
    next(error);
  }
};

export const deleteClassification = async (req, res, next) => {
  try {
    const { classificationId } = req.params;
    const result = await Resident.deleteClassification({ classificationId });

    if (!result) {
      return next(new ApiError(404, "Classification not found"));
    }

    res.json({ message: "Classification deleted successfully" });
  } catch (error) {
    logger.error("Error deleting classification:", error);
    next(error);
  }
};

// =============================================================================
// CLASSIFICATION TYPES
// =============================================================================

export const getClassificationTypes = async (req, res, next) => {
  try {
    const municipalityId =
      req.query.municipalityId ||
      (req.user?.target_type === "municipality" ? req.user.target_id : null);

    if (!municipalityId) {
      return next(new ApiError(400, "municipalityId is required"));
    }

    const types = await Resident.getClassificationTypes({ municipalityId });
    res.json({ message: "Classification types retrieved", data: types });
  } catch (error) {
    logger.error("Error fetching classification types:", error);
    next(error);
  }
};

export const getClassificationTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const municipalityId = req.user?.target_id;

    const type = await Resident.getClassificationTypeById({ id, municipalityId });
    if (!type) return next(new ApiError(404, "Classification type not found"));

    res.json({ message: "Classification type retrieved", data: type });
  } catch (error) {
    logger.error("Error fetching classification type:", error);
    next(error);
  }
};

export const createClassificationType = async (req, res, next) => {
  try {
    let municipalityId = null;
    
    if (req.user?.target_type === "municipality") {
      municipalityId = req.user.target_id;
    } else if (req.user?.target_type === "barangay") {
      // Get municipality_id from barangay
      const barangayResult = await pool.query(
        'SELECT municipality_id FROM barangays WHERE id = $1',
        [req.user.target_id]
      );
      if (barangayResult.rows.length > 0) {
        municipalityId = barangayResult.rows[0].municipality_id;
      }
    }
    
    if (!municipalityId) {
      return next(new ApiError(400, "Unable to determine municipality"));
    }
    
    const { name, description, color, details } = req.body;

    const type = await Resident.createClassificationType({
      municipalityId,
      name,
      description,
      color,
      details,
    });

    res.status(201).json({ message: "Classification type created", data: type });
  } catch (error) {
    logger.error("Error creating classification type:", error);
    next(error);
  }
};

export const updateClassificationType = async (req, res, next) => {
  try {
    const { id } = req.params;
    let municipalityId = null;
    
    if (req.user?.target_type === "municipality") {
      municipalityId = req.user.target_id;
    } else if (req.user?.target_type === "barangay") {
      const barangayResult = await pool.query(
        'SELECT municipality_id FROM barangays WHERE id = $1',
        [req.user.target_id]
      );
      if (barangayResult.rows.length > 0) {
        municipalityId = barangayResult.rows[0].municipality_id;
      }
    }
    
    if (!municipalityId) {
      return next(new ApiError(400, "Unable to determine municipality"));
    }
    
    const { name, description, color, details } = req.body;

    const type = await Resident.updateClassificationType({
      id,
      municipalityId,
      name,
      description,
      color,
      details,
    });

    if (!type) return next(new ApiError(404, "Classification type not found"));
    res.json({ message: "Classification type updated", data: type });
  } catch (error) {
    logger.error("Error updating classification type:", error);
    next(error);
  }
};

export const deleteClassificationType = async (req, res, next) => {
  try {
    const { id } = req.params;
    let municipalityId = null;
    
    if (req.user?.target_type === "municipality") {
      municipalityId = req.user.target_id;
    } else if (req.user?.target_type === "barangay") {
      const barangayResult = await pool.query(
        'SELECT municipality_id FROM barangays WHERE id = $1',
        [req.user.target_id]
      );
      if (barangayResult.rows.length > 0) {
        municipalityId = barangayResult.rows[0].municipality_id;
      }
    }
    
    if (!municipalityId) {
      return next(new ApiError(400, "Unable to determine municipality"));
    }

    const type = await Resident.deleteClassificationType({ id, municipalityId });
    if (!type) return next(new ApiError(404, "Classification type not found"));

    res.json({ message: "Classification type deactivated", data: type });
  } catch (error) {
    logger.error("Error deleting classification type:", error);
    next(error);
  }
};
