import express from "express";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import {
  upsertBarangay,
  upsertPurok,
  barangayList,
  barangayInfo,
  deleteBarangay,
  purokList,
  purokInfo,
  deletePurok,
  upsertOfficial,
  officialList,
  officialInfo,
  deleteOfficial,
  exportBarangayData,
  exportResidents,
  importResidents,
  exportHouseholds,
  importHouseholds,
  testEmail,
  checkBarangayConflicts,
  generateSetupToken,
  validateSetupToken,
} from "../controllers/barangayControllers.js";
import { barangayUsersOnly, allUsers } from "../middlewares/auth.js";
import createUploader from "../middlewares/createUploader.js";

const router = express.Router();

// Public route for listing barangays (no authentication required)
router.get("/public/list/barangay", smartCache(), barangayList);
router.get("/list/barangay", smartCache(), ...allUsers, barangayList);

// Public route for listing officials (no authentication required)
router.get("/public/list/:barangayId/official", smartCache(), officialList);

// Public route for getting barangay info (no authentication required)
router.get("/public/:barangayId/barangay", smartCache(), barangayInfo);

// Export data route
router.get(
  "/export/:barangayId/barangay-data",
  ...allUsers,
  exportBarangayData
);

// Export residents route
router.get("/export/:barangayId/residents", ...allUsers, exportResidents);

// Import residents route
router.post(
  "/import/:barangayId/residents",
  ...allUsers,
  createUploader(() => "uploads/imports", [{ name: "file", maxCount: 1 }]),
  importResidents,
  smartInvalidateCache()
);

// Export households route
router.get("/export/:barangayId/households", ...allUsers, exportHouseholds);

// Import households route
router.post(
  "/import/:barangayId/households",
  ...allUsers,
  createUploader(() => "uploads/imports", [{ name: "file", maxCount: 1 }]),
  importHouseholds,
  smartInvalidateCache()
);

router.get("/:barangayId/barangay", smartCache(), ...allUsers, barangayInfo);
router.get("/barangay/:barangayId/conflicts", ...allUsers, checkBarangayConflicts);
router.post(
  "/barangay",
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
router.delete("/:barangayId/barangay", ...allUsers, deleteBarangay, smartInvalidateCache());

router.get("/list/:barangayId/purok", smartCache(), ...allUsers, purokList);
router.get("/:purokId/purok", smartCache(), ...allUsers, purokInfo);
router.post("/purok", ...allUsers, upsertPurok, smartInvalidateCache());
router.put("/:purokId/purok", ...allUsers, upsertPurok, smartInvalidateCache());
router.delete("/:purokId/purok", ...allUsers, deletePurok, smartInvalidateCache());

router.get("/list/:barangayId/official", smartCache(), ...allUsers, officialList);
router.get("/:officialId/official", smartCache(), ...allUsers, officialInfo);
router.post("/official", ...allUsers, upsertOfficial, smartInvalidateCache());
router.put("/:officialId/official", ...allUsers, upsertOfficial, smartInvalidateCache());
router.delete("/:officialId/official", ...allUsers, deleteOfficial, smartInvalidateCache());

// Test email route
router.post("/test-email", testEmail);

// Generate setup token route (no auth required for setup)
router.post("/generate-setup-token", generateSetupToken);

// Validate setup token route (no auth required for setup)
router.post("/validate-setup-token", validateSetupToken);

export default router;
