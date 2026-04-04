import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getServiceFieldsMetadata } from '../services/service.service';

export const getServiceFieldsMetadataController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const fieldsMetadata = await getServiceFieldsMetadata(serviceId);

    res.status(200).json({
      status: 'success',
      data: fieldsMetadata,
    });
  } catch (error: any) {
    if (error.message === 'Service not found') {
      res.status(404).json({
        status: 'error',
        message: error.message || 'Service not found',
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to fetch service fields metadata',
      });
    }
  }
};
