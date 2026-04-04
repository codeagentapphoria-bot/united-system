import api from './auth.service';
import type { TaxComputation } from './tax-computation.service';

export interface ReassessTaxData {
  reason: string;
}

export interface ReassessmentResult {
  newComputation: TaxComputation;
  oldComputation: {
    id: string;
    totalTax: number;
    adjustedTax?: number;
    breakdown: any;
    computedAt: string;
  };
  differenceAmount?: number;
}

export interface ReassessmentComparison {
  oldComputation: {
    id: string;
    totalTax: number;
    adjustedTax?: number;
    breakdown: any;
    inputs: any;
    derivedValues: any;
    computedAt: string;
  };
  newComputation: {
    id: string;
    totalTax: number;
    adjustedTax?: number;
    breakdown: any;
    inputs: any;
    derivedValues: any;
    computedAt: string;
    reassessmentReason?: string;
    differenceAmount?: number;
  };
  differenceAmount?: number;
}

export const taxReassessmentService = {
  /**
   * Trigger a tax reassessment
   */
  triggerReassessment: async (
    transactionId: string,
    data: ReassessTaxData
  ): Promise<ReassessmentResult> => {
    const response = await api.post(`/api/tax-reassessment/${transactionId}`, data);
    return response.data.data;
  },

  /**
   * Get reassessment history for a transaction
   */
  getReassessmentHistory: async (
    transactionId: string
  ): Promise<TaxComputation[]> => {
    const response = await api.get(`/api/tax-reassessment/${transactionId}/history`);
    return response.data.data;
  },

  /**
   * Get reassessment comparison (old vs new)
   */
  getReassessmentComparison: async (
    computationId: string
  ): Promise<ReassessmentComparison> => {
    const response = await api.get(`/api/tax-reassessment/comparison/${computationId}`);
    return response.data.data;
  },
};

