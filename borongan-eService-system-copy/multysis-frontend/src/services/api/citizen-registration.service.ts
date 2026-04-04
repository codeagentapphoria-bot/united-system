/**
 * citizen-registration.service.ts — updated for v2 portal-registration API
 *
 * All endpoints now point to /api/portal-registration (was: /api/citizen-registration).
 *
 * BACKWARD COMPATIBILITY: The response shape is normalized so existing callers
 * (AdminRegistrationWorkflow.tsx) that use `request.citizen?.firstName` etc.
 * continue to work without changes — `citizen` is aliased to `resident`.
 * Status filter values are also normalized: uppercase 'APPROVED' → lowercase 'approved'.
 */

import api from './auth.service';

// =============================================================================
// TYPES
// =============================================================================

export interface RegistrationRequestFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Resident/citizen info shape (same fields, two names for backward compat)
interface ResidentInfo {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  // Legacy field names (old citizen API)
  phoneNumber?: string;
  // New field names (unified resident API)
  contactNumber?: string;
  email?: string;
  residencyStatus?: string;
  birthdate?: string;
  birthDate?: string;           // old alias
  sex?: string;
  civilStatus?: string;
  address?: string;
  streetAddress?: string;
  barangayId?: number;
  addressBarangay?: string;
  addressMunicipality?: string;
  addressProvince?: string;
  addressRegion?: string;
  addressPostalCode?: string;
  addressStreetAddress?: string;
  idType?: string;
  proofOfIdentification?: string;
  idDocumentNumber?: string;
  username?: string;
  status?: string;
}

export interface RegistrationRequestResponse {
  id: string;
  citizenId?: string;           // old field — keep for backward compat
  residentId?: string;          // new field
  status: string;
  bimsMatchStatus?: string;
  adminNotes?: string;
  reviewedBy?: string | number;
  reviewedAt?: string;
  selfieUrl?: string;
  subscriberId?: string;
  createdAt: string;
  updatedAt: string;
  // Both names point to the same data (normalized in service)
  resident?: ResidentInfo;
  citizen?: ResidentInfo;       // backward compat alias → same as resident
}

export interface PaginatedResponse<T> {
  requests: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// INTERNAL NORMALIZER
// Adds `citizen` alias and normalizes field names for backward compat.
// =============================================================================
function normalizeRequest(r: any): RegistrationRequestResponse {
  const residentInfo = r.resident
    ? {
        ...r.resident,
        // add old field aliases
        phoneNumber: r.resident.contactNumber ?? r.resident.phoneNumber,
        birthDate: r.resident.birthdate ?? r.resident.birthDate,
        addressBarangay: r.resident.barangay?.barangayName ?? r.resident.addressBarangay,
        addressMunicipality: r.resident.barangay?.municipality?.municipalityName ?? r.resident.addressMunicipality,
        residencyStatus: r.resident.status ?? r.resident.residencyStatus,
      }
    : undefined;

  return {
    ...r,
    // Normalize status to uppercase for backward compat with STATUS_COLORS / STATUS_LABELS
    status: (r.status ?? '').toUpperCase().replace(' ', '_'),
    resident: residentInfo,
    citizen: residentInfo,      // alias
    citizenId: r.residentId ?? r.citizenId,
  };
}

function normalizeStatusFilter(status?: string): string | undefined {
  if (!status) return undefined;
  // Accept both 'ALL' and all/ALL; convert to lowercase for the API
  if (status.toUpperCase() === 'ALL') return undefined;
  return status.toLowerCase().replace(' ', '_');
}

// =============================================================================
// ADMIN REGISTRATION SERVICE
// =============================================================================

export const adminRegistrationService = {
  async getRegistrationRequests(
    filters?: RegistrationRequestFilters
  ): Promise<PaginatedResponse<RegistrationRequestResponse>> {
    const params = new URLSearchParams();
    const apiStatus = normalizeStatusFilter(filters?.status);
    if (apiStatus)       params.set('status', apiStatus);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page)   params.set('page',   String(filters.page));
    if (filters?.limit)  params.set('limit',  String(filters.limit));

    const response = await api.get(`/portal-registration/requests?${params.toString()}`);
    const data = response.data.data ?? response.data;

    return {
      ...data,
      requests: (data.requests ?? []).map(normalizeRequest),
    };
  },

  async getRegistrationRequestById(id: string): Promise<RegistrationRequestResponse> {
    const response = await api.get(`/portal-registration/requests/${id}`);
    return normalizeRequest(response.data.data ?? response.data);
  },

  async reviewRegistration(
    id: string,
    // Accept both old 'APPROVED'/'REJECTED' and new 'approved'/'rejected'
    action: 'APPROVED' | 'REJECTED' | 'approved' | 'rejected',
    adminNotes?: string
  ): Promise<{ residentId?: string; citizenId?: string; status: string; reviewedAt: string }> {
    const response = await api.post(`/portal-registration/requests/${id}/review`, {
      action: action.toLowerCase(),
      adminNotes,
    });
    const d = response.data.data ?? response.data;
    return { ...d, citizenId: d.residentId ?? d.citizenId };
  },

  async markUnderReview(id: string): Promise<void> {
    await api.patch(`/portal-registration/requests/${id}/under-review`);
  },

  async requestResubmission(id: string, adminNotes: string): Promise<void> {
    await api.post(`/portal-registration/requests/${id}/request-docs`, { adminNotes });
  },

  async deleteRejectedRegistrations(daysOld = 30): Promise<{ deletedCount: number }> {
    const response = await api.delete(
      `/portal-registration/requests/rejected?daysOld=${daysOld}`
    );
    return response.data.data ?? response.data;
  },

  async deleteRejectedRegistration(citizenId: string): Promise<void> {
    await api.delete(`/portal-registration/requests/rejected/${citizenId}`);
  },
};

// =============================================================================
// PORTAL REGISTRATION SERVICE (public — no auth)
// =============================================================================

export const citizenRegistrationService = {
  async getRegistrationStatus(usernameOrPhone: string) {
    const response = await api.get(`/portal-registration/status/${usernameOrPhone}`);
    return response.data.data;
  },
};
