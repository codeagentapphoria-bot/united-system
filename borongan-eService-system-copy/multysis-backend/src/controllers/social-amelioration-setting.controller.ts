import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  socialAmeliorationSettingService,
  type CreateSocialAmeliorationSettingData,
  type UpdateSocialAmeliorationSettingData,
  type SocialAmeliorationSettingFilters,
} from '../services/social-amelioration-setting.service';

export const createSocialAmeliorationSettingController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data: CreateSocialAmeliorationSettingData = {
      type: req.body.type,
      name: req.body.name,
      description: req.body.description,
      isActive: req.body.isActive,
    };

    const setting = await socialAmeliorationSettingService.createSetting(data);

    res.status(201).json({
      status: 'success',
      data: setting,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create social amelioration setting',
    });
  }
};

export const getSocialAmeliorationSettingsController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const filters: SocialAmeliorationSettingFilters = {
      type: req.query.type as any,
      isActive:
        req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      search: req.query.search as string,
    };

    const settings = await socialAmeliorationSettingService.getSettings(filters);

    res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to fetch social amelioration settings',
    });
  }
};

export const getSocialAmeliorationSettingController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const setting = await socialAmeliorationSettingService.getSetting(req.params.id);

    res.status(200).json({
      status: 'success',
      data: setting,
    });
  } catch (error: any) {
    res.status(404).json({
      status: 'error',
      message: error.message || 'Social amelioration setting not found',
    });
  }
};

export const updateSocialAmeliorationSettingController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const data: UpdateSocialAmeliorationSettingData = {
      name: req.body.name,
      description: req.body.description,
      isActive: req.body.isActive,
    };

    const setting = await socialAmeliorationSettingService.updateSetting(req.params.id, data);

    res.status(200).json({
      status: 'success',
      data: setting,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update social amelioration setting',
    });
  }
};

export const deleteSocialAmeliorationSettingController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    await socialAmeliorationSettingService.deleteSetting(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Social amelioration setting deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to delete social amelioration setting',
    });
  }
};

export const activateSocialAmeliorationSettingController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const setting = await socialAmeliorationSettingService.activateSetting(req.params.id);

    res.status(200).json({
      status: 'success',
      data: setting,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to activate social amelioration setting',
    });
  }
};

export const deactivateSocialAmeliorationSettingController = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const setting = await socialAmeliorationSettingService.deactivateSetting(req.params.id);

    res.status(200).json({
      status: 'success',
      data: setting,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to deactivate social amelioration setting',
    });
  }
};
