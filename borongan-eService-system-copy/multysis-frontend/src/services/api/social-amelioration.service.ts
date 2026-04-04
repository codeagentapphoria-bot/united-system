import type { Resident as Citizen } from '@/services/api/resident.service';
import type {
  PWDInput,
  SeniorCitizenInput,
  SoloParentInput,
  StudentInput,
} from '@/validations/beneficiary.schema';
import api from './auth.service';

export type BeneficiaryStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: ApiPagination;
}

export interface SeniorBeneficiary {
  id: string;
  residentId: string;
  citizenId: string; // alias for residentId — kept for backward compat
  seniorCitizenId: string;
  pensionTypes: string[];
  governmentPrograms: string[];
  status: BeneficiaryStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  citizen?: Citizen;  // alias for resident
  resident?: Citizen;
}

export interface PWDBeneficiary {
  id: string;
  residentId: string;
  citizenId: string; // alias for residentId — kept for backward compat
  pwdId: string;
  disabilityType: string;
  disabilityLevel: string;
  monetaryAllowance: boolean;
  assistedDevice: boolean;
  donorDevice?: string | null;
  governmentPrograms: string[];
  status: BeneficiaryStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  citizen?: Citizen;
  resident?: Citizen;
}

export interface StudentBeneficiary {
  id: string;
  residentId: string;
  citizenId: string; // alias for residentId — kept for backward compat
  studentId: string;
  gradeLevel: string;
  programs: string[];
  status: BeneficiaryStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  citizen?: Citizen;
  resident?: Citizen;
}

export interface SoloParentBeneficiary {
  id: string;
  residentId: string;
  citizenId: string; // alias for residentId — kept for backward compat
  soloParentId: string;
  category: string;
  assistancePrograms: string[];
  status: BeneficiaryStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  citizen?: Citizen;
  resident?: Citizen;
}

export interface OverviewStats {
  totalSeniorCitizens: number;
  totalPWD: number;
  totalStudents: number;
  totalSoloParents: number;
  totalBeneficiaries: number;
}

export interface TrendStat {
  period: string;
  seniorCitizens: number;
  pwd: number;
  students: number;
  soloParents: number;
}

interface ListParams {
  search?: string;
  status?: BeneficiaryStatus;
  programId?: string;
  page?: number;
  limit?: number;
}

/**
 * Remap citizenId → residentId for backend compatibility.
 * The form schema still uses "citizenId" as the field name,
 * but the backend expects "residentId".
 */
function toBackendPayload(data: Record<string, any>) {
  const { citizenId, ...rest } = data;
  return citizenId ? { residentId: citizenId, ...rest } : rest;
}

/**
 * Normalize backend response: add citizenId alias for residentId
 * so existing component checks (b.citizenId === selectedCitizen.id) still work.
 */
function normalizeBeneficiary(b: any) {
  return { ...b, citizenId: b.residentId ?? b.citizenId, citizen: b.resident ?? b.citizen };
}

const buildQueryParams = (params?: ListParams) => {
  if (!params) return undefined;
  const query: Record<string, string> = {};
  if (params.search) query.search = params.search;
  if (params.status) query.status = params.status;
  if (params.programId) query.programId = params.programId;
  if (params.page) query.page = params.page.toString();
  if (params.limit) query.limit = params.limit.toString();
  return query;
};

