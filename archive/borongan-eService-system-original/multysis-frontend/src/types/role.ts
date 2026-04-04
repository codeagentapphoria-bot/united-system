export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: string;
  updatedAt: string;
}

// React Select for dropdowns

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  redirectPath?: string; // Optional redirect path after login
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description: string;
  permissionIds: string[];
  redirectPath?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
  redirectPath?: string;
  isActive?: boolean;
}

export interface RoleManagementContextType {
  roles: Role[];
  permissions: Permission[];
  selectedRole: Role | null;
  setSelectedRole: (role: Role | null) => void;
  isLoading: boolean;
  error: string | null;
  createRole: (data: CreateRoleInput) => Promise<void>;
  updateRole: (id: string, data: UpdateRoleInput) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}
