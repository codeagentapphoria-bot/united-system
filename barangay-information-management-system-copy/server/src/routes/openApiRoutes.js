import express from "express";
import { apiKeyAuth } from "../middlewares/apiKeyAuth.js";
import { listResidents, listHouseholds, listFamilies, listBarangays, getStatistics } from "../controllers/openApiControllers.js";

const router = express.Router();

// All routes here require API key auth with granular scopes
router.get("/residents", apiKeyAuth(["residents.read"]), listResidents);
router.get("/households", apiKeyAuth(["households.read"]), listHouseholds);
router.get("/families", apiKeyAuth(["families.read"]), listFamilies);
router.get("/barangays", apiKeyAuth(["barangays.read"]), listBarangays);
router.get("/statistics", apiKeyAuth(["statistics.read"]), getStatistics);

export default router;


