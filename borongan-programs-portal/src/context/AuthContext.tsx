import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/api/auth.service';
import { queryKeys } from '../lib/query-keys';
import { useAuthStorage } from '../hooks/auth/useAuthStorage';
import type { AuthContextType, User } from '../types/auth';

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
