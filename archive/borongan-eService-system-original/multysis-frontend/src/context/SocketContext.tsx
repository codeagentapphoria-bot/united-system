// React imports
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Hooks
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

// Services
import { authService } from '@/services/api/auth.service';

// Types
import type {
  DevDatabaseInfoPayload,
  DevLogPayload,
  DevSystemInfoPayload,
  TransactionNotePayload,
  TypingIndicatorPayload,
} from '@/types/socket.types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribeToTransaction: (transactionId: string) => void;
  unsubscribeFromTransaction: (transactionId: string) => void;
  subscribeToSubscriber: (subscriberId: string) => void;
  unsubscribeFromSubscriber: (subscriberId: string) => void;
  sendTransactionNote: (transactionId: string, message: string, isInternal?: boolean) => void;
  sendTypingIndicator: (transactionId: string, isTyping: boolean) => void;
  onDevSystemInfoUpdate: (callback: (data: DevSystemInfoPayload) => void) => () => void;
  onDevDatabaseInfoUpdate: (callback: (data: DevDatabaseInfoPayload) => void) => () => void;
  onDevLogUpdate: (callback: (data: DevLogPayload) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const subscribedTransactionsRef = useRef<Set<string>>(new Set());
  const subscribedSubscribersRef = useRef<Set<string>>(new Set());
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 5;
  const retryDelay = 3000; // 3 seconds
  
  // Throttle typing indicator to max 1 event per 300ms
  const typingThrottleRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const lastTypingTimeRef = useRef<Map<string, number>>(new Map());

    // Get API URL for Socket.io connection
    const getApiUrl = (): string => {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
      // Remove /api suffix for Socket.io (it connects to the root)
      return apiUrl.replace(/\/api$/, '') || 'http://localhost:3000';
    };

  useEffect(() => {
    // Wait for auth to finish loading before attempting connection
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        subscribedTransactionsRef.current.clear();
        subscribedSubscribersRef.current.clear();
      }
      return;
    }

    const apiUrl = getApiUrl();
    
    // Get Socket.io authentication token from API
    const connectSocket = async () => {
      try {
        // Fetch token from backend endpoint
        // This will fail if user is not authenticated or session expired
        const token = await authService.getSocketToken();
        
        // Connect to Socket.io with the token
        const newSocket = io(apiUrl, {
          auth: {
            token: token,
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          withCredentials: true, // Important: send cookies for re-authentication
        });

        newSocket.on('connect', () => {
          console.log('✅ Socket connected');
          setIsConnected(true);
          retryCountRef.current = 0; // Reset retry count on successful connection
          
          // Clear retry timeout if connection succeeds
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          
          // Automatic re-subscription on reconnect
          // Rejoin all previously subscribed rooms
          subscribedTransactionsRef.current.forEach((transactionId) => {
            newSocket.emit('subscribe:transaction', transactionId);
          });
          
          subscribedSubscribersRef.current.forEach((subscriberId) => {
            newSocket.emit('subscribe:subscriber', subscriberId);
          });
        });

        newSocket.on('disconnect', () => {
          console.log('❌ Socket disconnected');
          setIsConnected(false);
        });

        newSocket.on('connect_error', async (error) => {
          console.error('Socket connection error:', error);
          setIsConnected(false);
          
          // Clear any existing retry timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          // If authentication error, try to reconnect with a fresh token
          if (error.message?.includes('Authentication error') || error.message?.includes('No token')) {
            if (retryCountRef.current < maxRetries) {
              retryCountRef.current += 1;
              try {
                const newToken = await authService.getSocketToken();
                newSocket.auth = { token: newToken };
                retryTimeoutRef.current = setTimeout(() => {
                  newSocket.connect();
                }, retryDelay);
              } catch (tokenError) {
                console.error('Failed to refresh socket token:', tokenError);
                if (retryCountRef.current >= maxRetries) {
                  toast({
                    variant: 'destructive',
                    title: 'Connection Failed',
                    description: 'Unable to establish real-time connection. Please refresh the page.',
                  });
                }
              }
            } else {
              toast({
                variant: 'destructive',
                title: 'Connection Failed',
                description: 'Unable to establish real-time connection after multiple attempts. Please refresh the page.',
              });
            }
          } else {
            // For other errors, show user-friendly message
            const errorMessage = error.message || 'Connection error';
            if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
              toast({
                variant: 'destructive',
                title: 'Connection Error',
                description: 'Unable to connect to server. Please check your internet connection.',
              });
            }
          }
        });
        
        newSocket.on('error', (error: any) => {
          console.error('Socket error:', error);
          const errorMessage = error.message || 'An error occurred';
          toast({
            variant: 'destructive',
            title: 'Socket Error',
            description: errorMessage,
          });
        });

      socketRef.current = newSocket;
      setSocket(newSocket);
    } catch (error: any) {
      // Only log error if it's not a 401 (unauthorized) - that's expected if user isn't logged in
      if (error.message && !error.message.includes('Access token not found') && !error.message.includes('Unauthorized')) {
        console.error('Failed to connect socket:', error);
      }
      // Don't set socket if token fetch fails - user might not be authenticated
      // This is expected if user is not logged in or session expired
      setIsConnected(false);
    }
  };

  connectSocket();

  return () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
    retryCountRef.current = 0;
  };
}, [isAuthenticated, user, isLoading, toast]); // Add isLoading and toast to dependencies

  const subscribeToTransaction = useCallback((transactionId: string) => {
    if (socketRef.current && !subscribedTransactionsRef.current.has(transactionId)) {
      socketRef.current.emit('subscribe:transaction', transactionId);
      subscribedTransactionsRef.current.add(transactionId);
    }
  }, []);

  const unsubscribeFromTransaction = useCallback((transactionId: string) => {
    if (socketRef.current && subscribedTransactionsRef.current.has(transactionId)) {
      socketRef.current.emit('unsubscribe:transaction', transactionId);
      subscribedTransactionsRef.current.delete(transactionId);
    }
  }, []);

  const subscribeToSubscriber = useCallback((subscriberId: string) => {
    if (socketRef.current && !subscribedSubscribersRef.current.has(subscriberId)) {
      socketRef.current.emit('subscribe:subscriber', subscriberId);
      subscribedSubscribersRef.current.add(subscriberId);
    }
  }, []);

  const unsubscribeFromSubscriber = useCallback((subscriberId: string) => {
    if (socketRef.current && subscribedSubscribersRef.current.has(subscriberId)) {
      socketRef.current.emit('unsubscribe:subscriber', subscriberId);
      subscribedSubscribersRef.current.delete(subscriberId);
    }
  }, []);

  const sendTransactionNote = useCallback((transactionId: string, message: string, isInternal = false) => {
    if (socketRef.current && isConnected) {
      const payload: TransactionNotePayload = {
        transactionId,
        message,
        isInternal,
      };
      socketRef.current.emit('transaction:note', payload);
    }
  }, [isConnected]);

  const sendTypingIndicator = useCallback((transactionId: string, isTyping: boolean) => {
    if (!socketRef.current || !isConnected) return;

    const now = Date.now();
    const lastTime = lastTypingTimeRef.current.get(transactionId) || 0;
    
    // Throttle to max 1 event per 300ms
    if (isTyping && now - lastTime < 300) {
      // Clear existing timeout and set new one
      const existingTimeout = typingThrottleRef.current.get(transactionId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(() => {
        if (socketRef.current && isConnected) {
          const payload: TypingIndicatorPayload = {
            transactionId,
            isTyping: true,
          };
          socketRef.current.emit('transaction:typing', payload);
          lastTypingTimeRef.current.set(transactionId, Date.now());
        }
        typingThrottleRef.current.delete(transactionId);
      }, 300 - (now - lastTime));
      
      typingThrottleRef.current.set(transactionId, timeout);
      return;
    }

    // Send immediately if enough time has passed or if stopping typing
    if (!isTyping || now - lastTime >= 300) {
      const payload: TypingIndicatorPayload = {
        transactionId,
        isTyping,
      };
      socketRef.current.emit('transaction:typing', payload);
      lastTypingTimeRef.current.set(transactionId, now);
      
      // Clear any pending timeout
      const existingTimeout = typingThrottleRef.current.get(transactionId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingThrottleRef.current.delete(transactionId);
      }
    }
  }, [isConnected]);

  const onDevSystemInfoUpdate = useCallback((callback: (data: DevSystemInfoPayload) => void) => {
    if (!socketRef.current) {
      return () => {}; // Return no-op cleanup if socket not available
    }

    socketRef.current.on('dev:system:update', callback);

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off('dev:system:update', callback);
      }
    };
  }, []);

  const onDevDatabaseInfoUpdate = useCallback((callback: (data: DevDatabaseInfoPayload) => void) => {
    if (!socketRef.current) {
      return () => {}; // Return no-op cleanup if socket not available
    }

    socketRef.current.on('dev:database:update', callback);

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off('dev:database:update', callback);
      }
    };
  }, []);

  const onDevLogUpdate = useCallback((callback: (data: DevLogPayload) => void) => {
    if (!socketRef.current) {
      return () => {}; // Return no-op cleanup if socket not available
    }

    socketRef.current.on('dev:log:new', callback);

    // Return cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.off('dev:log:new', callback);
      }
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        subscribeToTransaction,
        unsubscribeFromTransaction,
        subscribeToSubscriber,
        unsubscribeFromSubscriber,
        sendTransactionNote,
        sendTypingIndicator,
        onDevSystemInfoUpdate,
        onDevDatabaseInfoUpdate,
        onDevLogUpdate,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

