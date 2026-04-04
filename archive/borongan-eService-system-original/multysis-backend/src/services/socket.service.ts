import { Server as SocketIOServer } from 'socket.io';
import type {
  AppointmentNewPayload,
  AppointmentUpdatePayload,
  BeneficiaryDeletePayload,
  BeneficiaryNewPayload,
  BeneficiaryUpdatePayload,
  CitizenNewPayload,
  CitizenStatusChangePayload,
  CitizenUpdatePayload,
  DevDatabaseInfoPayload,
  DevLogPayload,
  DevSystemInfoPayload,
  GovernmentProgramDeletePayload,
  GovernmentProgramNewPayload,
  GovernmentProgramUpdatePayload,
  NewServicePayload,
  NewSubscriberPayload,
  NewTransactionPayload,
  ServiceDeletePayload,
  ServiceUpdatePayload,
  SubscriberUpdatePayload,
  TransactionNoteReadPayload,
  TransactionUpdatePayload,
} from '../types/socket.types';

let ioInstance: SocketIOServer | null = null;

export const setSocketInstance = (io: SocketIOServer): void => {
  ioInstance = io;
};

export const getSocketInstance = (): SocketIOServer | null => {
  return ioInstance || ((global as any).io as SocketIOServer) || null;
};

export const emitTransactionUpdate = (
  transactionId: string,
  update: {
    status?: string;
    paymentStatus?: string;
    appointmentStatus?: string;
    updatedAt: Date;
    // For incremental updates
    oldStatus?: string;
    oldPaymentStatus?: string;
    updateRequestStatus?: string;
    oldUpdateRequestStatus?: string;
    serviceId?: string;
    serviceCode?: string;
    paymentAmount?: number;
  }
): void => {
  const io = getSocketInstance();
  if (io) {
    io.to(`transaction:${transactionId}`).emit('transaction:update', {
      transactionId,
      ...update,
      updatedAt: update.updatedAt.toISOString(),
    } as TransactionUpdatePayload);

    // Also notify admins for notification count updates
    io.to('admins').emit('transaction:update', {
      transactionId,
      ...update,
      updatedAt: update.updatedAt.toISOString(),
    } as TransactionUpdatePayload);
  }
};

export const emitTransactionNoteRead = (
  noteId: string,
  transactionId: string,
  senderType: 'ADMIN' | 'SUBSCRIBER',
  isRead: boolean
): void => {
  const io = getSocketInstance();
  if (io) {
    const payload: TransactionNoteReadPayload = {
      noteId,
      transactionId,
      senderType,
      isRead,
      updatedAt: new Date().toISOString(),
    };

    // Emit to transaction room
    io.to(`transaction:${transactionId}`).emit('transaction:note:read', payload);

    // Also notify admins for notification count updates
    io.to('admins').emit('transaction:note:read', payload);
  }
};

export const emitSubscriberUpdate = (
  subscriberId: string,
  update: {
    status?: string;
    updatedAt: Date;
  }
): void => {
  const io = getSocketInstance();
  if (io) {
    io.to(`subscriber:${subscriberId}`).emit('subscriber:update', {
      subscriberId,
      ...update,
      updatedAt: update.updatedAt.toISOString(),
    } as SubscriberUpdatePayload);

    io.to(`user:${subscriberId}`).emit('notification:new', {
      type: 'subscriber_update',
      message: 'Your account status has been updated',
      subscriberId,
      ...update,
      timestamp: update.updatedAt.toISOString(),
    });
  }
};

export const emitNewSubscriber = (subscriber: {
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
}): void => {
  const io = getSocketInstance();
  if (io) {
    // Notify admins about new subscriber
    io.to('admins').emit('subscriber:new', {
      id: subscriber.id,
      firstName: subscriber.firstName,
      middleName: subscriber.middleName,
      lastName: subscriber.lastName,
      extensionName: subscriber.extensionName,
      phoneNumber: subscriber.phoneNumber,
      email: subscriber.email,
      status: subscriber.status,
      type: subscriber.type,
      createdAt:
        subscriber.createdAt instanceof Date
          ? subscriber.createdAt.toISOString()
          : subscriber.createdAt,
    } as NewSubscriberPayload);
  }
};

export const emitNewService = (service: {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
  createdAt: Date | string;
}): void => {
  const io = getSocketInstance();
  if (io) {
    // Notify admins about new service
    io.to('admins').emit('service:new', {
      id: service.id,
      code: service.code,
      name: service.name,
      description: service.description,
      category: service.category,
      isActive: service.isActive,
      createdAt:
        service.createdAt instanceof Date ? service.createdAt.toISOString() : service.createdAt,
    } as NewServicePayload);
  }
};

