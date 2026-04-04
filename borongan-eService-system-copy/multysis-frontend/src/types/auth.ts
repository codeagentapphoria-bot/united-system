export interface User {
  id: string;
  name: string;
  email?: string;
  username?: string;
  residentId?: string;
  role: 'admin' | 'resident' | 'developer';
  status?: string;
  createdAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignupData {
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  username: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  login: (
    credentials: { username: string; password: string } | { email: string; password: string },
    isAdmin?: boolean,
    isDev?: boolean
  ) => Promise<any>;
  logout: () => void;
}
