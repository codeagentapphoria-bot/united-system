import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

interface UseIdleTimeoutOptions {
  idleTimeoutMinutes?: number; // Default: 15 minutes
  warningMinutes?: number; // Show warning X minutes before timeout (default: 2 minutes)
  onTimeout?: () => void;
}

/**
 * Hook to track user activity and handle idle timeout
 * Shows warning before timeout and auto-logout when idle timeout is reached
 */
export const useIdleTimeout = (options: UseIdleTimeoutOptions = {}) => {
  const { idleTimeoutMinutes = 15, warningMinutes = 2, onTimeout } = options;
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const idleTimeoutMs = idleTimeoutMinutes * 60 * 1000;
  const warningTimeoutMs = (idleTimeoutMinutes - warningMinutes) * 60 * 1000;

  const resetTimers = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      toast({
        title: 'Session Warning',
        description: `Your session will expire in ${warningMinutes} minute${warningMinutes > 1 ? 's' : ''} due to inactivity.`,
        variant: 'default',
      });
    }, warningTimeoutMs);

    // Set logout timer
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, idleTimeoutMs);
  };

  const handleTimeout = () => {
    setShowWarning(false);
    toast({
      title: 'Session Expired',
      description: 'Your session has expired due to inactivity. Please log in again.',
      variant: 'destructive',
    });
    
    if (onTimeout) {
      onTimeout();
    } else {
      logout();
      navigate('/login');
    }
  };

  useEffect(() => {
    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetTimers();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timers
    resetTimers();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [idleTimeoutMinutes, warningMinutes]);

  return {
    showWarning,
    resetTimers,
  };
};

