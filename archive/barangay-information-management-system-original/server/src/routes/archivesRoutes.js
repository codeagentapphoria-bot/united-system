import express from "express";
import { allUsers } from "../middlewares/auth.js";
import createUploader from "../middlewares/createUploader.js";
import { smartCache, smartInvalidateCache } from "../middlewares/smartCache.js";
import {
  upsertArchive,
  deleteArchive,
  archiveList,
  archiveInfo
} from "../controllers/archivesControllers.js";

const router = express.Router();

router.get('/list/archives', smartCache(), ...allUsers, archiveList);
router.get('/:archiveId/archive', smartCache(), ...allUsers, archiveInfo);
router.post('/archive', createUploader(() => 'uploads/archives', [{ name: 'filePath', maxCount: 1 }]), ...allUsers, upsertArchive, smartInvalidateCache());
router.put('/:archiveId/archive', createUploader(() => 'uploads/archives', [{ name: 'filePath', maxCount: 1 }]), ...allUsers, upsertArchive, smartInvalidateCache());
router.delete('/:archiveId/archive', ...allUsers, deleteArchive, smartInvalidateCache());

export default router; 