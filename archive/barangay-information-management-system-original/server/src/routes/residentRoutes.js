import express from "express";
import { allUsers } from "../middlewares/auth.js";
import createUploader from "../middlewares/createUploader.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import {
  upsertResident,
  deleteResident,
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
  syncResident,
  syncClassification,
} from "../controllers/residentControllers.js";

const router = express.Router();

// Resident routes
router.get("/list/residents", smartCache(), ...allUsers, residentList);
router.get("/:residentId/resident", smartCache(), ...allUsers, residentInfo);

router.post(
  "/resident",
  createUploader(() => "uploads/residents", [{ name: "picturePath", maxCount: 1 }]),
  ...allUsers,
  upsertResident,
  smartInvalidateCache()
);

router.put(
  "/:residentId/resident",
  createUploader(() => "uploads/residents", [{ name: "picturePath", maxCount: 1 }]),
  ...allUsers,
  upsertResident,
  smartInvalidateCache()
);

router.delete("/:residentId/resident", ...allUsers, deleteResident, smartInvalidateCache());

// Classification routes
router.get("/list/classification", smartCache(), ...allUsers, classificationList);
router.post("/classification", ...allUsers, insertClassification, smartInvalidateCache());
router.put("/classification/:classificationId", ...allUsers, updateClassification, smartInvalidateCache());
router.delete("/classification/:classificationId", ...allUsers, deleteClassification, smartInvalidateCache());

// Classification Types Routes
router.get("/classification-types", smartCache(), ...allUsers, getClassificationTypes);
router.get("/classification-types/:id", smartCache(), ...allUsers, getClassificationTypeById);
router.post("/classification-types", ...allUsers, createClassificationType, smartInvalidateCache());
router.put("/classification-types/:id", ...allUsers, updateClassificationType, smartInvalidateCache());
router.delete("/classification-types/:id", ...allUsers, deleteClassificationType, smartInvalidateCache());

// public routes for QR scanning
router.get("/public/:residentId/resident/public-qr", publicResidentInfoForQR);

// for flutter app resident sync (with file upload) [Rosetta]
router.post(
  "/sync/resident",
  createUploader(() => "uploads/residents", [{ name: "picturePath", maxCount: 1 }]),
  ...allUsers,
  syncResident,
  smartInvalidateCache()
);

// Fast JSON-based resident sync (without file upload) [Main]
router.post("/sync/resident/json", ...allUsers, syncResident);

// Image upload route for resident sync process [Main]
router.post(
  "/sync/resident/image",
  ...allUsers,
  createUploader(() => "uploads/residents", [{ name: "picturePath", maxCount: 1 }]),
  (req, res) => {
    try {
      if (!req.files?.picturePath) {
        return res.status(400).json({
          message: "No image uploaded",
          data: null,
        });
      }

      const uploadedFile = req.files.picturePath[0];
      const fileInfo = {
        filename: uploadedFile.filename,
        originalname: uploadedFile.originalname,
        size: uploadedFile.size,
        path: uploadedFile.path,
        relativePath: `uploads/residents/${uploadedFile.filename}`,
      };

      return res.status(200).json({
        message: "Image uploaded successfully",
        data: {
          file: fileInfo,
          filename: fileInfo.filename,
          path: fileInfo.relativePath,
        },
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error uploading image",
        data: null,
      });
    }
  }
);

// Sync resident-classification [Rosetta wins conflict]
router.post("/sync/resident-classification", ...allUsers, syncClassification, smartInvalidateCache());

export default router;