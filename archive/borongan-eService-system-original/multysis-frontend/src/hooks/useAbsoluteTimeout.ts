import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

interface UseAbsoluteTimeoutOptions {
  absoluteTimeoutHours?: number; // Default: 6 hours
  warningMinutes?: number; // Show warning X minutes before timeout (default: 5 minutes)
  sessionStartTime?: Date; // When the session started (default: now)
  onTimeout?: () => void;
}

/**
 * Hook to track session duration and handle absolute timeout
 * Shows warning before timeout and auto-logout when absolute timeout is reached
 */
export const useAbsoluteTimeout = (options: UseAbsoluteTimeoutOptions = {}) => {
  const {
    absoluteTimeoutHours = 6,
    warningMinutes = 5,
    sessionStartTime = new Date(),
    onTimeout,
  } = options;
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  const absoluteTimeoutMs = absoluteTimeoutHours * 60 * 60 * 1000;
  const warningTimeoutMs = absoluteTimeoutMs - warningMinutes * 60 * 1000;

  const checkTimeout = () => {
    const now = Date.now();
    const sessionStart = sessionStartTime.getTime();
    const elapsed = now - sessionStart;

    // Check if warning should be shown
    if (elapsed >= warningTimeoutMs && !showWarning) {
      setShowWarning(true);
      toast({
        title: 'Session Warning',
        description: `Your session will expire in ${warningMinutes} minute${warningMinutes > 1 ? 's' : ''}. Please save your work.`,
        variant: 'default',
      });
    }

    // Check if absolute timeout reached
    if (elapsed >= absoluteTimeoutMs) {
      handleTimeout();
    }
  };

  const handleTimeout = () => {
    setShowWarning(false);
    toast({
      title: 'Session Expired',
      description: 'Your session has expired. Please log in again.',
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
    // Set warning timer
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      toast({
        title: 'Session Warning',
        description: `Your session will expire in ${warningMinutes} minute${warningMinutes > 1 ? 's' : ''}. Please save your work.`,
        variant: 'default',
      });
    }, warningTimeoutMs);

    // Set absolute timeout timer
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, absoluteTimeoutMs);

    // Check periodically (every minute) for more accurate warnings
    checkIntervalRef.current = setInterval(() => {
      checkTimeout();
    }, 60 * 1000);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [absoluteTimeoutHours, warningMinutes, sessionStartTime]);

  return {
    showWarning,
  };
};

