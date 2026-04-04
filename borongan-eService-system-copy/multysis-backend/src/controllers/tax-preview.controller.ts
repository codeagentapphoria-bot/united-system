import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { previewTaxComputation } from '../services/tax-computation.service';

export const previewTaxController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { serviceId, serviceData, applicationDate } = req.body;

    const result = await previewTaxComputation(
      serviceId,
      serviceData || {},
      applicationDate ? new Date(applicationDate) : undefined
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to preview tax computation',
    });
  }
};
