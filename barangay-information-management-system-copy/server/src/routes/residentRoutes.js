/**
 * residentRoutes.js
 *
 * BIMS Resident routes — READ ONLY.
 *
 * Residents are no longer created/updated/deleted in BIMS.
 * All registration happens through the portal (E-Services).
 * BIMS staff can VIEW residents and manage classifications only.
 *
 * Removed routes:
 *   POST /resident            (use portal registration instead)
 *   PUT  /:residentId/resident (use portal or E-Services admin)
 *   DELETE /:residentId/resident
 *   POST /sync/resident        (mobile app removed)
 *   POST /sync/resident/json
 *   POST /sync/resident/image
 *   POST /sync/resident-classification
 */

import express from "express";
import { allUsers, municipalityUsersOnly } from "../middlewares/auth.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import {
  residentList,
  residentInfo,
  residentInfoForQR,
  publicResidentInfoForQR,
  insertClassification,
  classificationList,
  updateClassification,
  deleteClassification,
  getClassificationTypes,
  getClassificationTypeById,
  createClassificationType,
  updateClassificationType,
  deleteClassificationType,
} from "../controllers/residentControllers.js";

const router = express.Router();

// =============================================================================
// READ ROUTES
// =============================================================================

router.get("/list/residents", smartCache(), ...allUsers, residentList);
router.get("/:residentId/resident", smartCache(), ...allUsers, residentInfo);

// Public QR scan (no auth)
router.get("/public/:residentId/resident/public-qr", publicResidentInfoForQR);

// =============================================================================
// CLASSIFICATION MANAGEMENT (BIMS staff still manages these)
// =============================================================================

router.get("/list/classification", smartCache(), ...allUsers, classificationList);
router.post("/classification", ...allUsers, insertClassification, smartInvalidateCache());
router.put("/classification/:classificationId", ...allUsers, updateClassification, smartInvalidateCache());
router.delete("/classification/:classificationId", ...allUsers, deleteClassification, smartInvalidateCache());

// Classification Types
router.get("/classification-types", smartCache(), ...allUsers, getClassificationTypes);
router.get("/classification-types/:id", smartCache(), ...allUsers, getClassificationTypeById);
router.post("/classification-types", ...allUsers, createClassificationType, smartInvalidateCache());
router.put("/classification-types/:id", ...allUsers, updateClassificationType, smartInvalidateCache());
router.delete("/classification-types/:id", ...allUsers, deleteClassificationType, smartInvalidateCache());

export default router;
