import { Router } from 'express';
import {
  changePasswordController,
  createUserController,
  deleteUserController,
  getUserController,
  getUsersController,
  updateUserController,
} from '../controllers/user.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  changePasswordValidation,
  createUserValidation,
  getUserValidation,
  updateUserValidation,
} from '../validations/user.schema';

const router = Router();

// All routes require admin authentication
router.use(verifyAdmin);

router.get('/', getUsersController);
router.get('/:id', validate(getUserValidation), getUserController);
router.post('/', validate(createUserValidation), createUserController);
router.put('/:id', validate(updateUserValidation), updateUserController);
router.delete('/:id', validate(getUserValidation), deleteUserController);
router.patch('/:id/password', validate(changePasswordValidation), changePasswordController);

export default router;
