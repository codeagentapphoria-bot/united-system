import { useState, useEffect, useCallback } from 'react';

export interface StoredAuthUser {
  id: string;
  role: string;
}

const AUTH_USER_KEY = 'auth_user_minimal';

export const useAuthStorage = () => {
  const [storedUser, setStoredUser] = useState<StoredAuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const saveUser = useCallback((user: StoredAuthUser | null) => {
    try {
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
      setStoredUser(user);
    } catch (error) {
      console.error('Failed to save auth user to localStorage:', error);
    }
  }, []);

  const clearUser = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_USER_KEY);
      setStoredUser(null);
    } catch (error) {
      console.error('Failed to clear auth user from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_USER_KEY) {
        try {
          setStoredUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setStoredUser(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    storedUser,
    saveUser,
    clearUser,
  };
};

export default useAuthStorage;
