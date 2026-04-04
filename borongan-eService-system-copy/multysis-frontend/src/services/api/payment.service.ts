import api from './auth.service';

export interface Payment {
  id: string;
  transactionId: string;
  taxComputationId: string;
  amount: number;
  paymentMethod: 'CASH' | 'CHECK' | 'ONLINE' | 'BANK_TRANSFER' | 'GCASH' | 'PAYMAYA' | 'OTHER';
  paymentDate: string;
  receivedBy: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentBalance {
  totalTax: number;
  totalPaid: number;
  balance: number;
}

export interface RecordPaymentData {
  transactionId: string;
  taxComputationId: string;
  amount: number;
  paymentMethod: 'CASH' | 'CHECK' | 'ONLINE' | 'BANK_TRANSFER' | 'GCASH' | 'PAYMAYA' | 'OTHER';
  paymentDate?: string;
  referenceNumber?: string;
  notes?: string;
}

export const paymentService = {
  /**
   * Record a payment
   */
  recordPayment: async (data: RecordPaymentData): Promise<Payment & { balance: number }> => {
    const response = await api.post('/api/payments', data);
    return response.data.data;
  },

  /**
   * Get payments for a transaction
   */
  getPaymentsByTransaction: async (transactionId: string): Promise<Payment[]> => {
    const response = await api.get(`/api/payments/transaction/${transactionId}`);
    return response.data.data;
  },

  /**
   * Get balance for a transaction
   */
  getBalance: async (transactionId: string): Promise<PaymentBalance> => {
    const response = await api.get(`/api/payments/transaction/${transactionId}/balance`);
    return response.data.data;
  },

  /**
   * Get payment by ID
   */
  getPayment: async (paymentId: string): Promise<Payment> => {
    const response = await api.get(`/api/payments/${paymentId}`);
    return response.data.data;
  },
};

