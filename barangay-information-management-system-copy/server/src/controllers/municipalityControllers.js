import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Municipality from "../services/municipalityServices.js";
import Counter from "../services/counterServices.js";

export const updateMunicipality = async (req, res, next) => {
  const { 
    municipalityName, 
    municipalityCode, 
    region, 
    province, 
    description, 
    gisCode,
    removeMunicipalityLogoPath,
    removeIdBackgroundFrontPath,
    removeIdBackgroundBackPath
  } = req.body;
  
  const municipalityLogoPath = req.files?.municipalityLogoPath?.[0]?.path;
  const idBackgroundFrontPath = req.files?.idBackgroundFrontPath?.[0]?.path;
  const idBackgroundBackPath = req.files?.idBackgroundBackPath?.[0]?.path;

  const { municipalityId } = req.params;

  if (!municipalityId) {
    logger.error("Municipality ID is missing");
    return next(new ApiError(400, "Missing required field municipalityId"));
  }

  try {
    // Update municipality information
    const result = await Municipality.updateMunicipality({
      municipalityId,
      municipalityName,
      municipalityCode,
      region,
      province,
      description,
      gisCode,
      municipalityLogoPath: municipalityLogoPath || null, // Only update if new file provided
      idBackgroundFrontPath: idBackgroundFrontPath || null, // Only update if new file provided
      idBackgroundBackPath: idBackgroundBackPath || null, // Only update if new file provided
      removeMunicipalityLogoPath: removeMunicipalityLogoPath === "true",
      removeIdBackgroundFrontPath: removeIdBackgroundFrontPath === "true",
      removeIdBackgroundBackPath: removeIdBackgroundBackPath === "true",
    });

    // Update prefix if municipality code is provided
    if (municipalityCode) {
      try {
        await Counter.updatePrefix(municipalityCode, municipalityId);
        logger.info(
          `Prefix updated to: ${municipalityCode} for municipality: ${municipalityName}`
        );
      } catch (prefixError) {
        logger.error("Failed to update prefix:", prefixError);
        // Don't fail the entire request if prefix update fails
      }
    }

    return res.status(200).json({
      message: "Successfully updated municipality",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    // Handle duplicate municipality name error
    if (error.code === '23505' && error.constraint === 'municipalities_municipality_name_key') {
      logger.error("Duplicate municipality name error: ", error.message);
      return next(new ApiError(409, `Municipality with name "${municipalityName}" already exists. Please use a different name.`));
    }

    // Handle duplicate municipality code error (if municipality_code has unique constraint)
    if (error.code === '23505' && error.constraint === 'municipalities_municipality_code_key') {
      logger.error("Duplicate municipality code error: ", error.message);
      return next(new ApiError(409, `Municipality with code "${municipalityCode}" already exists. Please use a different code.`));
    }

    logger.error("Controller error in updateMunicipality", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const municipalityInfo = async (req, res, next) => {
  try {
    // Get municipality ID from user's target_id
    const municipalityId = req.user?.target_id;

    if (!municipalityId) {
      logger.error("User target_id is missing");
      return next(new ApiError(400, "Missing user target_id"));
    }

    // Fetch municipality information by ID
    const result = await Municipality.municipalityInfoById(municipalityId);

    return res.status(200).json({
      message: "Successfully fetch municipality information",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in municipalityInfo: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const getMunicipalityById = async (req, res, next) => {
  try {
    const { municipalityId } = req.params;

    if (!municipalityId) {
      logger.error("Municipality ID is missing from params");
      return next(new ApiError(400, "Missing municipality ID"));
    }

    // Fetch municipality information by ID
    const result = await Municipality.municipalityInfoById(municipalityId);

    return res.status(200).json({
      message: "Successfully fetch municipality information",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in getMunicipalityById: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const checkMunicipalityConflicts = async (req, res, next) => {
  try {
    const { municipalityName, municipalityCode } = req.query;
    const { municipalityId } = req.params; // For excluding current municipality in updates

    if (!municipalityName && !municipalityCode) {
      return next(new ApiError(400, "At least one of municipalityName or municipalityCode is required"));
    }

    const result = await Municipality.checkForConflicts(
      municipalityName || "",
      municipalityCode || "",
      municipalityId || null
    );

    return res.status(200).json({
      message: "Conflict check completed",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in checkMunicipalityConflicts: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const exportResidents = async (req, res, next) => {
  try {
    const municipalityId = req.user?.target_id;

    if (!municipalityId) {
      logger.error("Municipality ID is missing from user target_id");
      return next(new ApiError(400, "Missing municipality ID"));
    }

    // Extract filters from query parameters
    const filters = {
      barangayId: req.query.barangayId,
      search: req.query.search,
      classificationType: req.query.classificationType,
    };

    const result = await Municipality.exportResidents(municipalityId, filters);

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="municipality-residents-export-${
        new Date().toISOString().split("T")[0]
      }.xlsx"`
    );

    return res.send(result);
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in exportResidents:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const exportHouseholds = async (req, res, next) => {
  try {
    const municipalityId = req.user?.target_id;

    if (!municipalityId) {
      logger.error("Municipality ID is missing from user target_id");
      return next(new ApiError(400, "Missing municipality ID"));
    }

    // Extract filters from query parameters
    const filters = {
      barangayId: req.query.barangayId,
      search: req.query.search,
    };

    const result = await Municipality.exportHouseholds(municipalityId, filters);

    // Set response headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="municipality-households-export-${
        new Date().toISOString().split("T")[0]
      }.xlsx"`
    );

    return res.send(result);
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in exportHouseholds:", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};
