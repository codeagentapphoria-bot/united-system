import api from './auth.service';

export interface EService {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  requiresPayment: boolean;
  defaultAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export const eServiceService = {
  async getAllEServices(): Promise<EService[]> {
    const response = await api.get('/services/active');
    return response.data.data;
  },

  async getEService(id: string): Promise<EService> {
    const response = await api.get(`/services/${id}`);
    return response.data.data;
  },
};