export const emitServiceUpdate = (
  serviceId: string,
  update: {
    code?: string;
    name?: string;
    description?: string;
    category?: string;
    isActive?: boolean;
    updatedAt: Date;
  }
): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('service:update', {
      serviceId,
      ...update,
      updatedAt: update.updatedAt.toISOString(),
    } as ServiceUpdatePayload);
  }
};

export const emitServiceDelete = (serviceId: string): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('service:delete', {
      serviceId,
    } as ServiceDeletePayload);
  }
};

export const emitAppointmentNew = (appointment: {
  transactionId: string;
  serviceId: string;
  serviceCode?: string;
  appointmentDate: Date | string;
  appointmentStatus?: string;
  subscriberId: string;
}): void => {
  const io = getSocketInstance();
  if (io) {
    const payload: AppointmentNewPayload = {
      transactionId: appointment.transactionId,
      serviceId: appointment.serviceId,
      serviceCode: appointment.serviceCode,
      appointmentDate:
        appointment.appointmentDate instanceof Date
          ? appointment.appointmentDate.toISOString()
          : appointment.appointmentDate,
      appointmentStatus: appointment.appointmentStatus || 'PENDING',
      subscriberId: appointment.subscriberId,
    };

    // Notify admins
    io.to('admins').emit('appointment:new', payload);

    // Notify the subscriber
    io.to(`user:${appointment.subscriberId}`).emit('notification:new', {
      type: 'appointment_created',
      message: 'Your appointment has been scheduled',
      transactionId: appointment.transactionId,
      timestamp: new Date().toISOString(),
    });
  }
};

export const emitAppointmentUpdate = (
  transactionId: string,
  update: {
    appointmentStatus?: string;
    appointmentDate?: Date | string;
    oldAppointmentStatus?: string;
    serviceId?: string;
    serviceCode?: string;
    subscriberId?: string;
    updatedAt: Date;
  }
): void => {
  const io = getSocketInstance();
  if (io) {
    const payload: AppointmentUpdatePayload = {
      transactionId,
      appointmentStatus: update.appointmentStatus,
      appointmentDate: update.appointmentDate
        ? update.appointmentDate instanceof Date
          ? update.appointmentDate.toISOString()
          : update.appointmentDate
        : undefined,
      oldAppointmentStatus: update.oldAppointmentStatus,
      serviceId: update.serviceId,
      serviceCode: update.serviceCode,
      subscriberId: update.subscriberId,
      updatedAt: update.updatedAt.toISOString(),
    };

    // Emit to transaction room
    io.to(`transaction:${transactionId}`).emit('appointment:update', payload);

    // Also notify admins
    io.to('admins').emit('appointment:update', payload);

    // Notify subscriber if status changed
    if (update.subscriberId && update.oldAppointmentStatus !== update.appointmentStatus) {
      io.to(`user:${update.subscriberId}`).emit('notification:new', {
        type: 'appointment_update',
        message: `Your appointment status has been updated to ${update.appointmentStatus || 'unknown'}`,
        transactionId,
        timestamp: update.updatedAt.toISOString(),
      });
    }
  }
};

export const emitNewTransaction = (transaction: {
  id: string;
  subscriberId: string;
  transactionId: string;
  serviceId: string;
  status?: string;
  // For incremental updates - full transaction data
  paymentStatus?: string;
  paymentAmount?: number;
  referenceNumber?: string;
  createdAt: Date | string;
  serviceCode?: string;
}): void => {
  const io = getSocketInstance();
  if (io) {
    // Notify admins with full transaction data
    io.to('admins').emit('transaction:new', {
      ...transaction,
      createdAt:
        transaction.createdAt instanceof Date
          ? transaction.createdAt.toISOString()
          : transaction.createdAt,
    } as NewTransactionPayload);

    // Notify the subscriber
    io.to(`user:${transaction.subscriberId}`).emit('notification:new', {
      type: 'transaction_created',
      message: 'Your transaction has been created',
      transactionId: transaction.id,
      timestamp: new Date().toISOString(),
    });
  }
};

export const emitBeneficiaryNew = (beneficiary: {
  beneficiaryId: string;
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT';
  citizenId: string;
  status?: string;
  programIds?: string[];
  createdAt: Date | string;
}): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('beneficiary:new', {
      beneficiaryId: beneficiary.beneficiaryId,
      type: beneficiary.type,
      citizenId: beneficiary.citizenId,
      status: beneficiary.status,
      programIds: beneficiary.programIds,
      createdAt:
        beneficiary.createdAt instanceof Date
          ? beneficiary.createdAt.toISOString()
          : beneficiary.createdAt,
    } as BeneficiaryNewPayload);
  }
};

