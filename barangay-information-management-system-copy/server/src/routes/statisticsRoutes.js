import express from "express";
import { smartCache } from "../middlewares/smartCache.js";
import { optionalApiKeyAuth } from "../middlewares/apiKeyAuth.js";
import { allUsers } from "../middlewares/auth.js";
import {
  getAgeDemographics,
  getGenderDemographics,
  getCivilStatusDemographics,
  getEducationalAttainmentDemographics,
  getEmploymentStatusDemographics,
  getHouseholdSizeDemographics,
  getTotalFemaleTotalmaleTotalPopulation,
  getResidentClassificationDemographics,
  getVoterDemographics,
  getTotalHouseholdsAndAddedThisMonth,
  getTotalFamiliesAndAddedThisMonth,
  getTotalRegisteredPetsAndAddedThisMonth,
  getUnemployedHouseholdStats,
  getUnemployedHouseholdDetails,
  getTotalRequestsAndCompleted,
  getAllBarangayStats,
  getBarangayDistribution,
} from "../controllers/statisticsControllers.js";

const router = express.Router();

// Auth guard: accepts either a valid API key (statistics.read scope) or a JWT session.
// Must come before smartCache so unauthenticated requests never reach the cache layer.
const statsAuth = [optionalApiKeyAuth(["statistics.read"]), ...allUsers];

router.get("/age-demographics", ...statsAuth, smartCache(), getAgeDemographics);
router.get("/gender-demographics", ...statsAuth, smartCache(), getGenderDemographics);
router.get("/civil-status-demographics", ...statsAuth, smartCache(), getCivilStatusDemographics);
router.get(
  "/educational-attainment-demographics",
  ...statsAuth, smartCache(),
  getEducationalAttainmentDemographics
);
router.get("/employment-status-demographics", ...statsAuth, smartCache(), getEmploymentStatusDemographics);
router.get("/household-size-demographics", ...statsAuth, smartCache(), getHouseholdSizeDemographics);
router.get("/total-population", ...statsAuth, smartCache(), getTotalFemaleTotalmaleTotalPopulation);
router.get(
  "/resident-classification-demographics",
  ...statsAuth, smartCache(),
  getResidentClassificationDemographics
);
router.get("/voter-demographics", ...statsAuth, smartCache(), getVoterDemographics);
router.get("/total-households", ...statsAuth, smartCache(), getTotalHouseholdsAndAddedThisMonth);
router.get("/total-families", ...statsAuth, smartCache(), getTotalFamiliesAndAddedThisMonth);
router.get("/total-registered-pets", ...statsAuth, smartCache(), getTotalRegisteredPetsAndAddedThisMonth);
router.get("/unemployed-household-stats", ...statsAuth, smartCache(), getUnemployedHouseholdStats);
router.get("/unemployed-household-details", ...statsAuth, smartCache(), getUnemployedHouseholdDetails);
router.get("/total-requests", ...statsAuth, smartCache(), getTotalRequestsAndCompleted);
router.get("/all-barangay-stats", ...statsAuth, smartCache(), getAllBarangayStats);
router.get("/barangay-distribution", ...statsAuth, smartCache(), getBarangayDistribution);

export default router;
