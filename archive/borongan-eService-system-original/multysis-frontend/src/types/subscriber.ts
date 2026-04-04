import type { Service } from '@/services/api/service.service';

export interface Transaction {
  id: string;
  subscriberId: string;
  serviceId: string;
  transactionId: string;
  referenceNumber: string;
  paymentStatus: string;
  paymentAmount: number;
  transmitalNo?: string;
  referenceNumberGeneratedAt?: string;
  isResidentOfBorongan: boolean;
  permitType?: string;
  status?: string;
  isPosted: boolean;
  validIdToPresent?: string;
  remarks?: string;
  serviceData?: any; // JSONB field for dynamic service-specific data
  createdAt: string;
  updatedAt: string;
  service: Service; // Service relation
  // Appointment fields
  preferredAppointmentDate?: string;
  scheduledAppointmentDate?: string;
  appointmentStatus?: 'PENDING' | 'ACCEPTED' | 'REQUESTED_UPDATE' | 'DECLINED' | 'CANCELLED';
}

export interface SubscriberTransactionResponse {
  transactions: Transaction[];
}

