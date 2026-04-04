import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  activateAddress,
  createAddress,
  deactivateAddress,
  deleteAddress,
  getAddress,
  getAddresses,
  updateAddress,
} from '../services/address.service';

export const createAddressController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const address = await createAddress(req.body);
    res.status(201).json({
      status: 'success',
      data: address,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create address',
    });
  }
};

export const getAddressesController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string;
    const region = req.query.region as string;
    const province = req.query.province as string;
    const municipality = req.query.municipality as string;
    const isActive =
      req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

    const addresses = await getAddresses({
      search,
      region,
      province,
      municipality,
      isActive,
    });

    res.status(200).json({
      status: 'success',
      data: addresses,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch addresses',
    });
  }
};

export const getAddressController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const address = await getAddress(id);
    res.status(200).json({
      status: 'success',
      data: address,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Address not found',
    });
  }
};

export const updateAddressController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const address = await updateAddress(id, req.body);
    res.status(200).json({
      status: 'success',
      data: address,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update address',
    });
  }
};

export const deleteAddressController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteAddress(id);
    res.status(200).json({
      status: 'success',
      message: 'Address deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to delete address',
    });
  }
};

export const activateAddressController = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const address = await activateAddress(id);
    res.status(200).json({
      status: 'success',
      data: address,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to activate address',
    });
  }
};

export const deactivateAddressController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const address = await deactivateAddress(id);
    res.status(200).json({
      status: 'success',
      data: address,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to deactivate address',
    });
  }
};
