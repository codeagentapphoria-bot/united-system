export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  role: 'admin' | 'user' | 'subscriber' | 'developer';
  createdAt: string;
}

export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface SignupData {
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials | { email: string; password: string }, isAdmin?: boolean, isDev?: boolean) => Promise<any>;
  signup: (data: SignupData) => Promise<any>;
  logout: () => void;
}

