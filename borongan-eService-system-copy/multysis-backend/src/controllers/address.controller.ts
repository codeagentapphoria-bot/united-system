import { Request, Response } from 'express';
import {
  getBarangay,
  getBarangaysByMunicipality,
  getMunicipalities,
} from '../services/address.service';

// GET /api/addresses/municipalities
export const getMunicipalitiesController = async (_req: Request, res: Response): Promise<void> => {
  try {
    const municipalities = await getMunicipalities();
    res.status(200).json({ status: 'success', data: municipalities });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch municipalities' });
  }
};

// GET /api/addresses/barangays?municipalityId=1
export const getBarangaysController = async (req: Request, res: Response): Promise<void> => {
  try {
    const municipalityId = parseInt(req.query.municipalityId as string);
    if (!municipalityId || isNaN(municipalityId)) {
      res.status(400).json({ status: 'error', message: 'municipalityId query param is required' });
      return;
    }
    const barangays = await getBarangaysByMunicipality(municipalityId);
    res.status(200).json({ status: 'success', data: barangays });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Failed to fetch barangays' });
  }
};

// GET /api/addresses/barangays/:id
export const getBarangayController = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ status: 'error', message: 'Invalid barangay id' });
      return;
    }
    const barangay = await getBarangay(id);
    res.status(200).json({ status: 'success', data: barangay });
  } catch (error: any) {
    res.status(404).json({ status: 'error', message: error.message || 'Barangay not found' });
  }
};
