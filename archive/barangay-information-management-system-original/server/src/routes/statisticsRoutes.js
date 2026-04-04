import express from "express";
import { smartCache } from "../middlewares/smartCache.js";
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
} from "../controllers/statisticsControllers.js";

const router = express.Router();

router.get("/age-demographics", smartCache(), getAgeDemographics);
router.get("/gender-demographics", smartCache(), getGenderDemographics);
router.get("/civil-status-demographics", smartCache(), getCivilStatusDemographics);
router.get(
  "/educational-attainment-demographics",
  smartCache(),
  getEducationalAttainmentDemographics
);
router.get("/employment-status-demographics", smartCache(), getEmploymentStatusDemographics);
router.get("/household-size-demographics", smartCache(), getHouseholdSizeDemographics);
router.get("/total-population", smartCache(), getTotalFemaleTotalmaleTotalPopulation);
router.get(
  "/resident-classification-demographics",
  smartCache(),
  getResidentClassificationDemographics
);
router.get("/voter-demographics", smartCache(), getVoterDemographics);
router.get("/total-households", smartCache(), getTotalHouseholdsAndAddedThisMonth);
router.get("/total-families", smartCache(), getTotalFamiliesAndAddedThisMonth);
router.get("/total-registered-pets", smartCache(), getTotalRegisteredPetsAndAddedThisMonth);
router.get("/unemployed-household-stats", smartCache(), getUnemployedHouseholdStats);
router.get("/unemployed-household-details", smartCache(), getUnemployedHouseholdDetails);
router.get("/total-requests", smartCache(), getTotalRequestsAndCompleted);

export default router;
