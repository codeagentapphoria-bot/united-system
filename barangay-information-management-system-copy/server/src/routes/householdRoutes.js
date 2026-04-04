/**
 * householdRoutes.js
 *
 * BIMS Household routes — READ ONLY.
 *
 * Households are now self-registered by residents via the portal.
 * Members are added by entering resident IDs (not free-text names).
 * BIMS staff can VIEW households but cannot create/edit/delete them.
 *
 * Removed routes:
 *   POST /household            (portal self-registration)
 *   PUT  /:householdId/household
 *   DELETE /:householdId/household
 *   POST /sync/household        (mobile app removed)
 *   POST /sync/household/image
 */

import express from "express";
import { allUsers } from "../middlewares/auth.js";
import { smartCache } from "../middlewares/smartCache.js";
import {
  householdInfo,
  householdList,
  householdFamilyCount,
  checkHouseholdByHouseHead,
  getHouseholdLocations,
} from "../controllers/householdControllers.js";

const router = express.Router();

// =============================================================================
// READ ROUTES
// =============================================================================

router.get("/list/household", smartCache(), ...allUsers, householdList);
router.get("/list/household/family-count", smartCache(), ...allUsers, householdFamilyCount);
router.get("/check-household/:houseHeadId", smartCache(), ...allUsers, checkHouseholdByHouseHead);
router.get("/locations/household", smartCache(), ...allUsers, getHouseholdLocations);
router.get("/:householdId/household", smartCache(), ...allUsers, householdInfo);

export default router;
