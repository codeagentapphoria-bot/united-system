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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const { storedUser, saveUser, clearUser } = useAuthStorage();
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: fetchedUser, isSuccess, isError } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  useEffect(() => {
    if (isError) {
      setUser(null);
      clearUser();
      setIsLoading(false);
    }
  }, [isError, clearUser]);

  useEffect(() => {
    if (isSuccess && fetchedUser) {
      setUser(fetchedUser);
      saveUser({ id: fetchedUser.id, role: fetchedUser.role });
    } else if (isSuccess && !fetchedUser) {
      setUser(null);
      clearUser();
    }
  }, [isSuccess, fetchedUser, saveUser, clearUser]);

  useEffect(() => {
    if (isSuccess) {
      setIsLoading(false);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (storedUser && !fetchedUser && !isSuccess && !isError) {
      setIsLoading(false);
    }
  }, [storedUser, fetchedUser, isSuccess, isError]);

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
      | { username: string; password: string }    // portal resident
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
          credentials as { username: string; password: string }
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
