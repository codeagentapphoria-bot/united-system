import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Pet from "../services/petsServices.js";

export const upsertPet = async (req, res, next) => {
  let {
    ownerId,
    petName,
    species,
    breed,
    sex,
    birthdate,
    color,
    description,
    picturePath, // Accept picturePath from body (for mobile sync)
    _metadata,
  } = req.body;
  const { petId } = req.params;
  
  // Handle picturePath from file upload OR JSON payload (for mobile sync)
  const finalPicturePath = picturePath || req.files?.picturePath?.[0]?.path;

  // Debug logging
  console.log('🐾 Pet upsert request:', {
    picturePathFromBody: picturePath,
    picturePathFromFile: req.files?.picturePath?.[0]?.path,
    finalPicturePath: finalPicturePath,
  });

  try {
    let result;
    if (!petId) {
      result = await Pet.insertPet({
        ownerId,
        petName,
        species,
        breed,
        sex,
        birthdate,
        color,
        picturePath: finalPicturePath,
        description,
      });
    } else {
      // Parse metadata if provided
      let parsedMetadata = null;
      if (_metadata) {
        try {
          parsedMetadata =
            typeof _metadata === "string" ? JSON.parse(_metadata) : _metadata;
        } catch (error) {
          logger.warn("Failed to parse metadata:", error);
        }
      }

      // For updates, only include picturePath if a new image is provided
      const updateData = {
        petId,
        ownerId,
        petName,
        species,
        breed,
        sex,
        birthdate,
        color,
        description,
      };

      // Only add picturePath if a new image was uploaded or provided in body
      if (finalPicturePath) {
        updateData.picturePath = finalPicturePath;
      }

      // Add metadata for partial updates
      if (parsedMetadata) {
        updateData._metadata = parsedMetadata;
      }

      result = await Pet.updatePet(updateData);
    }
    return res.status(200).json({
      message: "Successfully upserted pet",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in upsertPet: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const deletePet = async (req, res, next) => {
  const { petId } = req.params;
  try {
    const result = await Pet.deletePet(petId);
    return res.status(200).json({
      message: "Successfully deleted pet",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in deletePet: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const petList = async (req, res, next) => {
  try {
    const {
      ownerId,
      species,
      search = "",
      page = 1,
      perPage = 10,
      sortBy = "pet_name",
      sortOrder = "asc",
      barangayId,
      purokId,
    } = req.query;

    // For barangay users, don't filter by barangayId unless explicitly provided
    if (!barangayId && req.user?.target_type === "barangay") {
      barangayId = req.user?.target_id;
    }

    const result = await Pet.petList({
      ownerId,
      species,
      search,
      page: Number(page),
      perPage: Number(perPage),
      sortBy,
      sortOrder,
      barangayId,
      purokId,
      userTargetType: req.user?.target_type,
      userTargetId: req.user?.target_id,
    });
    return res.status(200).json({
      message: "Successfully fetched pets list",
      ...result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in petList: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const petInfo = async (req, res, next) => {
  const { petId } = req.params;
  try {
    const result = await Pet.petInfo(petId);
    return res.status(200).json({
      message: "Successfully fetched pet info",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in petInfo: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const getPetsByHousehold = async (req, res, next) => {
  const { householdId } = req.params;
  try {
    const result = await Pet.getPetsByHousehold(householdId);
    return res.status(200).json({
      message: "Successfully fetched pets by household",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in getPetsByHousehold: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const getPetsByOwner = async (req, res, next) => {
  const { ownerId } = req.params;
  try {
    const result = await Pet.getPetsByOwner(ownerId);
    return res.status(200).json({
      message: "Successfully fetched pets by owner",
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in getPetsByOwner: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const searchPets = async (req, res, next) => {
  const { pet_uuid } = req.body;
  try {
    // Security: Only UUID-based search is allowed to prevent enumeration attacks
    if (!pet_uuid) {
      return next(new ApiError(400, "Pet UUID is required"));
    }
    
    const result = await Pet.searchPets({ pet_uuid });
    return res.status(200).json({
      message: "Successfully searched pets",
      pets: result,
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in searchPets: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};