export const socialAmeliorationApi = {
  async getSeniorBeneficiaries(params?: ListParams): Promise<PaginatedResponse<SeniorBeneficiary>> {
    const response = await api.get('/social-amelioration/seniors', {
      params: buildQueryParams(params),
    });
    return { data: (response.data.data ?? []).map(normalizeBeneficiary), pagination: response.data.pagination };
  },

  async createSeniorBeneficiary(data: SeniorCitizenInput) {
    const response = await api.post('/social-amelioration/seniors', toBackendPayload(data as any));
    return normalizeBeneficiary(response.data.data) as SeniorBeneficiary;
  },

  async updateSeniorBeneficiary(id: string, data: Partial<SeniorCitizenInput> & { status?: BeneficiaryStatus }) {
    const response = await api.put(`/social-amelioration/seniors/${id}`, toBackendPayload(data as any));
    return normalizeBeneficiary(response.data.data) as SeniorBeneficiary;
  },

  async deleteSeniorBeneficiary(id: string) {
    await api.delete(`/social-amelioration/seniors/${id}`);
  },

  async getPWDBeneficiaries(params?: ListParams): Promise<PaginatedResponse<PWDBeneficiary>> {
    const response = await api.get('/social-amelioration/pwd', {
      params: buildQueryParams(params),
    });
    return { data: (response.data.data ?? []).map(normalizeBeneficiary), pagination: response.data.pagination };
  },

  async createPWDBeneficiary(data: PWDInput) {
    const response = await api.post('/social-amelioration/pwd', toBackendPayload(data as any));
    return normalizeBeneficiary(response.data.data) as PWDBeneficiary;
  },

  async updatePWDBeneficiary(id: string, data: Partial<PWDInput> & { status?: BeneficiaryStatus }) {
    const response = await api.put(`/social-amelioration/pwd/${id}`, toBackendPayload(data as any));
    return normalizeBeneficiary(response.data.data) as PWDBeneficiary;
  },

  async deletePWDBeneficiary(id: string) {
    await api.delete(`/social-amelioration/pwd/${id}`);
  },

  async getStudentBeneficiaries(params?: ListParams): Promise<PaginatedResponse<StudentBeneficiary>> {
    const response = await api.get('/social-amelioration/students', {
      params: buildQueryParams(params),
    });
    return { data: (response.data.data ?? []).map(normalizeBeneficiary), pagination: response.data.pagination };
  },

  async createStudentBeneficiary(data: StudentInput) {
    const response = await api.post('/social-amelioration/students', toBackendPayload(data as any));
    return normalizeBeneficiary(response.data.data) as StudentBeneficiary;
  },

  async updateStudentBeneficiary(id: string, data: Partial<StudentInput> & { status?: BeneficiaryStatus }) {
    const response = await api.put(`/social-amelioration/students/${id}`, toBackendPayload(data as any));
    return normalizeBeneficiary(response.data.data) as StudentBeneficiary;
  },

  async deleteStudentBeneficiary(id: string) {
    await api.delete(`/social-amelioration/students/${id}`);
  },

  async getSoloParentBeneficiaries(params?: ListParams): Promise<PaginatedResponse<SoloParentBeneficiary>> {
    const response = await api.get('/social-amelioration/solo-parents', {
      params: buildQueryParams(params),
    });
    return { data: (response.data.data ?? []).map(normalizeBeneficiary), pagination: response.data.pagination };
  },

  async createSoloParentBeneficiary(data: SoloParentInput) {
    const response = await api.post('/social-amelioration/solo-parents', toBackendPayload(data as any));
    return normalizeBeneficiary(response.data.data) as SoloParentBeneficiary;
  },

  async updateSoloParentBeneficiary(id: string, data: Partial<SoloParentInput> & { status?: BeneficiaryStatus }) {
    const response = await api.put(`/social-amelioration/solo-parents/${id}`, toBackendPayload(data as any));
    return normalizeBeneficiary(response.data.data) as SoloParentBeneficiary;
  },

  async deleteSoloParentBeneficiary(id: string) {
    await api.delete(`/social-amelioration/solo-parents/${id}`);
  },

  async getOverviewStats(): Promise<OverviewStats> {
    const response = await api.get('/social-amelioration/stats/overview');
    return response.data.data as OverviewStats;
  },

  async getTrendStats(range: 'daily' | 'monthly' | 'yearly' = 'monthly'): Promise<TrendStat[]> {
    const response = await api.get('/social-amelioration/stats/trends', {
      params: { range },
    });
    return response.data.data as TrendStat[];
  },
};

