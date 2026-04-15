import api from './auth.service';

export type MedicineRequestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'DONE';

export interface MedicineRequestResident {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  username: string | null;
  contactNumber: string | null;
  email: string | null;
  barangay: { barangayName: string } | null;
}

export interface MedicineRequest {
  id: string;
  residentId: string;
  prescriptionPath: string;
  status: MedicineRequestStatus;
  note: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  preparedAt: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resident: MedicineRequestResident;
}

export interface MedicineRequestStats {
  total: number;
  pendingReview: number;
  approvedPreparing: number;
  readyForPickup: number;
  completed: number;
  rejected: number;
}

export interface MedicineRequestListResponse {
  data: MedicineRequest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const medicineRequestService = {
  async getAll(
    status?: MedicineRequestStatus,
    search?: string,
    page?: number,
    limit?: number
  ): Promise<MedicineRequestListResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());

    const queryString = params.toString();
    const url = `/medicine-requests${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return { data: response.data.data, pagination: response.data.pagination };
  },

  async getById(id: string): Promise<MedicineRequest> {
    const response = await api.get(`/medicine-requests/${id}`);
    return response.data.data;
  },

  async getStats(): Promise<MedicineRequestStats> {
    const response = await api.get('/medicine-requests/stats');
    return response.data.data;
  },

  async updateStatus(
    id: string,
    status: MedicineRequestStatus,
    note?: string
  ): Promise<MedicineRequest> {
    const response = await api.patch(`/medicine-requests/${id}/status`, { status, note });
    return response.data.data;
  },
};
