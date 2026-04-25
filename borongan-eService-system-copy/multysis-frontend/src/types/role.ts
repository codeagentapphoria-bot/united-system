export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: string;
  updatedAt: string;
}

export interface RedirectPage {
  id: string;
  system: string;
  path: string;
  name: string;
}

// React Select for dropdowns

export interface Role {
  id: string;
  name: string;
  description: string;
  system: string;
  permissions: Permission[];
  redirectPage?: RedirectPage;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description: string;
  system: string;
  permissionIds: string[];
  redirectPageId?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
  redirectPageId?: string;
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