export const emitBeneficiaryUpdate = (
  beneficiaryId: string,
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT',
  update: {
    citizenId?: string;
    status?: string;
    oldStatus?: string;
    programIds?: string[];
    updatedAt: Date;
  }
): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('beneficiary:update', {
      beneficiaryId,
      type,
      citizenId: update.citizenId,
      status: update.status,
      oldStatus: update.oldStatus,
      programIds: update.programIds,
      updatedAt: update.updatedAt.toISOString(),
    } as BeneficiaryUpdatePayload);
  }
};

export const emitBeneficiaryDelete = (
  beneficiaryId: string,
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT',
  citizenId?: string
): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('beneficiary:delete', {
      beneficiaryId,
      type,
      citizenId,
    } as BeneficiaryDeletePayload);
  }
};

export const emitGovernmentProgramNew = (program: {
  id: string;
  name: string;
  description?: string;
  type: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';
  isActive: boolean;
  createdAt: Date | string;
}): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('government-program:new', {
      id: program.id,
      name: program.name,
      description: program.description,
      type: program.type,
      isActive: program.isActive,
      createdAt:
        program.createdAt instanceof Date ? program.createdAt.toISOString() : program.createdAt,
    } as GovernmentProgramNewPayload);
  }
};

export const emitGovernmentProgramUpdate = (
  programId: string,
  update: {
    name?: string;
    description?: string;
    type?: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT' | 'ALL';
    isActive?: boolean;
    oldIsActive?: boolean;
    updatedAt: Date;
  }
): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('government-program:update', {
      programId,
      name: update.name,
      description: update.description,
      type: update.type,
      isActive: update.isActive,
      oldIsActive: update.oldIsActive,
      updatedAt: update.updatedAt.toISOString(),
    } as GovernmentProgramUpdatePayload);
  }
};

export const emitGovernmentProgramDelete = (programId: string): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('government-program:delete', {
      programId,
    } as GovernmentProgramDeletePayload);
  }
};

export const emitCitizenNew = (citizen: {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  status: string;
  createdAt: Date | string;
}): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('citizen:new', {
      id: citizen.id,
      firstName: citizen.firstName,
      middleName: citizen.middleName,
      lastName: citizen.lastName,
      extensionName: citizen.extensionName,
      status: citizen.status,
      createdAt:
        citizen.createdAt instanceof Date ? citizen.createdAt.toISOString() : citizen.createdAt,
    } as CitizenNewPayload);
  }
};

export const emitCitizenUpdate = (
  citizenId: string,
  update: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    extensionName?: string;
    status?: string;
    oldStatus?: string;
    updatedAt: Date;
  }
): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('admins').emit('citizen:update', {
      citizenId,
      firstName: update.firstName,
      middleName: update.middleName,
      lastName: update.lastName,
      extensionName: update.extensionName,
      status: update.status,
      oldStatus: update.oldStatus,
      updatedAt: update.updatedAt.toISOString(),
    } as CitizenUpdatePayload);
  }
};

export const emitCitizenStatusChange = (
  citizenId: string,
  oldStatus: string,
  newStatus: string,
  action: 'approve' | 'reject' | 'activate' | 'deactivate',
  remarks?: string
): void => {
  const io = getSocketInstance();
  if (io) {
    const payload: CitizenStatusChangePayload = {
      citizenId,
      oldStatus,
      newStatus,
      action,
      remarks,
      updatedAt: new Date().toISOString(),
    };

    // Notify admins
    io.to('admins').emit('citizen:status-change', payload);

    // Notify the citizen (if they have a user account)
    io.to(`user:${citizenId}`).emit('notification:new', {
      type: 'transaction_update', // Reuse existing notification type
      message: `Your citizen registration has been ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'activate' ? 'activated' : 'deactivated'}`,
      timestamp: new Date().toISOString(),
    });
  }
};

// Dev Dashboard Events
export const emitDevSystemInfoUpdate = (systemInfo: {
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
}): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('developers').emit('dev:system:update', {
      ...systemInfo,
      timestamp: new Date().toISOString(),
    } as DevSystemInfoPayload);
  }
};

export const emitDevDatabaseInfoUpdate = (databaseInfo: {
  connected: boolean;
  provider: string;
  poolSize: string | number;
  activeConnections: string | number;
  message?: string;
  error?: string;
}): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('developers').emit('dev:database:update', {
      ...databaseInfo,
      timestamp: new Date().toISOString(),
    } as DevDatabaseInfoPayload);
  }
};

export const emitDevLogUpdate = (log: {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
}): void => {
  const io = getSocketInstance();
  if (io) {
    io.to('developers').emit('dev:log:new', {
      ...log,
      timestamp: new Date().toISOString(),
    } as DevLogPayload);
  }
};
