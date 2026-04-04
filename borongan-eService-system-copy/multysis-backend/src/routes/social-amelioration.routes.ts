import { Router } from 'express';
import {
  createPWDBeneficiaryController,
  createSeniorBeneficiaryController,
  createSoloParentBeneficiaryController,
  createStudentBeneficiaryController,
  deletePWDBeneficiaryController,
  deleteSeniorBeneficiaryController,
  deleteSoloParentBeneficiaryController,
  deleteStudentBeneficiaryController,
  getOverviewStatsController,
  getPWDBeneficiariesController,
  getSeniorBeneficiariesController,
  getSoloParentBeneficiariesController,
  getStudentBeneficiariesController,
  getTrendStatsController,
  updatePWDBeneficiaryController,
  updateSeniorBeneficiaryController,
  updateSoloParentBeneficiaryController,
  updateStudentBeneficiaryController,
} from '../controllers/social-amelioration.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  beneficiaryIdValidation,
  createPWDBeneficiaryValidation,
  createSeniorBeneficiaryValidation,
  createSoloParentBeneficiaryValidation,
  createStudentBeneficiaryValidation,
  listPWDBeneficiariesValidation,
  listSeniorBeneficiariesValidation,
  listSoloParentBeneficiariesValidation,
  listStudentBeneficiariesValidation,
  statsValidation,
  updatePWDBeneficiaryValidation,
  updateSeniorBeneficiaryValidation,
  updateSoloParentBeneficiaryValidation,
  updateStudentBeneficiaryValidation,
} from '../validations/social-amelioration.schema';

const router = Router();

router.use(verifyAdmin);

// Senior Citizens
router.get(
  '/seniors',
  validate(listSeniorBeneficiariesValidation),
  getSeniorBeneficiariesController
);
router.post(
  '/seniors',
  validate(createSeniorBeneficiaryValidation),
  createSeniorBeneficiaryController
);
router.put(
  '/seniors/:id',
  validate(updateSeniorBeneficiaryValidation),
  updateSeniorBeneficiaryController
);
router.delete('/seniors/:id', validate(beneficiaryIdValidation), deleteSeniorBeneficiaryController);

// PWD
router.get('/pwd', validate(listPWDBeneficiariesValidation), getPWDBeneficiariesController);
router.post('/pwd', validate(createPWDBeneficiaryValidation), createPWDBeneficiaryController);
router.put('/pwd/:id', validate(updatePWDBeneficiaryValidation), updatePWDBeneficiaryController);
router.delete('/pwd/:id', validate(beneficiaryIdValidation), deletePWDBeneficiaryController);

// Students
router.get(
  '/students',
  validate(listStudentBeneficiariesValidation),
  getStudentBeneficiariesController
);
router.post(
  '/students',
  validate(createStudentBeneficiaryValidation),
  createStudentBeneficiaryController
);
router.put(
  '/students/:id',
  validate(updateStudentBeneficiaryValidation),
  updateStudentBeneficiaryController
);
router.delete(
  '/students/:id',
  validate(beneficiaryIdValidation),
  deleteStudentBeneficiaryController
);

// Solo Parents
router.get(
  '/solo-parents',
  validate(listSoloParentBeneficiariesValidation),
  getSoloParentBeneficiariesController
);
router.post(
  '/solo-parents',
  validate(createSoloParentBeneficiaryValidation),
  createSoloParentBeneficiaryController
);
router.put(
  '/solo-parents/:id',
  validate(updateSoloParentBeneficiaryValidation),
  updateSoloParentBeneficiaryController
);
router.delete(
  '/solo-parents/:id',
  validate(beneficiaryIdValidation),
  deleteSoloParentBeneficiaryController
);

// Statistics
router.get('/stats/overview', getOverviewStatsController);
router.get('/stats/trends', validate(statsValidation), getTrendStatsController);

export default router;
