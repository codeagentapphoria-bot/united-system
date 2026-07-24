import { Router } from 'express';
import { getResidentCertificateTemplatesController } from '../controllers/certificate-template.controller';
import { verifyResident } from '../middleware/auth';

const router = Router();

router.get('/templates', verifyResident, getResidentCertificateTemplatesController);

export default router;
