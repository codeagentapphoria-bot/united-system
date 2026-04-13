import api from './auth.service';
import type { GovernmentProgramType } from './government-program.service';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ApplicationAttachment {
  label: string;
  filename: string;
  url: string;
  mimetype: string;
  size: number;
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

// ---------------------------------------------------------------------------
// Service — admin methods only
// ---------------------------------------------------------------------------

export const portalProgramsService = {
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
