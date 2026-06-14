import { Router } from 'express';
import {
  createHWBeneficiaryController,
  createPWDBeneficiaryController,
  createSeniorBeneficiaryController,
  createSoloParentBeneficiaryController,
  createStudentBeneficiaryController,
  deleteHWBeneficiaryController,
  deletePWDBeneficiaryController,
  deleteSeniorBeneficiaryController,
  deleteSoloParentBeneficiaryController,
  deleteStudentBeneficiaryController,
  getHWBeneficiariesController,
  getOverviewStatsController,
  getPWDBeneficiariesController,
  getSeniorBeneficiariesController,
  getSoloParentBeneficiariesController,
  getStudentBeneficiariesController,
  getTrendStatsController,
  updateHWBeneficiaryController,
  updatePWDBeneficiaryController,
  updateSeniorBeneficiaryController,
  updateSoloParentBeneficiaryController,
  updateStudentBeneficiaryController,
} from '../controllers/social-amelioration.controller';
import { verifyAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  beneficiaryIdValidation,
  createHWBeneficiaryValidation,
  createPWDBeneficiaryValidation,
  createSeniorBeneficiaryValidation,
  createSoloParentBeneficiaryValidation,
  createStudentBeneficiaryValidation,
  listHWBeneficiariesValidation,
  listPWDBeneficiariesValidation,
  listSeniorBeneficiariesValidation,
  listSoloParentBeneficiariesValidation,
  listStudentBeneficiariesValidation,
  statsValidation,
  updateHWBeneficiaryValidation,
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

// Healthcare Workers
router.get(
  '/healthcare-workers',
  validate(listHWBeneficiariesValidation),
  getHWBeneficiariesController
);
router.post(
  '/healthcare-workers',
  validate(createHWBeneficiaryValidation),
  createHWBeneficiaryController
);
router.put(
  '/healthcare-workers/:id',
  validate(updateHWBeneficiaryValidation),
  updateHWBeneficiaryController
);
router.delete(
  '/healthcare-workers/:id',
  validate(beneficiaryIdValidation),
  deleteHWBeneficiaryController
);

// Statistics
router.get('/stats/overview', getOverviewStatsController);
router.get('/stats/trends', validate(statsValidation), getTrendStatsController);

export default router;
