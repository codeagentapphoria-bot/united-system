import api from './auth.service';
import type { TaxConfiguration } from '@/types/tax';

export interface TaxProfile {
  id: string;
  serviceId: string;
  name: string;
  variant?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  service?: {
    id: string;
    code: string;
    name: string;
  };
  _count?: {
    versions: number;
  };
}

export interface TaxProfileVersion {
  id: string;
  taxProfileId: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  changeReason: string;
  configuration: TaxConfiguration;
  createdBy: string;
  createdAt: string;
}

export interface CreateTaxProfileData {
  serviceId: string;
  name: string;
  variant?: string;
  isActive?: boolean;
}

export interface UpdateTaxProfileData {
  name?: string;
  variant?: string;
  isActive?: boolean;
}

export interface CreateTaxProfileVersionData {
  version?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  changeReason: string;
  configuration: TaxConfiguration;
}

export interface UpdateTaxProfileVersionData {
  configuration?: TaxConfiguration;
  changeReason?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
}

export interface TaxProfileFilters {
  serviceId?: string;
  isActive?: boolean;
  search?: string;
}

export interface PaginatedTaxProfiles {
  taxProfiles: TaxProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const taxProfileService = {
  async getTaxProfiles(
    filters: TaxProfileFilters = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 }
  ): Promise<PaginatedTaxProfiles> {
    const params = new URLSearchParams();
    if (filters.serviceId) params.append('serviceId', filters.serviceId);
    if (filters.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters.search) params.append('search', filters.search);
    params.append('page', String(pagination.page));
    params.append('limit', String(pagination.limit));

    const response = await api.get(`/tax-profiles?${params.toString()}`);
    return {
      taxProfiles: response.data.data,
      pagination: response.data.pagination,
    };
  },

  async getTaxProfile(id: string): Promise<TaxProfile> {
    const response = await api.get(`/tax-profiles/${id}`);
    return response.data.data;
  },

  async createTaxProfile(data: CreateTaxProfileData): Promise<TaxProfile> {
    const response = await api.post('/tax-profiles', data);
    return response.data.data;
  },

  async updateTaxProfile(id: string, data: UpdateTaxProfileData): Promise<TaxProfile> {
    const response = await api.put(`/tax-profiles/${id}`, data);
    return response.data.data;
  },

  async deleteTaxProfile(id: string): Promise<void> {
    await api.delete(`/tax-profiles/${id}`);
  },

  async getTaxProfileVersions(taxProfileId: string): Promise<TaxProfileVersion[]> {
    const response = await api.get(`/tax-profiles/${taxProfileId}/versions`);
    return response.data.data;
  },

  async createTaxProfileVersion(
    taxProfileId: string,
    data: CreateTaxProfileVersionData
  ): Promise<TaxProfileVersion> {
    const response = await api.post(`/tax-profiles/${taxProfileId}/versions`, data);
    return response.data.data;
  },

  async updateTaxProfileVersion(
    versionId: string,
    data: UpdateTaxProfileVersionData
  ): Promise<TaxProfileVersion> {
    const response = await api.put(`/tax-profiles/versions/${versionId}`, data);
    return response.data.data;
  },

  async activateTaxProfileVersion(versionId: string): Promise<TaxProfileVersion> {
    const response = await api.patch(`/tax-profiles/versions/${versionId}/activate`, {});
    return response.data.data;
  },
};

