import api from './auth.service';

export interface Exemption {
  id: string;
  transactionId: string;
  taxComputationId?: string;
  exemptionType: 'SENIOR_CITIZEN' | 'PWD' | 'SOLO_PARENT' | 'OTHER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  approvedBy?: string;
  requestReason: string;
  rejectionReason?: string;
  supportingDocuments?: string[];
  exemptionAmount?: number;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExemptionRequestData {
  transactionId: string;
  exemptionType: 'SENIOR_CITIZEN' | 'PWD' | 'SOLO_PARENT' | 'OTHER';
  requestReason: string;
  supportingDocuments?: string[];
}

export interface ApproveExemptionData {
  exemptionAmount: number;
}

export interface RejectExemptionData {
  rejectionReason: string;
}

export const exemptionService = {
  /**
   * Create an exemption request
   */
  createExemptionRequest: async (
    data: CreateExemptionRequestData
  ): Promise<Exemption> => {
    const response = await api.post('/api/exemptions', data);
    return response.data.data;
  },

  /**
   * Get exemptions for a transaction
   */
  getExemptionsByTransaction: async (
    transactionId: string
  ): Promise<Exemption[]> => {
    const response = await api.get(
      `/api/exemptions/transaction/${transactionId}`
    );
    return response.data.data;
  },

  /**
   * Get exemption by ID
   */
  getExemption: async (exemptionId: string): Promise<Exemption> => {
    const response = await api.get(`/api/exemptions/${exemptionId}`);
    return response.data.data;
  },

  /**
   * Get pending exemptions (admin only)
   */
  getPendingExemptions: async (): Promise<Exemption[]> => {
    const response = await api.get('/api/exemptions/pending');
    return response.data.data;
  },

  /**
   * Approve an exemption (admin only)
   */
  approveExemption: async (
    exemptionId: string,
    data: ApproveExemptionData
  ): Promise<Exemption> => {
    const response = await api.patch(`/api/exemptions/${exemptionId}/approve`, data);
    return response.data.data;
  },

  /**
   * Reject an exemption (admin only)
   */
  rejectExemption: async (
    exemptionId: string,
    data: RejectExemptionData
  ): Promise<Exemption> => {
    const response = await api.patch(`/api/exemptions/${exemptionId}/reject`, data);
    return response.data.data;
  },
};

