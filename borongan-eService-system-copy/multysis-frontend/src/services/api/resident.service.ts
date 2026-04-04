/**
 * resident.service.ts
 *
 * Replaces: subscriber.service.ts + citizen.service.ts
 * All persons are now unified under the /api/residents endpoint.
 */

import api from './auth.service';

// =============================================================================
// TYPES
// =============================================================================

export interface Resident {
  id: string;
  residentId?: string;           // Display ID, e.g. RES-2026-0000001
  username?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  sex?: string;
  civilStatus?: string;
  birthdate?: string;
  birthRegion?: string;
  birthProvince?: string;
  birthMunicipality?: string;
  citizenship?: string;
  contactNumber?: string;
  email?: string;
  occupation?: string;
  profession?: string;
  employmentStatus?: string;
  educationAttainment?: string;
  monthlyIncome?: number;
  height?: string;
  weight?: string;
  isVoter?: boolean;
  isEmployed?: boolean;
  indigenousPerson?: boolean;
  idType?: string;
  idDocumentNumber?: string;
  acrNo?: string;
  emergencyContactPerson?: string;
  emergencyContactNumber?: string;
  spouseName?: string;
  picturePath?: string;
  proofOfIdentification?: string;
  streetAddress?: string;
  barangayId?: number;
  barangay?: {
    id: number;
    name: string;                          // API returns .name (not .barangayName)
    municipality?: {
      id: number;
      name: string;                        // API returns .name (not .municipalityName)
      province?: string;
      region?: string;
    };
  };
  status: string;
  applicationRemarks?: string;
  hasGoogleLinked?: boolean;
  // Beneficiary / classification
  seniorCitizen?: { id: string; status: string } | null;
  pwd?: { id: string; status: string } | null;
  student?: { id: string; status: string } | null;
  soloParent?: { id: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResidentFilters {
  search?: string;
  status?: string;
  barangayId?: number;
  municipalityId?: number;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}

export interface ResidentPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateResidentData {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  extensionName?: string | null;
  sex?: string;
  civilStatus?: string;
  birthdate?: string;
  birthRegion?: string | null;
  birthProvince?: string | null;
  birthMunicipality?: string | null;
  citizenship?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  barangayId?: number | null;
  streetAddress?: string | null;
  occupation?: string | null;
  profession?: string | null;
  employmentStatus?: string | null;
  educationAttainment?: string | null;
  monthlyIncome?: number | null;
  height?: string | null;
  weight?: string | null;
  isVoter?: boolean;
  isEmployed?: boolean;
  indigenousPerson?: boolean;
  idType?: string | null;
  idDocumentNumber?: string | null;
  acrNo?: string | null;
  emergencyContactPerson?: string | null;
  emergencyContactNumber?: string | null;
  spouseName?: string | null;
  picturePath?: string | null;
  proofOfIdentification?: string | null;
  status?: string;
  applicationRemarks?: string | null;
}

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * List residents (admin — paginated, filterable).
 */
export const residentService = {
  async listResidents(filters: ResidentFilters = {}, signal?: AbortSignal): Promise<{
    residents: Resident[];
    pagination: ResidentPagination;
  }> {
    const params = new URLSearchParams();
    if (filters.search)         params.set('search',         filters.search);
    if (filters.status)         params.set('status',         filters.status);
    if (filters.barangayId)     params.set('barangayId',     String(filters.barangayId));
    if (filters.municipalityId) params.set('municipalityId', String(filters.municipalityId));
    if (filters.page)           params.set('page',           String(filters.page));
    if (filters.limit)          params.set('limit',          String(filters.limit));

    const response = await api.get(`/residents?${params.toString()}`, { signal });
    return response.data;
  },

  async getResident(id: string, signal?: AbortSignal): Promise<Resident> {
    const response = await api.get(`/residents/${id}`, { signal });
    return response.data.data;
  },

  async getMyProfile(signal?: AbortSignal): Promise<Resident> {
    const response = await api.get('/residents/me', { signal });
    return response.data.data;
  },

  async getByResidentId(residentId: string, signal?: AbortSignal): Promise<Resident> {
    const response = await api.get(`/residents/by-resident-id/${residentId}`, { signal });
    return response.data.data;
  },

  async updateResident(id: string, data: UpdateResidentData): Promise<Resident> {
    const response = await api.put(`/residents/${id}`, data);
    return response.data.data;
  },

  async updateResidentWithFiles(id: string, formData: FormData): Promise<Resident> {
    const response = await api.put(`/residents/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async activate(id: string): Promise<Resident> {
    const response = await api.patch(`/residents/${id}/activate`);
    return response.data.data;
  },

  async deactivate(id: string): Promise<Resident> {
    const response = await api.patch(`/residents/${id}/deactivate`);
    return response.data.data;
  },

  async markDeceased(id: string): Promise<Resident> {
    const response = await api.patch(`/residents/${id}/deceased`);
    return response.data.data;
  },

  async markMovedOut(id: string): Promise<Resident> {
    const response = await api.patch(`/residents/${id}/moved-out`);
    return response.data.data;
  },

  async deleteResident(id: string): Promise<void> {
    await api.delete(`/residents/${id}`);
  },

  async getResidentTransactions(
    id: string,
    params: { page?: number; limit?: number; status?: string; paymentStatus?: string } = {}
  ) {
    const query = new URLSearchParams();
    if (params.page)          query.set('page',          String(params.page));
    if (params.limit)         query.set('limit',         String(params.limit));
    if (params.status)        query.set('status',        params.status);
    if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);

    const response = await api.get(
      `/residents/${id}/transactions${query.toString() ? `?${query.toString()}` : ''}`
    );
    return response.data;
  },

  async updateMyProfile(data: Partial<UpdateResidentData>): Promise<Resident> {
    const response = await api.put('/residents/me', data);
    return response.data.data;
  },

  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    const response = await api.get(`/residents/check-username?username=${encodeURIComponent(username)}`);
    return response.data.data;
  },

  /**
   * Search residents for use in dropdowns / selectors.
   * Returns a minimal list suitable for autocomplete.
   */
  async searchResidents(
    search: string,
    options: { status?: string; limit?: number } = {},
    signal?: AbortSignal
  ): Promise<Resident[]> {
    const params = new URLSearchParams({ search, limit: String(options.limit ?? 20) });
    if (options.status) params.set('status', options.status);
    const response = await api.get(`/residents?${params.toString()}`, { signal });
    return response.data.residents ?? [];
  },
};

export default residentService;
