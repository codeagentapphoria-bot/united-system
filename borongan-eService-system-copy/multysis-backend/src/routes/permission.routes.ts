import { Router } from 'express';
import {
  createPermissionController,
  getPermissionsController,
  getPermissionController,
  updatePermissionController,
  deletePermissionController,
  getAdminResourcesController,
} from '../controllers/permission.controller';
import { verifyAdmin } from '../middleware/auth';
import {
  createPermissionValidation,
  updatePermissionValidation,
  getPermissionValidation,
} from '../validations/permission.schema';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

router.get('/resources', getAdminResourcesController);
router.get('/', getPermissionsController);
router.get('/:id', validate(getPermissionValidation), getPermissionController);
router.post('/', validate(createPermissionValidation), createPermissionController);
router.put('/:id', validate(updatePermissionValidation), updatePermissionController);
router.delete('/:id', validate(getPermissionValidation), deletePermissionController);

export default router;
