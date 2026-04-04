import api from './auth.service';

export interface TaxComputation {
  id: string;
  transactionId: string;
  taxProfileVersionId: string;
  isActive: boolean;
  inputs: Record<string, any>;
  derivedValues: Record<string, number>;
  breakdown: {
    steps: Array<{
      description: string;
      calculation: string;
      amount: number;
    }>;
    totalTax: number;
  };
  totalTax: number;
  adjustedTax?: number | null;
  isReassessment?: boolean;
  reassessmentReason?: string | null;
  previousComputationId?: string | null;
  differenceAmount?: number | null;
  exemptionsApplied?: string[] | null;
  discountsApplied?: string[] | null;
  penaltiesApplied?: string[] | null;
  computedAt: string;
  computedBy?: string;
  taxProfileVersion?: {
    id: string;
    version: string;
    taxProfile: {
      id: string;
      name: string;
      service: {
        id: string;
        code: string;
        name: string;
      };
    };
  };
}

export interface TaxPreviewResult {
  inputs: Record<string, any>;
  derivedValues: Record<string, number>;
  breakdown: {
    steps: Array<{
      description: string;
      calculation: string;
      amount: number;
    }>;
    totalTax: number;
  };
  totalTax: number;
}

export const taxComputationService = {
  async getTaxComputation(transactionId: string): Promise<TaxComputation | null> {
    try {
      const response = await api.get(`/transactions/${transactionId}/tax-computation`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async getActiveTaxComputation(transactionId: string): Promise<TaxComputation | null> {
    try {
      const response = await api.get(`/transactions/${transactionId}/tax-computation`);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async computeTax(transactionId: string): Promise<TaxComputation> {
    const response = await api.post(`/transactions/${transactionId}/compute-tax`, {});
    return response.data.data;
  },

  async previewTax(
    serviceId: string,
    serviceData: Record<string, any>,
    applicationDate?: string
  ): Promise<TaxPreviewResult> {
    const response = await api.post('/tax/preview', {
      serviceId,
      serviceData,
      applicationDate,
    });
    return response.data.data;
  },
};

