import { Router } from 'express';
import {
  createRoleController,
  getRolesController,
  getRoleController,
  updateRoleController,
  deleteRoleController,
  assignPermissionsController,
  getRolePagesController,
  setRolePagesController,
} from '../controllers/role.controller';
import { verifyAdmin } from '../middleware/auth';
import {
  createRoleValidation,
  updateRoleValidation,
  getRoleValidation,
  assignPermissionsValidation,
} from '../validations/role.schema';
import { validate } from '../middleware/validation';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

router.get('/', getRolesController);
router.get('/:id', validate(getRoleValidation), getRoleController);
router.post('/', validate(createRoleValidation), createRoleController);
router.put('/:id', validate(updateRoleValidation), updateRoleController);
router.delete('/:id', validate(getRoleValidation), deleteRoleController);
router.post('/:id/permissions', validate(assignPermissionsValidation), assignPermissionsController);
router.get('/:id/pages', getRolePagesController);
router.put('/:id/pages', setRolePagesController);

export default router;
