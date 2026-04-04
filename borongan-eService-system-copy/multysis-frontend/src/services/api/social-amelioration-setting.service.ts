import api from './auth.service';

export type SocialAmeliorationSettingType = 'PENSION_TYPE' | 'DISABILITY_TYPE' | 'GRADE_LEVEL' | 'SOLO_PARENT_CATEGORY';

export interface SocialAmeliorationSetting {
  id: string;
  type: SocialAmeliorationSettingType;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSocialAmeliorationSettingInput {
  type: SocialAmeliorationSettingType;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateSocialAmeliorationSettingInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface SocialAmeliorationSettingFilters {
  type?: SocialAmeliorationSettingType;
  isActive?: boolean;
  search?: string;
}

export const socialAmeliorationSettingApi = {
  async getSettings(filters?: SocialAmeliorationSettingFilters): Promise<SocialAmeliorationSetting[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`/social-amelioration-settings?${params.toString()}`);
    return response.data.data;
  },

  async getSetting(id: string): Promise<SocialAmeliorationSetting> {
    const response = await api.get(`/social-amelioration-settings/${id}`);
    return response.data.data;
  },

  async createSetting(data: CreateSocialAmeliorationSettingInput): Promise<SocialAmeliorationSetting> {
    const response = await api.post('/social-amelioration-settings', data);
    return response.data.data;
  },

  async updateSetting(id: string, data: UpdateSocialAmeliorationSettingInput): Promise<SocialAmeliorationSetting> {
    const response = await api.put(`/social-amelioration-settings/${id}`, data);
    return response.data.data;
  },

  async deleteSetting(id: string): Promise<void> {
    await api.delete(`/social-amelioration-settings/${id}`);
  },

  async activateSetting(id: string): Promise<SocialAmeliorationSetting> {
    const response = await api.patch(`/social-amelioration-settings/${id}/activate`);
    return response.data.data;
  },

  async deactivateSetting(id: string): Promise<SocialAmeliorationSetting> {
    const response = await api.patch(`/social-amelioration-settings/${id}/deactivate`);
    return response.data.data;
  },
};

