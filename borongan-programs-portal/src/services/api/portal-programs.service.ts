import api from './auth.service';
import type { GovernmentProgramType } from './government-program.service';

export interface PortalProgram {
  id: string;
  name: string;
  description?: string;
  requirements?: string;
  types: GovernmentProgramType[];
  isActive: boolean;
  eligible: boolean;
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
  adminNotes?: string | null;
}

export interface PortalProgramsListResponse {
  data: PortalProgram[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApplicationAttachment {
  label: string;
  filename: string;
  url: string;
  mimetype: string;
  size: number;
}

export interface ProgramApplication {
  id: string;
  residentId: string;
  programId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  adminNotes?: string;
  submittedData?: Record<string, string>;
  attachments?: ApplicationAttachment[];
  appliedAt: string;
  reviewedAt?: string;
  program: {
    id: string;
    name: string;
    description?: string;
    types: GovernmentProgramType[];
  };
}

export interface AdminProgramApplication {
  id: string;
  residentId: string;
  programId: string;
  status: string;
  adminNotes?: string;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
  resident: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    extensionName?: string;
    picturePath?: string;
    barangay?: { barangayName: string };
  };
  program: {
    id: string;
    name: string;
    types: GovernmentProgramType[];
  };
}

export interface AdminProgramApplicationDetail {
  id: string;
  residentId: string;
  programId: string;
  status: string;
  adminNotes?: string;
  submittedData?: Record<string, string>;
  attachments?: ApplicationAttachment[];
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
  resident: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    extensionName?: string;
    picturePath?: string;
    residentId?: string;
    contactNumber?: string;
    email?: string;
    birthdate?: string;
    sex?: string;
    civilStatus?: string;
    streetAddress?: string;
    barangay?: { barangayName: string };
    seniorCitizenBeneficiary?: { status: string; seniorCitizenId?: string } | null;
    pwdBeneficiary?: { status: string; pwdId?: string } | null;
    studentBeneficiary?: { status: string; studentId?: string } | null;
    soloParentBeneficiary?: { status: string; soloParentId?: string } | null;
  };
  program: {
    id: string;
    name: string;
    types: GovernmentProgramType[];
    description?: string;
    requirements?: string;
  };
}

export interface AdminApplicationsResponse {
  data: AdminProgramApplication[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const portalProgramsService = {
  // --- Resident portal ---

  async listPrograms(params?: {
    search?: string;
    type?: string;
    name?: string;
    page?: number;
    limit?: number;
  }): Promise<PortalProgramsListResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.name) query.append('name', params.name);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    const qs = query.toString();
    const response = await api.get(`/portal/programs${qs ? `?${qs}` : ''}`);
    return { data: response.data.data, pagination: response.data.pagination };
  },

  async getProgram(id: string): Promise<PortalProgram> {
    const response = await api.get(`/portal/programs/${id}`);
    return response.data.data;
  },

  async applyForProgram(id: string, formData?: FormData): Promise<ProgramApplication> {
    const response = await api.post(
      `/portal/programs/${id}/apply`,
      formData ?? {},
      formData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined
    );
    return response.data.data;
  },

  async getMyApplications(): Promise<ProgramApplication[]> {
    const response = await api.get('/portal/programs/my/applications');
    return response.data.data;
  },

  async cancelApplication(appId: string): Promise<void> {
    await api.delete(`/portal/programs/my/applications/${appId}`);
  },

  // --- Admin ---

  async listApplicationsAdmin(params?: {
    status?: string;
    programId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminApplicationsResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.programId) query.append('programId', params.programId);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const qs = query.toString();
    const response = await api.get(`/portal/program-applications${qs ? `?${qs}` : ''}`);
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
