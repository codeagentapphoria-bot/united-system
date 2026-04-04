import Statistics from "../services/statisticsServices.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";

export const getAgeDemographics = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getAgeDemographics({ barangayId, purokId });
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Controller error in getAgeDemographics:", error);
    next(new ApiError(500, "Failed to get age demographics"));
  }
};

export const getGenderDemographics = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getGenderDemographics({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Controller error in getGenderDemographics:", error);
    next(new ApiError(500, "Failed to get gender demographics"));
  }
};

export const getCivilStatusDemographics = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getCivilStatusDemographics({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Controller error in getCivilStatusDemographics:", error);
    next(new ApiError(500, "Failed to get civil status demographics"));
  }
};

export const getEducationalAttainmentDemographics = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getEducationalAttainmentDemographics({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error(
      "Controller error in getEducationalAttainmentDemographics:",
      error
    );
    next(
      new ApiError(500, "Failed to get educational attainment demographics")
    );
  }
};

export const getEmploymentStatusDemographics = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getEmploymentStatusDemographics({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Controller error in getEmploymentStatusDemographics:", error);
    next(new ApiError(500, "Failed to get employment status demographics"));
  }
};

export const getHouseholdSizeDemographics = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getHouseholdSizeDemographics({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Controller error in getHouseholdSizeDemographics:", error);
    next(new ApiError(500, "Failed to get household size demographics"));
  }
};

export const getTotalFemaleTotalmaleTotalPopulation = async (
  req,
  res,
  next
) => {
  try {
    const { barangayId, purokId, classificationType } = req.query;
    const data = await Statistics.getTotalFemaleTotalmaleTotalPopulation({
      barangayId,
      purokId,
      classificationType,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error(
      "Controller error in getTotalFemaleTotalmaleTotalPopulation:",
      error
    );
    next(new ApiError(500, "Failed to get total female, male, and population"));
  }
};

export const getResidentClassificationDemographics = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getResidentClassificationDemographics({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error(
      "Controller error in getResidentClassificationDemographics:",
      error
    );
    next(
      new ApiError(500, "Failed to get resident classification demographics")
    );
  }
};

export const getVoterDemographics = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getVoterDemographics({ barangayId, purokId });
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Controller error in getVoterDemographics:", error);
    next(new ApiError(500, "Failed to get voter demographics"));
  }
};

export const getTotalHouseholdsAndAddedThisMonth = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getTotalHouseholdsAndAddedThisMonth({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error(
      "Controller error in getTotalHouseholdsAndAddedThisMonth:",
      error
    );
    next(
      new ApiError(500, "Failed to get total households and added this month")
    );
  }
};

export const getTotalFamiliesAndAddedThisMonth = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getTotalFamiliesAndAddedThisMonth({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error(
      "Controller error in getTotalFamiliesAndAddedThisMonth:",
      error
    );
    next(
      new ApiError(500, "Failed to get total families and added this month")
    );
  }
};

export const getTotalRegisteredPetsAndAddedThisMonth = async (
  req,
  res,
  next
) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getTotalRegisteredPetsAndAddedThisMonth({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error(
      "Controller error in getTotalRegisteredPetsAndAddedThisMonth:",
      error
    );
    next(new ApiError(500, "Failed to get total registered pets"));
  }
};

export const getUnemployedHouseholdStats = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getUnemployedHouseholdStats({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Controller error in getUnemployedHouseholdStats:", error);
    next(new ApiError(500, "Failed to get unemployed household statistics"));
  }
};

export const getUnemployedHouseholdDetails = async (req, res, next) => {
  try {
    const { barangayId, purokId } = req.query;
    const data = await Statistics.getUnemployedHouseholdDetails({
      barangayId,
      purokId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Controller error in getUnemployedHouseholdDetails:", error);
    next(new ApiError(500, "Failed to get unemployed household details"));
  }
};

export const getTotalRequestsAndCompleted = async (req, res, next) => {
  try {
    const { barangayId } = req.query;
    const data = await Statistics.getTotalRequestsAndCompleted({
      barangayId,
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error("Controller error in getTotalRequestsAndCompleted:", error);
    next(new ApiError(500, "Failed to get total requests and completed"));
  }
};
