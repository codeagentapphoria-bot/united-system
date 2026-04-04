import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Household from "../services/householdServices.js";
import { application } from "express";
import { pool } from "../config/db.js";

export const upsertHousehold = async (req, res, next) => {
  // Helper function to parse form data values
  const parseFormValue = (value) => {
    if (value === "null" || value === "undefined" || value === "") {
      return null;
    }
    if (value === "true") return true;
    if (value === "false") return false;
    // Only convert to number if it's not an empty string and is a valid number
    if (
      value !== "" &&
      !isNaN(value) &&
      value !== null &&
      value !== undefined
    ) {
      return Number(value);
    }
    return value;
  };

  const {
    houseNumber,
    street,
    purokId,
    barangayId: bodyBarangayId,
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
  } = req.body;

  // Debug: Log the raw values being received
  console.log("Raw form values received:", {
    houseNumber,
    street,
    purokId,
    housingType,
    structureType,
    electricity,
    waterSource,
    toiletFacility,
    area,
  });

  // Parse form data values to handle string "null" and other conversions
  const parsedHouseNumber = parseFormValue(houseNumber);
  const parsedStreet = parseFormValue(street);
  const parsedPurokId = parseFormValue(purokId);
  const parsedHousingType = parseFormValue(housingType);
  const parsedStructureType = parseFormValue(structureType);
  const parsedElectricity = parseFormValue(electricity);
  const parsedWaterSource = parseFormValue(waterSource);
  const parsedToiletFacility = parseFormValue(toiletFacility);
  const parsedArea = parseFormValue(area);

  // Debug: Log the parsed values
  console.log("Parsed form values:", {
    parsedHouseNumber,
    parsedStreet,
    parsedPurokId,
    parsedHousingType,
    parsedStructureType,
    parsedElectricity,
    parsedWaterSource,
    parsedToiletFacility,
    parsedArea,
  });

  // Parse geom if it's a string
  let parsedGeom = null;
  if (geom) {
    try {
      if (typeof geom === "string") {
        // Check if it's already a GeoJSON string from database
        if (geom.startsWith('{"type":"Point"')) {
          // It's already GeoJSON, parse it to extract coordinates
          const geoJson = JSON.parse(geom);
          if (geoJson.type === "Point" && geoJson.coordinates) {
            const [lng, lat] = geoJson.coordinates;
            parsedGeom = { lat: lat, lng: lng };
          }
        } else {
          // Try to parse as regular JSON
          parsedGeom = JSON.parse(geom);
        }
      } else {
        parsedGeom = geom;
      }
    } catch (error) {
      logger.warn("Failed to parse geom JSON:", error);
      parsedGeom = null;
    }
  }

  // Parse families if it's a string
  let parsedFamilies = null;
  if (families) {
    try {
      parsedFamilies =
        typeof families === "string" ? JSON.parse(families) : families;
    } catch (error) {
      logger.warn("Failed to parse families JSON:", error);
      parsedFamilies = null;
    }
  }

  // Parse metadata if it's a string
  let parsedMetadata = null;
  if (_metadata) {
    try {
      parsedMetadata =
        typeof _metadata === "string" ? JSON.parse(_metadata) : _metadata;
    } catch (error) {
      logger.warn("Failed to parse metadata JSON:", error);
      parsedMetadata = null;
    }
  }

  const householdId = req.params.householdId;
  const barangayId = bodyBarangayId || req.user?.target_id;

  // Handle uploaded images - only store the filename/path
  let processedImages = [];

  // Check for existing images from FormData
  let existingImages = [];
  if (req.body.existing_images) {
    try {
      existingImages =
        typeof req.body.existing_images === "string"
          ? JSON.parse(req.body.existing_images)
          : req.body.existing_images;
    } catch (error) {
      logger.warn("Failed to parse existing_images JSON:", error);
      existingImages = [];
    }
  }

  if (req.files?.household_image_path) {
    // New files uploaded via FormData
    const newImages = req.files.household_image_path.map(
      (file) => file.filename
    );
    // Combine existing and new images
    processedImages = [...existingImages, ...newImages];
  } else if (household_image_path) {
    // If images are passed as JSON string, parse them
    try {
      const parsedImages =
        typeof household_image_path === "string"
          ? JSON.parse(household_image_path)
          : household_image_path;

      // Extract only the filename/path from each image object
      processedImages = parsedImages.map((img) => {
        if (typeof img === "string") return img;
        return img.filename || img.path || img;
      });
    } catch (error) {
      logger.warn("Failed to parse images JSON:", error);
      processedImages = [];
    }
  } else {
    // No new files, just use existing images
    processedImages = existingImages;
  }

  try {
    let result;
    if (!householdId) {
      result = await Household.insertHousehold({
        houseNumber: parsedHouseNumber,
        street: parsedStreet,
        purokId: parsedPurokId,
        barangayId,
        houseHead,
        housingType: parsedHousingType,
        structureType: parsedStructureType,
        electricity: parsedElectricity,
        waterSource: parsedWaterSource,
        toiletFacility: parsedToiletFacility,
        geom: parsedGeom,
        area: parsedArea,
        families: parsedFamilies,
        household_image_path: processedImages,
      });
    } else {
      // Handle partial updates with old data
      const updateData = {
        householdId,
      };

      // Only include fields that are actually provided (not undefined)
      if (parsedHouseNumber !== undefined)
        updateData.houseNumber = parsedHouseNumber;
      if (parsedStreet !== undefined) updateData.street = parsedStreet;
      if (parsedPurokId !== undefined) updateData.purokId = parsedPurokId;
      if (barangayId !== undefined) updateData.barangayId = barangayId;
      if (houseHead !== undefined) updateData.houseHead = houseHead;
      if (parsedHousingType !== undefined)
        updateData.housingType = parsedHousingType;
      if (parsedStructureType !== undefined)
        updateData.structureType = parsedStructureType;
      if (parsedElectricity !== undefined)
        updateData.electricity = parsedElectricity;
      if (parsedWaterSource !== undefined)
        updateData.waterSource = parsedWaterSource;
      if (parsedToiletFacility !== undefined)
        updateData.toiletFacility = parsedToiletFacility;
      if (parsedGeom !== undefined) updateData.geom = parsedGeom;
      if (parsedArea !== undefined) updateData.area = parsedArea;
      if (parsedFamilies !== undefined) updateData.families = parsedFamilies;
      if (processedImages !== undefined)
        updateData.household_image_path = processedImages;

      // If metadata is provided, include it for partial updates
      if (parsedMetadata) {
        updateData._metadata = parsedMetadata;
      }

      result = await Household.updateHousehold(updateData);
    }

    return res.status(200).json({
      message: "Successfully upserted a household",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in upsertHousehold: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const deleteHousehold = async (req, res, next) => {
  const householdId = req.params.householdId;
  try {
    if (!householdId) {
      return next(new ApiError(400, "Missing required field householdId"));
    }

    const result = await Household.deleteHousehold(householdId);

    if (!result) {
      return next(
        new ApiError(404, `Household with ID: ${householdId} does not exist`)
      );
    }

    return res.status(200).json({
      message: "Successfully deleted household",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in deleteHousehold: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const householdList = async (req, res, next) => {
  const {
    barangayId: queryBarangayId,
    purokId,
    search,
    page,
    perPage,
    sortBy,
    sortOrder,
  } = req.query;

  // For municipality users, don't filter by barangayId unless explicitly provided
  // This allows them to see all households across all barangays
  let barangayId = queryBarangayId;
  if (!barangayId && req.user?.target_type === "barangay") {
    barangayId = req.user?.target_id;
  }

  try {
    const result = await Household.householdList({
      barangayId,
      purokId,
      search,
      page,
      perPage,
      sortBy,
      sortOrder,
      userTargetType: req.user?.target_type,
      userTargetId: req.user?.target_id,
    });

    return res.status(200).json({
      message: "Successfully fetch household list",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in householdList: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const householdInfo = async (req, res, next) => {
  const householdId = req.params.householdId;
  try {
    if (!householdId) {
      return next(new ApiError(400, "Missing required field householdId"));
    }

    const result = await Household.householdInfo(householdId);

    if (!result) {
      return next(
        new ApiError(404, `Household with ID: ${householdId} does not exist`)
      );
    }

    return res.status(200).json({
      message: "Successfully fetch household information",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in householdInfo: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const householdFamilyCount = async (req, res, next) => {
  try {
    const result = await Household.householdFamilyCount();

    return res.status(200).json({
      message: "Successfully fetch household family count",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in householdFamilyCount: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const checkHouseholdByHouseHead = async (req, res, next) => {
  try {
    const { houseHeadId } = req.params;

    if (!houseHeadId) {
      return next(new ApiError(400, "House head ID is required"));
    }

    const existingHousehold = await Household.checkResidentInHousehold(
      houseHeadId
    );

    return res.status(200).json({
      message: "Successfully checked resident in household",
      data: {
        hasHousehold: !!existingHousehold,
        household: existingHousehold,
        role: existingHousehold?.role || null,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error(
      "Controller error in checkHouseholdByHouseHead: ",
      error.message
    );
    return next(new ApiError(500, "Internal server error"));
  }
};

export const getHouseholdLocations = async (req, res, next) => {
  const { barangayId: queryBarangayId } = req.query;

  try {
    // Authorization logic based on user type
    let barangayId = null;

    if (req.user?.target_type === "barangay") {
      // Barangay users can only see their own barangay's households
      barangayId = req.user.target_id;
    } else if (req.user?.target_type === "municipality") {
      // Municipality users can see all barangays within their municipality
      // Only allow querying specific barangay if it belongs to their municipality
      if (queryBarangayId) {
        // Validate that the requested barangay belongs to the user's municipality
        const barangayCheck = await pool.query(
          "SELECT id FROM barangays WHERE id = $1 AND municipality_id = $2",
          [queryBarangayId, req.user.target_id]
        );

        if (barangayCheck.rows.length === 0) {
          return next(
            new ApiError(
              403,
              "Access denied: Barangay not in your municipality"
            )
          );
        }

        barangayId = queryBarangayId;
      }
      // If no specific barangay requested, show all barangays in municipality (handled in service)
    } else {
      return next(new ApiError(403, "Access denied: Invalid user type"));
    }

    const result = await Household.getHouseholdLocations({
      barangayId,
      userTargetType: req.user?.target_type,
      userTargetId: req.user?.target_id,
    });

    return res.status(200).json({
      message: "Successfully fetch household locations",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in getHouseholdLocations: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const syncHousehold = async (req, res, next) => {
  const { householdData, familiesData } = req.body;

  if (!householdData) {
    return next(new ApiError(400, "Household data is required"));
  }

  // Note: ID is not required for sync - server will generate its own ID

  if (!householdData.barangayId) {
    // Use barangayId from user token if not provided
    householdData.barangayId = req.user?.target_id;
  }

  if (!householdData.barangayId) {
    return next(new ApiError(400, "Barangay ID is required"));
  }

  if (!householdData.houseHead) {
    return next(new ApiError(400, "House head is required"));
  }

  try {
    const result = await Household.syncHousehold({
      householdData,
      familiesData: familiesData || [],
    });

    return res.status(200).json({
      message: "Successfully synced household",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in syncHousehold: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};