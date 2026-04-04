import api from './auth.service';

export interface Address {
  id: string;
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  postalCode: string;
  streetAddress?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  region: string;
  province: string;
  municipality: string;
  barangay: string;
  postalCode: string;
  streetAddress?: string;
  isActive?: boolean;
}

export interface UpdateAddressInput extends Partial<CreateAddressInput> {}

export const addressService = {
  async getAllAddresses(
    search?: string,
    isActive?: boolean
  ): Promise<Address[]> {
    const params = new URLSearchParams();

    if (search) params.append('search', search);
    if (isActive !== undefined) params.append('isActive', isActive.toString());

    const queryString = params.toString();
    const url = `/addresses${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data.data;
  },

  async getAddress(id: string): Promise<Address> {
    const response = await api.get(`/addresses/${id}`);
    return response.data.data;
  },

  async createAddress(data: CreateAddressInput): Promise<Address> {
    const response = await api.post('/addresses', data);
    return response.data.data;
  },

  async updateAddress(id: string, data: UpdateAddressInput): Promise<Address> {
    const response = await api.put(`/addresses/${id}`, data);
    return response.data.data;
  },

  async deleteAddress(id: string): Promise<void> {
    await api.delete(`/addresses/${id}`);
  },

  async activateAddress(id: string): Promise<Address> {
    const response = await api.patch(`/addresses/${id}/activate`);
    return response.data.data;
  },

  async deactivateAddress(id: string): Promise<Address> {
    const response = await api.patch(`/addresses/${id}/deactivate`);
    return response.data.data;
  },
};

