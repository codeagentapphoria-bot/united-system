/**
 * barangayRoutes.js
 *
 * BIMS Barangay routes — Updated for new architecture.
 *
 * REMOVED:
 *   POST /barangay              — Barangays are now auto-created from GeoJSON during
 *                                 municipality setup (see setupRoutes.js)
 *   DELETE /:barangayId/barangay
 *   All purok routes            — Puroks removed from system
 *   POST /generate-setup-token  — Old manual setup flow removed
 *   POST /validate-setup-token
 *   POST /import/:barangayId/residents  — Residents come from portal
 *   POST /import/:barangayId/households — Households come from portal
 *
 * KEPT:
 *   Barangay READ routes
 *   PUT /:barangayId/barangay   — Update barangay settings (logo, contact, certificate bg)
 *   Officials CRUD
 *   Export routes
 */

import express from "express";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import {
  upsertBarangay,
  barangayList,
  barangayInfo,
  upsertOfficial,
  officialList,
  officialInfo,
  deleteOfficial,
  exportBarangayData,
  exportResidents,
  exportHouseholds,
  generateSetupToken,
  validateSetupToken,
} from "../controllers/barangayControllers.js";
import { allUsers, municipalityUsersOnly } from "../middlewares/auth.js";
import createUploader from "../middlewares/createUploader.js";

const router = express.Router();

// =============================================================================
// PUBLIC routes (no auth)
// =============================================================================

router.get("/public/list/barangay", smartCache(), barangayList);
router.get("/public/list/:barangayId/official", smartCache(), officialList);
router.get("/public/:barangayId/barangay", smartCache(), barangayInfo);
router.post("/generate-setup-token", generateSetupToken);
router.post("/validate-setup-token", validateSetupToken);

// =============================================================================
// READ routes
// =============================================================================

router.get("/list/barangay", smartCache(), ...allUsers, barangayList);
router.get("/:barangayId/barangay", smartCache(), ...allUsers, barangayInfo);

// =============================================================================
// UPDATE barangay settings (logo, certificate backgrounds, contact info)
// Barangay creation is now done automatically during municipality setup.
// =============================================================================

router.put(
  "/:barangayId/barangay",
  ...allUsers,
  createUploader(
    () => "uploads/barangays",
    [
      { name: "barangayLogoPath", maxCount: 1 },
      { name: "certificateBackgroundPath", maxCount: 1 },
      { name: "organizationalChartPath", maxCount: 1 },
    ]
  ),
  upsertBarangay,
  smartInvalidateCache()
);

// =============================================================================
// OFFICIALS (CRUD — barangay still manages officials)
// =============================================================================

router.get("/list/:barangayId/official", smartCache(), ...allUsers, officialList);
router.get("/:officialId/official", smartCache(), ...allUsers, officialInfo);
router.post("/official", ...allUsers, upsertOfficial, smartInvalidateCache());
router.put("/:officialId/official", ...allUsers, upsertOfficial, smartInvalidateCache());
router.delete("/:officialId/official", ...allUsers, deleteOfficial, smartInvalidateCache());

// =============================================================================
// EXPORT routes
// =============================================================================

router.get("/export/:barangayId/barangay-data", ...allUsers, exportBarangayData);
router.get("/export/:barangayId/residents", ...allUsers, exportResidents);
router.get("/export/:barangayId/households", ...allUsers, exportHouseholds);

export default router;
