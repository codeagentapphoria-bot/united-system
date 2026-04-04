// React imports
import { useEffect, useState, useCallback } from 'react';

// Hooks
import { useSocket } from '@/context/SocketContext';

// Types
import type {
  AppointmentNewPayload,
  AppointmentUpdatePayload,
} from '@/types/socket.types';

export interface UseAppointmentSocketOptions {
  serviceId?: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}

export interface UseAppointmentSocketReturn {
  newAppointment: AppointmentNewPayload | null;
  appointmentUpdate: AppointmentUpdatePayload | null;
  clearNewAppointment: () => void;
  clearAppointmentUpdate: () => void;
}

export const useAppointmentSocket = (
  options: UseAppointmentSocketOptions = {}
): UseAppointmentSocketReturn => {
  const { serviceId, startDate, endDate, enabled = true } = options;
  const { socket, isConnected } = useSocket();
  const [newAppointment, setNewAppointment] = useState<AppointmentNewPayload | null>(null);
  const [appointmentUpdate, setAppointmentUpdate] = useState<AppointmentUpdatePayload | null>(null);

  useEffect(() => {
    if (!socket || !isConnected || !enabled) {
      return;
    }

    const handleNewAppointment = (data: AppointmentNewPayload) => {
      // Filter by serviceId if provided
      if (serviceId && data.serviceId !== serviceId) {
        return;
      }
      
      // Filter by date range if provided
      if (startDate || endDate) {
        const appointmentDate = new Date(data.appointmentDate);
        if (startDate && appointmentDate < startDate) {
          return;
        }
        if (endDate && appointmentDate > endDate) {
          return;
        }
      }
      
      setNewAppointment(data);
    };

    const handleAppointmentUpdate = (data: AppointmentUpdatePayload) => {
      // Filter by serviceId if provided
      if (serviceId && data.serviceId !== serviceId) {
        return;
      }
      
      // Filter by date range if provided
      if (startDate || endDate) {
        const appointmentDate = data.appointmentDate ? new Date(data.appointmentDate) : null;
        if (appointmentDate) {
          if (startDate && appointmentDate < startDate) {
            return;
          }
          if (endDate && appointmentDate > endDate) {
            return;
          }
        }
      }
      
      setAppointmentUpdate(data);
    };

    socket.on('appointment:new', handleNewAppointment);
    socket.on('appointment:update', handleAppointmentUpdate);

    return () => {
      socket.off('appointment:new', handleNewAppointment);
      socket.off('appointment:update', handleAppointmentUpdate);
    };
  }, [socket, isConnected, enabled, serviceId, startDate, endDate]);

  const clearNewAppointment = useCallback(() => {
    setNewAppointment(null);
  }, []);

  const clearAppointmentUpdate = useCallback(() => {
    setAppointmentUpdate(null);
  }, []);

  return {
    newAppointment,
    appointmentUpdate,
    clearNewAppointment,
    clearAppointmentUpdate,
  };
};


