export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
  roleId: string;
}

export interface UpdateAdminUserInput {
  name?: string;
  email?: string;
  phoneNumber?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface ChangePasswordInput {
  password: string;
  confirmPassword: string;
}

