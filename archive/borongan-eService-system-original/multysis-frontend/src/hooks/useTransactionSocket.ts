// React imports
import { useEffect, useState, useCallback } from 'react';

// Hooks
import { useSocket } from '@/context/SocketContext';

// Types
import type {
  TransactionUpdatePayload,
  TransactionNoteResponse,
  TypingIndicatorResponse,
} from '@/types/socket.types';

export const useTransactionSocket = (transactionId: string | null) => {
  const { socket, isConnected, subscribeToTransaction, unsubscribeFromTransaction } = useSocket();
  const [transactionUpdate, setTransactionUpdate] = useState<TransactionUpdatePayload | null>(null);
  const [newNote, setNewNote] = useState<TransactionNoteResponse | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket || !isConnected || !transactionId) {
      return;
    }

    subscribeToTransaction(transactionId);

    // Listen for transaction updates
    const handleTransactionUpdate = (update: TransactionUpdatePayload) => {
      if (update.transactionId === transactionId) {
        setTransactionUpdate(update);
      }
    };

    // Listen for new notes
    const handleNewNote = (note: TransactionNoteResponse) => {
      if (note.transactionId === transactionId) {
        setNewNote(note);
      }
    };

    // Listen for typing indicators
    const handleTyping = (data: TypingIndicatorResponse) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (data.isTyping) {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    socket.on('transaction:update', handleTransactionUpdate);
    socket.on('transaction:note:new', handleNewNote);
    socket.on('transaction:typing', handleTyping);

    return () => {
      unsubscribeFromTransaction(transactionId);
      socket.off('transaction:update', handleTransactionUpdate);
      socket.off('transaction:note:new', handleNewNote);
      socket.off('transaction:typing', handleTyping);
    };
  }, [socket, isConnected, transactionId, subscribeToTransaction, unsubscribeFromTransaction]);

  // Reset newNote after it's been processed
  const clearNewNote = useCallback(() => {
    setNewNote(null);
  }, []);

  return {
    transactionUpdate,
    newNote,
    typingUsers: Array.from(typingUsers),
    clearNewNote,
  };
};


