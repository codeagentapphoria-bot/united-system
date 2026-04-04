// Shared WebSocket event types for backend and frontend
// These types ensure type safety across the WebSocket implementation

export interface SocketUser {
  id: string;
  type: 'admin' | 'resident' | 'dev';
  email?: string;
  phoneNumber?: string;
}

export interface SocketAuthPayload {
  token: string;
}

// Transaction Update Events
export interface TransactionUpdatePayload {
  transactionId: string;
  status?: string;
  paymentStatus?: string;
  appointmentStatus?: string;
  updatedAt: Date | string;
  // For incremental updates
  oldStatus?: string;
  oldPaymentStatus?: string;
  updateRequestStatus?: string;
  oldUpdateRequestStatus?: string;
  serviceId?: string;
  serviceCode?: string;
  paymentAmount?: number;
}

// Transaction Note Events
export interface TransactionNotePayload {
  transactionId: string;
  message: string;
  isInternal?: boolean;
}

export interface TransactionNoteResponse {
  id: string;
  transactionId: string;
  message: string;
  senderType: 'ADMIN' | 'RESIDENT';
  senderId: string;
  isInternal: boolean;
  isRead: boolean;
  createdAt: string;
}

export interface TransactionNoteReadPayload {
  noteId: string;
  transactionId: string;
  senderType: 'ADMIN' | 'RESIDENT';
  isRead: boolean;
  updatedAt: Date | string;
}

// Typing Indicator Events
export interface TypingIndicatorPayload {
  transactionId: string;
  isTyping: boolean;
}

export interface TypingIndicatorResponse {
  userId: string;
  userType: 'admin' | 'resident' | 'dev';
  isTyping: boolean;
}

// Subscriber Events
export interface NewSubscriberPayload {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  phoneNumber: string;
  email?: string;
  status?: string;
  type: 'CITIZEN' | 'SUBSCRIBER';
  createdAt: Date | string;
}

export interface SubscriberUpdatePayload {
  subscriberId: string;
  status?: string;
  updatedAt: Date | string;
}

// Notification Events
export interface NotificationPayload {
  type:
    | 'transaction_created'
    | 'transaction_update'
    | 'subscriber_update'
    | 'transaction_note'
    | 'appointment_created'
    | 'appointment_update';
  message: string;
  transactionId?: string;
  residentId?: string;
  timestamp?: Date | string;
}

// Service Events
export interface NewServicePayload {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: Date | string;
}

export interface ServiceUpdatePayload {
  serviceId: string;
  code?: string;
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  updatedAt: Date | string;
}

export interface ServiceDeletePayload {
  serviceId: string;
}

// Appointment Events
export interface AppointmentNewPayload {
  transactionId: string;
  serviceId: string;
  serviceCode?: string;
  appointmentDate: Date | string;
  appointmentStatus: string;
  residentId: string;
}

export interface AppointmentUpdatePayload {
  transactionId: string;
  appointmentStatus?: string;
  appointmentDate?: Date | string;
  oldAppointmentStatus?: string;
  serviceId?: string;
  serviceCode?: string;
  residentId?: string;
  updatedAt: Date | string;
}

// New Transaction Event
export interface NewTransactionPayload {
  id: string;
  residentId?: string;
  transactionId: string;
  serviceId: string;
  status?: string;
  // For incremental updates - full transaction data
  paymentStatus?: string;
  paymentAmount?: number;
  referenceNumber?: string;
  createdAt: Date | string;
  serviceCode?: string;
}

// Subscription Events
export interface SubscribeTransactionPayload {
  transactionId: string;
}

export interface SubscribeSubscriberPayload {
  subscriberId: string;
}

// Beneficiary Events
export interface BeneficiaryNewPayload {
  beneficiaryId: string;
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT';
  residentId: string;
  status?: string;
  programIds?: string[];
  createdAt: Date | string;
}

export interface BeneficiaryUpdatePayload {
  beneficiaryId: string;
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT';
  residentId?: string;
  status?: string;
  oldStatus?: string;
  programIds?: string[];
  updatedAt: Date | string;
}

export interface BeneficiaryDeletePayload {
  beneficiaryId: string;
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT';
  residentId?: string;
}

// Government Program Events
export interface GovernmentProgramNewPayload {
  id: string;
  name: string;
  description?: string;
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';
  isActive: boolean;
  createdAt: Date | string;
}

export interface GovernmentProgramUpdatePayload {
  programId: string;
  name?: string;
  description?: string;
  type?: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';
  isActive?: boolean;
  oldIsActive?: boolean;
  updatedAt: Date | string;
}

export interface GovernmentProgramDeletePayload {
  programId: string;
}

// Citizen Events
export interface CitizenNewPayload {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  status: string;
  createdAt: Date | string;
}

export interface CitizenUpdatePayload {
  citizenId: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  extensionName?: string;
  status?: string;
  oldStatus?: string;
  updatedAt: Date | string;
}

export interface CitizenStatusChangePayload {
  citizenId: string;
  oldStatus: string;
  newStatus: string;
  action: 'approve' | 'reject' | 'activate' | 'deactivate';
  remarks?: string;
  updatedAt: Date | string;
}

// Error Events
export interface SocketErrorPayload {
  message: string;
  code?: string;
}

// Dev Dashboard Events
export interface DevSystemInfoPayload {
  nodeVersion: string;
  platform: string;
  arch: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  env: string;
  pid: number;
  cwd: string;
  timestamp: Date | string;
}

export interface DevDatabaseInfoPayload {
  connected: boolean;
  provider: string;
  poolSize: string | number;
  activeConnections: string | number;
  message?: string;
  error?: string;
  timestamp: Date | string;
}

export interface DevLogPayload {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: Date | string;
  metadata?: Record<string, any>;
}
