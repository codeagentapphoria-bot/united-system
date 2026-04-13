import api from './auth.service';
import type { GovernmentProgramType } from './government-program.service';

export interface AdminProgramApplication {
  id: string;
  status: string;
  appliedAt: string;
  adminNotes?: string | null;
  resident: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    extensionName?: string | null;
    picturePath?: string | null;
    barangay?: { barangayName: string } | null;
  };
  program: {
    id: string;
    name: string;
    types: GovernmentProgramType[];
  };
}

interface BeneficiaryInfo {
  status: string;
  seniorCitizenId?: string;
  pwdId?: string;
  studentId?: string;
  soloParentId?: string;
}

export interface AdminProgramApplicationDetail {
  id: string;
  status: string;
  appliedAt: string;
  adminNotes?: string | null;
  submittedData?: Record<string, string> | null;
  attachments?: Array<{ label: string; filename: string; url: string; mimetype: string; size: number }> | null;
  resident: {
    id: string;
    residentId?: string | null;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    extensionName?: string | null;
    picturePath?: string | null;
    sex?: string | null;
    civilStatus?: string | null;
    birthdate?: string | null;
    contactNumber?: string | null;
    streetAddress?: string | null;
    email?: string | null;
    barangay?: { barangayName: string } | null;
    seniorCitizenBeneficiary?: BeneficiaryInfo | null;
    pwdBeneficiary?: BeneficiaryInfo | null;
    studentBeneficiary?: BeneficiaryInfo | null;
    soloParentBeneficiary?: BeneficiaryInfo | null;
  };
  program: {
    id: string;
    name: string;
    types: GovernmentProgramType[];
  };
}

interface ListApplicationsParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface PaginatedResponse {
  data: AdminProgramApplication[];
  pagination: { page: number; totalPages: number; total: number };
}

export const portalProgramsService = {
  async listApplicationsAdmin(params: ListApplicationsParams): Promise<PaginatedResponse> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString();
    const url = `/portal/program-applications${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return { data: response.data.data, pagination: response.data.pagination };
  },

  async getApplicationAdmin(appId: string): Promise<AdminProgramApplicationDetail> {
    const response = await api.get(`/portal/program-applications/${appId}`);
    return response.data.data;
  },

  async reviewApplication(appId: string, action: 'approve' | 'reject', adminNotes?: string): Promise<void> {
    await api.post(`/portal/program-applications/${appId}/review`, { action, adminNotes });
  },
};
