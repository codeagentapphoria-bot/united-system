import express from "express";
import {
  updateMunicipality,
  municipalityInfo,
  getMunicipalityById,
  exportResidents,
  exportHouseholds,
  checkMunicipalityConflicts,
} from "../controllers/municipalityControllers.js";
import { allUsers } from "../middlewares/auth.js";
import createUploader from "../middlewares/createUploader.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";

const router = express.Router();

router.get("/municipality", smartCache(), ...allUsers, municipalityInfo);
router.get("/municipality/:municipalityId", smartCache(), ...allUsers, getMunicipalityById);
router.get("/municipality/:municipalityId/conflicts", ...allUsers, checkMunicipalityConflicts);
router.get("/export/residents", ...allUsers, exportResidents);
router.get("/export/households", ...allUsers, exportHouseholds);
router.put(
  "/:municipalityId/municipality",
  createUploader(
    () => "uploads/municipalities",
    [
      { name: "municipalityLogoPath", maxCount: 1 },
      { name: "idBackgroundFrontPath", maxCount: 1 },
      { name: "idBackgroundBackPath", maxCount: 1 },
    ]
  ),
  updateMunicipality,
  smartInvalidateCache()
);

export default router;
