import api from './auth.service';

export interface ResidentCertificateTemplate {
  id: string;
  name: string;
  description: string | null;
  certificateType: string;
}

export const certificateTemplateService = {
  async getResidentTemplates(signal?: AbortSignal): Promise<ResidentCertificateTemplate[]> {
    const response = await api.get('/portal/certificates/templates', { signal });
    return response.data.data || [];
  },
};
