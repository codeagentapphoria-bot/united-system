import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getActiveCertificateTemplatesForResident } from '../services/certificate-template.service';

export const getResidentCertificateTemplatesController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'resident') {
      res.status(403).json({ status: 'error', message: 'Resident access required' });
      return;
    }

    const templates = await getActiveCertificateTemplatesForResident(req.user.id);
    res.status(200).json({ status: 'success', data: templates });
  } catch (error: any) {
    res.status(error.statusCode || error.status || 500).json({
      status: 'error',
      message: error.message || 'Failed to fetch certificate templates',
    });
  }
};
