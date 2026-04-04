// React imports
import { useEffect, useState, useCallback } from 'react';

// Hooks
import { useSocket } from '@/context/SocketContext';

// Types
import type {
  CitizenNewPayload,
  CitizenStatusChangePayload,
  CitizenUpdatePayload,
} from '@/types/socket.types';

export interface UseCitizenSocketOptions {
  statusFilter?: string;
  enabled?: boolean;
}

export interface UseCitizenSocketReturn {
  newCitizen: CitizenNewPayload | null;
  citizenUpdate: CitizenUpdatePayload | null;
  citizenStatusChange: CitizenStatusChangePayload | null;
  clearNewCitizen: () => void;
  clearCitizenUpdate: () => void;
  clearCitizenStatusChange: () => void;
}

export const useCitizenSocket = (
  options: UseCitizenSocketOptions = {}
): UseCitizenSocketReturn => {
  const { statusFilter, enabled = true } = options;
  const { socket, isConnected } = useSocket();
  const [newCitizen, setNewCitizen] = useState<CitizenNewPayload | null>(null);
  const [citizenUpdate, setCitizenUpdate] = useState<CitizenUpdatePayload | null>(null);
  const [citizenStatusChange, setCitizenStatusChange] = useState<CitizenStatusChangePayload | null>(null);

  useEffect(() => {
    if (!socket || !isConnected || !enabled) {
      return;
    }

    const handleNewCitizen = (data: CitizenNewPayload) => {
      // Filter by status if provided
      if (statusFilter && data.status !== statusFilter) {
        return;
      }
      setNewCitizen(data);
    };

    const handleCitizenUpdate = (data: CitizenUpdatePayload) => {
      // Filter by status if provided
      if (statusFilter && data.status && data.status !== statusFilter) {
        return;
      }
      setCitizenUpdate(data);
    };

    const handleCitizenStatusChange = (data: CitizenStatusChangePayload) => {
      // Filter by status if provided
      if (statusFilter && data.newStatus !== statusFilter) {
        return;
      }
      setCitizenStatusChange(data);
    };

    socket.on('citizen:new', handleNewCitizen);
    socket.on('citizen:update', handleCitizenUpdate);
    socket.on('citizen:status-change', handleCitizenStatusChange);

    return () => {
      socket.off('citizen:new', handleNewCitizen);
      socket.off('citizen:update', handleCitizenUpdate);
      socket.off('citizen:status-change', handleCitizenStatusChange);
    };
  }, [socket, isConnected, enabled, statusFilter]);

  const clearNewCitizen = useCallback(() => {
    setNewCitizen(null);
  }, []);

  const clearCitizenUpdate = useCallback(() => {
    setCitizenUpdate(null);
  }, []);

  const clearCitizenStatusChange = useCallback(() => {
    setCitizenStatusChange(null);
  }, []);

  return {
    newCitizen,
    citizenUpdate,
    citizenStatusChange,
    clearNewCitizen,
    clearCitizenUpdate,
    clearCitizenStatusChange,
  };
};


