/**
 * AuthContext.tsx — v2
 *
 * Handles both admin (email+password) and resident (username+password / Google OAuth) auth.
 * Removed: subscriber/signup flows (portal registration is a separate wizard).
 */

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/api/auth.service';
import { devService } from '../services/api/dev.service';
import { queryKeys } from '../lib/query-keys';
import { useAuthStorage } from '../hooks/auth/useAuthStorage';
import type { AuthContextType, User } from '../types/auth';
import { logger } from '../utils/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to read stored user synchronously (for initial state)
// This prevents flicker on page refresh - user is restored BEFORE first render
const getStoredUser = (): { id: string; role: string } | null => {
  try {
    const stored = localStorage.getItem('auth_user_minimal');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { storedUser, saveUser, clearUser } = useAuthStorage();

  // Initialize user from localStorage IMMEDIATELY (synchronously)
  // This prevents the flicker - isAuthenticated is true from the first render
  const stored = getStoredUser();
  const initialUser: User | null = stored
    ? ({ id: stored.id, role: stored.role, name: 'Restored User', email: '' } as User)
    : null;

  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(!!stored); // If stored user exists, don't show loading spinner
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Fetch current user from server (validates session)
  const { data: fetchedUser, isSuccess, isError } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  // Update user when query succeeds (refresh user data from server)
  useEffect(() => {
    if (isSuccess && fetchedUser) {
      setUser(fetchedUser);
      saveUser({ id: fetchedUser.id, role: fetchedUser.role });
    } else if (isSuccess && !fetchedUser) {
      // Not authenticated - clear stored user and user state
      setUser(null);
      clearUser();
    }
  }, [isSuccess, fetchedUser, saveUser, clearUser]);

  // Handle query error - preserve storedUser if exists (session might still be valid)
  useEffect(() => {
    if (isError) {
      if (storedUser) {
        // Keep the stored user - we'll retry on next mount
        setUser(storedUser ? { id: storedUser.id, role: storedUser.role, name: 'Restored User', email: '' } as User : null);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }
  }, [isError, storedUser]);

  // Mark loading as complete once query settles
  useEffect(() => {
    if (isSuccess || isError) {
      setIsLoading(false);
    }
  }, [isSuccess, isError]);

  // Restore user from storage if query is still pending but we have stored user
  useEffect(() => {
    if (storedUser && !user) {
      setUser({
        id: storedUser.id,
        role: storedUser.role,
        name: 'Restored User',
        email: '',
      } as User);
    }
  }, [storedUser, user]);

  const login = async (
    credentials:
      | { credential: string; password: string }   // portal resident
      | { email: string; password: string },       // admin
    isAdmin = false,
    isDev = false
  ) => {
    try {
      let userData: User | null = null;

      if (isDev && 'email' in credentials) {
        const { user } = await devService.devLogin(credentials as any);
        userData = user as any;
      } else if (isAdmin && 'email' in credentials) {
        const { user } = await authService.adminLogin(credentials as { email: string; password: string });
        userData = user;
      } else {
        const { resident } = await authService.portalLogin(
          credentials as { credential: string; password: string }
        );

        const firstName = resident.firstName || '';
        const lastName = resident.lastName || '';
        const middleName = resident.middleName || '';
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

        userData = {
          id: resident.id,
          name: fullName || resident.username || 'Resident',
          email: resident.email || '',
          username: resident.username,
          residentId: resident.residentId,
          role: 'resident',
          status: resident.status,
          createdAt: resident.createdAt || new Date().toISOString(),
          picturePath: resident.picturePath || null,
          firstName: firstName,
          middleName: middleName,
          lastName: lastName,
          birthdate: resident.birthdate || null,
          barangay: resident.barangay || null,
        } as any;
      }

      setUser(userData);
      if (userData) {
        saveUser({ id: userData.id, role: userData.role });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      
      return userData;
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch (error) {
      logger.error('Logout error:', error);
    }
    setUser(null);
    clearUser();
    queryClient.clear();
    setIsLoggingOut(false);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isLoggingOut,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
