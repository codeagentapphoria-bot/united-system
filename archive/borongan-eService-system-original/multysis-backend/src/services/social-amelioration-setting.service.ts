import prisma from '../config/database';

export type SocialAmeliorationSettingType =
  | 'PENSION_TYPE'
  | 'DISABILITY_TYPE'
  | 'GRADE_LEVEL'
  | 'SOLO_PARENT_CATEGORY';

export interface CreateSocialAmeliorationSettingData {
  type: SocialAmeliorationSettingType;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateSocialAmeliorationSettingData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface SocialAmeliorationSettingFilters {
  type?: SocialAmeliorationSettingType;
  isActive?: boolean;
  search?: string;
}

export const socialAmeliorationSettingService = {
  async createSetting(data: CreateSocialAmeliorationSettingData) {
    const setting = await (prisma as any).socialAmeliorationSetting.create({
      data: {
        type: data.type,
        name: data.name,
        description: data.description,
        isActive: data.isActive ?? true,
      },
    });

    return setting;
  },

  async getSettings(filters?: SocialAmeliorationSettingFilters) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const settings = await (prisma as any).socialAmeliorationSetting.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return settings;
  },

  async getSetting(id: string) {
    const setting = await (prisma as any).socialAmeliorationSetting.findUnique({
      where: { id },
    });

    if (!setting) {
      throw new Error('Social amelioration setting not found');
    }

    return setting;
  },

  async updateSetting(id: string, data: UpdateSocialAmeliorationSettingData) {
    await (prisma as any).socialAmeliorationSetting.findUniqueOrThrow({ where: { id } });

    const setting = await (prisma as any).socialAmeliorationSetting.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
      },
    });

    return setting;
  },

  async deleteSetting(id: string) {
    await (prisma as any).socialAmeliorationSetting.findUniqueOrThrow({ where: { id } });
    return (prisma as any).socialAmeliorationSetting.delete({ where: { id } });
  },

  async activateSetting(id: string) {
    await (prisma as any).socialAmeliorationSetting.findUniqueOrThrow({ where: { id } });
    return (prisma as any).socialAmeliorationSetting.update({
      where: { id },
      data: { isActive: true },
    });
  },

  async deactivateSetting(id: string) {
    await (prisma as any).socialAmeliorationSetting.findUniqueOrThrow({ where: { id } });
    return (prisma as any).socialAmeliorationSetting.update({
      where: { id },
      data: { isActive: false },
    });
  },
};
