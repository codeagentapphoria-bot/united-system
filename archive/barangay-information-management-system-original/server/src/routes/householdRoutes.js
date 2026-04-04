import express from "express";
import { allUsers } from "../middlewares/auth.js";
import createUploader from "../middlewares/createUploader.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import {
  householdInfo,
  householdList,
  upsertHousehold,
  deleteHousehold,
  householdFamilyCount,
  checkHouseholdByHouseHead,
  getHouseholdLocations,
  syncHousehold,
} from "../controllers/householdControllers.js";
const router = express.Router();

router.get("/list/household", smartCache(), householdList);
router.get("/list/household/family-count", smartCache(), householdFamilyCount);
router.get("/check-household/:houseHeadId", smartCache(), checkHouseholdByHouseHead);
router.get("/locations/household", smartCache(), ...allUsers, getHouseholdLocations);
router.get("/:householdId/household", smartCache(), ...allUsers, householdInfo);
router.post(
  "/household",
  ...allUsers,
  createUploader(
    () => "uploads/households",
    [{ name: "household_image_path", maxCount: 10 }]
  ),
  upsertHousehold,
  smartInvalidateCache()
);
router.put(
  "/:householdId/household",
  ...allUsers,
  createUploader(
    () => "uploads/households",
    [{ name: "household_image_path", maxCount: 10 }]
  ),
  upsertHousehold,
  smartInvalidateCache()
);
router.delete("/:householdId/household", ...allUsers, deleteHousehold, smartInvalidateCache());

// Sync route for household data
router.post("/sync/household", ...allUsers, syncHousehold, smartInvalidateCache());

// Image upload route for sync process
router.post(
  "/sync/household/image",
  ...allUsers,
  createUploader(
    () => "uploads/households",
    [{ name: "household_image_path", maxCount: 10 }]
  ),
  (req, res) => {
    try {
      if (!req.files?.household_image_path) {
        return res.status(400).json({
          message: "No images uploaded",
          data: null
        });
      }

      const uploadedFiles = req.files.household_image_path.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        size: file.size
      }));

      return res.status(200).json({
        message: "Images uploaded successfully",
        data: {
          files: uploadedFiles,
          filename: uploadedFiles[0]?.filename // Return first filename for backward compatibility
        }
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error uploading images",
        data: null
      });
    }
  }
);

export default router;
