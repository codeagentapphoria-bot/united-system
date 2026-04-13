export interface User {
  id: string;
  name: string;
  email?: string;
  username?: string;
  residentId?: string;
  role: 'admin' | 'resident' | 'developer';
  status?: string;
  createdAt: string;
  // Resident-specific fields
  firstName?: string;
  middleName?: string;
  lastName?: string;
  extensionName?: string | null;
  birthdate?: string | null;
  sex?: string | null;
  civilStatus?: string | null;
  streetAddress?: string | null;
  contactNumber?: string | null;
  emergencyContactPerson?: string | null;
  emergencyContactNumber?: string | null;
  picturePath?: string | null;
  barangay?: { barangayName?: string; name?: string; municipality?: { name?: string } } | null;
}

export interface LoginCredentials {
  credential: string;
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
  login: (credentials: { credential: string; password: string }) => Promise<any>;
  logout: () => void;
}
