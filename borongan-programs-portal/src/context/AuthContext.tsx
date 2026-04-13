import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/api/auth.service';
import { queryKeys } from '../lib/query-keys';
import { useAuthStorage } from '../hooks/auth/useAuthStorage';
import type { AuthContextType, User } from '../types/auth';

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
    if (isSuccess) setIsLoading(false);
  }, [isSuccess]);

  useEffect(() => {
    if (storedUser && !fetchedUser && !isSuccess && !isError) setIsLoading(false);
  }, [storedUser, fetchedUser, isSuccess, isError]);

  const login = async (credentials: { credential: string; password: string }) => {
    try {
      const { resident } = await authService.portalLogin(credentials);

      const firstName = String(resident.firstName || '');
      const lastName = String(resident.lastName || '');
      const middleName = String(resident.middleName || '');
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();

      const userData: User = {
        id: String(resident.id),
        name: fullName || String(resident.username || 'Resident'),
        email: String(resident.email || ''),
        username: String(resident.username || ''),
        residentId: resident.residentId ? String(resident.residentId) : undefined,
        role: 'resident',
        status: resident.status ? String(resident.status) : undefined,
        createdAt: String(resident.createdAt || new Date().toISOString()),
        picturePath: resident.picturePath ? String(resident.picturePath) : null,
        firstName,
        middleName,
        lastName,
        extensionName: resident.extensionName ? String(resident.extensionName) : null,
        birthdate: resident.birthdate ? String(resident.birthdate) : null,
        sex: resident.sex ? String(resident.sex) : null,
        civilStatus: resident.civilStatus ? String(resident.civilStatus) : null,
        streetAddress: resident.streetAddress ? String(resident.streetAddress) : null,
        contactNumber: resident.contactNumber ? String(resident.contactNumber) : null,
        emergencyContactPerson: resident.emergencyContactPerson ? String(resident.emergencyContactPerson) : null,
        emergencyContactNumber: resident.emergencyContactNumber ? String(resident.emergencyContactNumber) : null,
        barangay: resident.barangay as User['barangay'] ?? null,
      };

      setUser(userData);
      saveUser({ id: userData.id, role: userData.role });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      return userData;
    } catch (error: unknown) {
      const err = error as { message?: string };
      throw new Error(err.message || 'Login failed');
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      // silent
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
