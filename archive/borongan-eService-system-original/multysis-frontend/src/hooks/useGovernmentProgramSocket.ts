// React imports
import { useEffect, useState, useCallback } from 'react';

// Hooks
import { useSocket } from '@/context/SocketContext';

// Types
import type {
  GovernmentProgramDeletePayload,
  GovernmentProgramNewPayload,
  GovernmentProgramUpdatePayload,
} from '@/types/socket.types';

export interface UseGovernmentProgramSocketOptions {
  enabled?: boolean;
}

export interface UseGovernmentProgramSocketReturn {
  newProgram: GovernmentProgramNewPayload | null;
  programUpdate: GovernmentProgramUpdatePayload | null;
  programDelete: GovernmentProgramDeletePayload | null;
  clearNewProgram: () => void;
  clearProgramUpdate: () => void;
  clearProgramDelete: () => void;
}

export const useGovernmentProgramSocket = (
  options: UseGovernmentProgramSocketOptions = {}
): UseGovernmentProgramSocketReturn => {
  const { enabled = true } = options;
  const { socket, isConnected } = useSocket();
  const [newProgram, setNewProgram] = useState<GovernmentProgramNewPayload | null>(null);
  const [programUpdate, setProgramUpdate] = useState<GovernmentProgramUpdatePayload | null>(null);
  const [programDelete, setProgramDelete] = useState<GovernmentProgramDeletePayload | null>(null);

  useEffect(() => {
    if (!socket || !isConnected || !enabled) {
      return;
    }

    const handleNewProgram = (data: GovernmentProgramNewPayload) => {
      setNewProgram(data);
    };

    const handleProgramUpdate = (data: GovernmentProgramUpdatePayload) => {
      setProgramUpdate(data);
    };

    const handleProgramDelete = (data: GovernmentProgramDeletePayload) => {
      setProgramDelete(data);
    };

    socket.on('government-program:new', handleNewProgram);
    socket.on('government-program:update', handleProgramUpdate);
    socket.on('government-program:delete', handleProgramDelete);

    return () => {
      socket.off('government-program:new', handleNewProgram);
      socket.off('government-program:update', handleProgramUpdate);
      socket.off('government-program:delete', handleProgramDelete);
    };
  }, [socket, isConnected, enabled]);

  const clearNewProgram = useCallback(() => {
    setNewProgram(null);
  }, []);

  const clearProgramUpdate = useCallback(() => {
    setProgramUpdate(null);
  }, []);

  const clearProgramDelete = useCallback(() => {
    setProgramDelete(null);
  }, []);

  return {
    newProgram,
    programUpdate,
    programDelete,
    clearNewProgram,
    clearProgramUpdate,
    clearProgramDelete,
  };
};


