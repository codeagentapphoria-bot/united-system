// React imports
import { useEffect, useState, useCallback } from 'react';

// Hooks
import { useSocket } from '@/context/SocketContext';

// Types
import type {
  BeneficiaryDeletePayload,
  BeneficiaryNewPayload,
  BeneficiaryUpdatePayload,
} from '@/types/socket.types';

export interface UseBeneficiarySocketOptions {
  type?: 'SENIOR_CITIZEN' | 'PWD' | 'STUDENT' | 'SOLO_PARENT';
  enabled?: boolean;
}

export interface UseBeneficiarySocketReturn {
  newBeneficiary: BeneficiaryNewPayload | null;
  beneficiaryUpdate: BeneficiaryUpdatePayload | null;
  beneficiaryDelete: BeneficiaryDeletePayload | null;
  clearNewBeneficiary: () => void;
  clearBeneficiaryUpdate: () => void;
  clearBeneficiaryDelete: () => void;
}

export const useBeneficiarySocket = (
  options: UseBeneficiarySocketOptions = {}
): UseBeneficiarySocketReturn => {
  const { type, enabled = true } = options;
  const { socket, isConnected } = useSocket();
  const [newBeneficiary, setNewBeneficiary] = useState<BeneficiaryNewPayload | null>(null);
  const [beneficiaryUpdate, setBeneficiaryUpdate] = useState<BeneficiaryUpdatePayload | null>(null);
  const [beneficiaryDelete, setBeneficiaryDelete] = useState<BeneficiaryDeletePayload | null>(null);

  useEffect(() => {
    if (!socket || !isConnected || !enabled) {
      return;
    }

    const handleNewBeneficiary = (data: BeneficiaryNewPayload) => {
      // Filter by type if provided
      if (type && data.type !== type) {
        return;
      }
      setNewBeneficiary(data);
    };

    const handleBeneficiaryUpdate = (data: BeneficiaryUpdatePayload) => {
      // Filter by type if provided
      if (type && data.type !== type) {
        return;
      }
      setBeneficiaryUpdate(data);
    };

    const handleBeneficiaryDelete = (data: BeneficiaryDeletePayload) => {
      // Filter by type if provided
      if (type && data.type !== type) {
        return;
      }
      setBeneficiaryDelete(data);
    };

    socket.on('beneficiary:new', handleNewBeneficiary);
    socket.on('beneficiary:update', handleBeneficiaryUpdate);
    socket.on('beneficiary:delete', handleBeneficiaryDelete);

    return () => {
      socket.off('beneficiary:new', handleNewBeneficiary);
      socket.off('beneficiary:update', handleBeneficiaryUpdate);
      socket.off('beneficiary:delete', handleBeneficiaryDelete);
    };
  }, [socket, isConnected, enabled, type]);

  const clearNewBeneficiary = useCallback(() => {
    setNewBeneficiary(null);
  }, []);

  const clearBeneficiaryUpdate = useCallback(() => {
    setBeneficiaryUpdate(null);
  }, []);

  const clearBeneficiaryDelete = useCallback(() => {
    setBeneficiaryDelete(null);
  }, []);

  return {
    newBeneficiary,
    beneficiaryUpdate,
    beneficiaryDelete,
    clearNewBeneficiary,
    clearBeneficiaryUpdate,
    clearBeneficiaryDelete,
  };
};


