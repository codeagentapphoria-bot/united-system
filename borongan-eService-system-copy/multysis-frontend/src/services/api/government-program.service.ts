import api from './auth.service';

export interface GovernmentProgram {
  id: string;
  name: string;
  description?: string;
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGovernmentProgramInput {
  name: string;
  description?: string;
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';
  isActive?: boolean;
}

export interface UpdateGovernmentProgramInput extends Partial<CreateGovernmentProgramInput> {}

export const governmentProgramService = {
  async getAllGovernmentPrograms(
    search?: string,
    type?: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL',
    isActive?: boolean
  ): Promise<GovernmentProgram[]> {
    const params = new URLSearchParams();

    if (search) params.append('search', search);
    if (type) params.append('type', type);
    if (isActive !== undefined) params.append('isActive', isActive.toString());

    const queryString = params.toString();
    const url = `/government-programs${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data.data;
  },

  async getGovernmentProgram(id: string): Promise<GovernmentProgram> {
    const response = await api.get(`/government-programs/${id}`);
    return response.data.data;
  },

  async createGovernmentProgram(data: CreateGovernmentProgramInput): Promise<GovernmentProgram> {
    const response = await api.post('/government-programs', data);
    return response.data.data;
  },

  async updateGovernmentProgram(id: string, data: UpdateGovernmentProgramInput): Promise<GovernmentProgram> {
    const response = await api.put(`/government-programs/${id}`, data);
    return response.data.data;
  },

  async deleteGovernmentProgram(id: string): Promise<void> {
    await api.delete(`/government-programs/${id}`);
  },

  async activateGovernmentProgram(id: string): Promise<GovernmentProgram> {
    const response = await api.patch(`/government-programs/${id}/activate`);
    return response.data.data;
  },

  async deactivateGovernmentProgram(id: string): Promise<GovernmentProgram> {
    const response = await api.patch(`/government-programs/${id}/deactivate`);
    return response.data.data;
  },
};

