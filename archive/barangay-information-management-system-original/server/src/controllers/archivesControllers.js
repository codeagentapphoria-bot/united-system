import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";
import Archive from "../services/archivesServices.js";

export const upsertArchive = async (req, res, next) => {
  let {
    title,
    documentType,
    description,
    author,
    signatory,
    relateResident
  } = req.body;
  const { archiveId } = req.params;
  const barangayId = req.user?.target_id;
  
  // Support file upload
  let filePath = req.files?.filePath?.[0]?.path || req.body.filePath;

  if (!barangayId) {
    return next(new ApiError(400, "Barangay ID is required"));
  }

  try {
    let result;
    if (!archiveId) {
      result = await Archive.insertArchive({
        barangayId,
        title,
        documentType,
        description,
        author,
        signatory,
        relateResident,
        filePath
      });
    } else {
      result = await Archive.updateArchive({
        archiveId,
        barangayId,
        title,
        documentType,
        description,
        author,
        signatory,
        relateResident,
        filePath
      });
    }
    return res.status(200).json({
      message: "Successfully upserted archive",
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in upsertArchive: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const deleteArchive = async (req, res, next) => {
  const { archiveId } = req.params;
  try {
    const result = await Archive.deleteArchive(archiveId);
    return res.status(200).json({
      message: "Successfully deleted archive",
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in deleteArchive: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const archiveList = async (req, res, next) => {
  try {
    const {
      title,
      documentType,
      author,
      search = '',
      page = 1,
      perPage = 10
    } = req.query;
    const barangayId = req.user?.target_id;
    
    if (!barangayId) {
      return next(new ApiError(400, "Barangay ID is required"));
    }
    
    const result = await Archive.archiveList({
      barangayId,
      title,
      documentType,
      author,
      search,
      page: Number(page),
      perPage: Number(perPage)
    });
    return res.status(200).json({
      message: "Successfully fetched archives list",
      ...result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in archiveList: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
};

export const archiveInfo = async (req, res, next) => {
  const { archiveId } = req.params;
  try {
    const result = await Archive.archiveInfo(archiveId);
    return res.status(200).json({
      message: "Successfully fetched archive info",
      data: result
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    logger.error("Controller error in archiveInfo: ", error.message);
    return next(new ApiError(500, "Internal server error"));
  }
}; 