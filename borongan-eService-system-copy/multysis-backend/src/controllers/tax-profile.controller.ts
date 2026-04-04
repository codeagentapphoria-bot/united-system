import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  createTaxProfile,
  getTaxProfile,
  getTaxProfiles,
  updateTaxProfile,
  deleteTaxProfile,
  getTaxProfileVersions,
  createTaxProfileVersion,
  updateTaxProfileVersion,
  activateTaxProfileVersion,
} from '../services/tax-profile.service';
import {
  getActiveTaxComputation,
  computeTaxForTransaction,
} from '../services/tax-computation.service';

export const createTaxProfileController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const taxProfile = await createTaxProfile(req.body);
    res.status(201).json({
      status: 'success',
      data: taxProfile,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create tax profile',
    });
  }
};

export const getTaxProfilesController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filters = {
      serviceId: req.query.serviceId as string | undefined,
      isActive:
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      search: req.query.search as string | undefined,
    };
    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
    };

    const result = await getTaxProfiles(filters, pagination);
    res.status(200).json({
      status: 'success',
      data: result.taxProfiles,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get tax profiles',
    });
  }
};

export const getTaxProfileController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const taxProfile = await getTaxProfile(req.params.id);
    res.status(200).json({
      status: 'success',
      data: taxProfile,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Tax profile not found',
    });
  }
};

export const updateTaxProfileController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const taxProfile = await updateTaxProfile(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: taxProfile,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update tax profile',
    });
  }
};

export const deleteTaxProfileController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await deleteTaxProfile(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'Tax profile deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to delete tax profile',
    });
  }
};

export const getTaxProfileVersionsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const versions = await getTaxProfileVersions(req.params.id);
    res.status(200).json({
      status: 'success',
      data: versions,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get tax profile versions',
    });
  }
};

export const createTaxProfileVersionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Convert date strings to Date objects
    const effectiveFrom = req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : new Date();

    const effectiveTo = req.body.effectiveTo ? new Date(req.body.effectiveTo) : undefined;

    // Validate dates
    if (isNaN(effectiveFrom.getTime())) {
      throw new Error('Invalid effective from date');
    }
    if (effectiveTo && isNaN(effectiveTo.getTime())) {
      throw new Error('Invalid effective to date');
    }

    const version = await createTaxProfileVersion(req.params.id, {
      ...req.body,
      effectiveFrom,
      effectiveTo,
      createdBy: req.user?.id || '',
    });
    res.status(201).json({
      status: 'success',
      data: version,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create tax profile version',
    });
  }
};

export const updateTaxProfileVersionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    // Convert date strings to Date objects if provided
    const updateData: any = { ...req.body };

    if (req.body.effectiveFrom) {
      updateData.effectiveFrom = new Date(req.body.effectiveFrom);
      if (isNaN(updateData.effectiveFrom.getTime())) {
        throw new Error('Invalid effective from date');
      }
    }

    if (req.body.effectiveTo !== undefined) {
      if (req.body.effectiveTo === null) {
        updateData.effectiveTo = null;
      } else {
        updateData.effectiveTo = new Date(req.body.effectiveTo);
        if (isNaN(updateData.effectiveTo.getTime())) {
          throw new Error('Invalid effective to date');
        }
      }
    }

    const version = await updateTaxProfileVersion(req.params.id, updateData);
    res.status(200).json({
      status: 'success',
      data: version,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update tax profile version',
    });
  }
};

export const activateTaxProfileVersionController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const version = await activateTaxProfileVersion(req.params.id);
    res.status(200).json({
      status: 'success',
      data: version,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to activate tax profile version',
    });
  }
};

export const getTaxComputationController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const computation = await getActiveTaxComputation(req.params.id);
    if (!computation) {
      res.status(404).json({
        status: 'error',
        message: 'Tax computation not found',
      });
      return;
    }
    res.status(200).json({
      status: 'success',
      data: computation,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to get tax computation',
    });
  }
};

export const computeTaxController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const computation = await computeTaxForTransaction(req.params.id, req.user?.id);
    res.status(200).json({
      status: 'success',
      data: computation,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to compute tax',
    });
  }
};
