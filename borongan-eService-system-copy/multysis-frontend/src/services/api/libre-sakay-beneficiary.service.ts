import api from './auth.service';

// =============================================================================
// TYPES
// =============================================================================

export interface BeneficiaryListItem {
  id: string;
  residentId: string;
  fullName: string;
  residentIdNumber: string;
  category: string;
  barangay: string;
  enrollmentStatus: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  applicationStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  suspendedAt: string | null;
  enrolledAt: string;
  applicationId: string;
  appliedAt: string;
  reviewedAt: string | null;
}

export interface BeneficiaryDetails extends BeneficiaryListItem {
  picturePath: string | null;
  middleName: string | null;
  extensionName: string | null;
  birthdate: string | null;
  sex: string | null;
  address: string;
  contactNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  submittedData: Record<string, any>;
  attachments: Record<string, any>;
  adminNotes: string | null;
  libreBeneficiaryId: string | null;
  passNumber: string | null;
  passExpiry: string | null;
  totalRides: number;
  lastRideDate: string | null;
}

export interface PaginatedBeneficiaries {
  data: BeneficiaryListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// =============================================================================
// SERVICE
// =============================================================================

export interface ListBeneficiariesParams {
  filter?: 'all' | 'active' | 'suspended';
  page?: number;
  limit?: number;
  search?: string;
}

export const libreSakayBeneficiaryService = {
  async list(params: ListBeneficiariesParams): Promise<PaginatedBeneficiaries> {
    const qs = new URLSearchParams();
    if (params.filter && params.filter !== 'all') qs.set('filter', params.filter);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);

    const res = await api.get(`/admin/libre-sakay/beneficiaries?${qs}`);
    return res.data;
  },

  async getById(id: string): Promise<BeneficiaryDetails> {
    const res = await api.get(`/admin/libre-sakay/beneficiaries/${id}`);
    return res.data.data;
  },

  async suspend(id: string): Promise<void> {
    const res = await api.patch(`/admin/libre-sakay/beneficiaries/${id}/suspend`);
    return res.data;
  },

  async activate(id: string): Promise<void> {
    const res = await api.patch(`/admin/libre-sakay/beneficiaries/${id}/activate`);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    const res = await api.delete(`/admin/libre-sakay/beneficiaries/${id}`);
    return res.data;
  },

  getExportUrl(_filter: 'all' | 'active' | 'suspended' = 'all'): string {
    // Deprecated: kept for type compatibility — use exportAsBlob() instead
    const base = import.meta.env.VITE_API_BASE_URL || '';
    const qs = new URLSearchParams();
    return `${base}/admin/libre-sakay/beneficiaries/export?${qs}`;
  },

  async exportAsBlob(filter: 'all' | 'active' | 'suspended' = 'all'): Promise<void> {
    const qs = new URLSearchParams();
    if (filter !== 'all') qs.set('filter', filter);
    const response = await api.get(`/admin/libre-sakay/beneficiaries/export?${qs}`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `libre-sakay-beneficiaries-${filter}-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
