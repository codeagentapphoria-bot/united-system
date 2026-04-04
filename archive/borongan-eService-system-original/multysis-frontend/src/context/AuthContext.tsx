import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authService } from '../services/api/auth.service';
import { devService } from '../services/api/dev.service';
import type { AuthContextType, LoginCredentials, SignupData, User } from '../types/auth';
import { logger } from '../utils/logger';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    // Tokens are stored in HTTP-only cookies, so we check by calling the API
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        // Not authenticated or session expired - user will be redirected to login
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials | { email: string; password: string }, isAdmin: boolean = false, isDev: boolean = false) => {
    try {
      if (isDev && 'email' in credentials) {
        // Dev login
        const { user, token } = await devService.devLogin(credentials);
        setUser(user);
        return { user, token };
      } else if (isAdmin && 'email' in credentials) {
        // Admin login
        const { user, token } = await authService.adminLogin(credentials);
        setUser(user);
        return { user, token };
      } else {
        // Portal login
        const { subscriber, token } = await authService.portalLogin(credentials as LoginCredentials);
        // Construct name from firstName and lastName with fallback
        const firstName = subscriber.firstName || '';
        const lastName = subscriber.lastName || '';
        const middleName = subscriber.middleName || '';
        const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
        const displayName = fullName || subscriber.phoneNumber || 'Subscriber';
        
        const userData: User = {
          id: subscriber.id,
          name: displayName,
          email: subscriber.email || '',
          phoneNumber: subscriber.phoneNumber,
          role: 'subscriber',
          createdAt: subscriber.createdAt || new Date().toISOString(),
        };
        setUser(userData);
        return { subscriber, token };
      }
    } catch (error: any) {
      // Re-throw with proper error message
      const errorMessage = error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const signup = async (data: SignupData) => {
    try {
      const { subscriber, token } = await authService.portalSignup(data);
      // Construct name from firstName and lastName with fallback
      const firstName = subscriber.firstName || '';
      const lastName = subscriber.lastName || '';
      const middleName = subscriber.middleName || '';
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
      const displayName = fullName || subscriber.phoneNumber || 'Subscriber';
      
      const userData: User = {
        id: subscriber.id,
        name: displayName,
        email: subscriber.email || '',
        phoneNumber: subscriber.phoneNumber,
        role: 'subscriber',
        createdAt: subscriber.createdAt || new Date().toISOString(),
      };
      setUser(userData);
      return { subscriber, token };
    } catch (error: any) {
      // Re-throw with proper error message
      const errorMessage = error.message || 'Signup failed';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      logger.error('Logout error:', error);
    }
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
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

