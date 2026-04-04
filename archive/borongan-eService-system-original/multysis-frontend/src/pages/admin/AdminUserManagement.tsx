// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { FiDownload, FiPlus, FiSearch, FiUsers } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';

// Custom Components
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    AddUserModal,
    ChangePasswordModal,
    DeleteUserModal,
    EditUserModal,
} from '@/components/modals/users';
import { UserTabs } from '@/components/users/UserTabs';

// Hooks
import { useDebounce } from '@/hooks/useDebounce';
import { useUsers } from '@/hooks/users/useUsers';

// Types and Schemas
import type { CreateAdminUserInput, UpdateAdminUserInput } from '@/validations/user.schema';

// Utils
import { adminMenuItems } from '@/config/admin-menu';
import { cn } from '@/lib/utils';

export const AdminUserManagement: React.FC = () => {
  const {
    users,
    selectedUser,
    setSelectedUser,
    roles,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    currentPage,
    goToPage,
    goToNextPage: _goToNextPage,
    goToPreviousPage: _goToPreviousPage,
  } = useUsers();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Debounce search query
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Update the actual search query when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery]);

  // Reset page when filters change
  useEffect(() => {
    goToPage(1);
  }, [debouncedSearchQuery, statusFilter, roleFilter]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roleName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatusFilter =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);
    const matchesRoleFilter = roleFilter === 'all' || user.roleId === roleFilter;
    return matchesSearch && matchesStatusFilter && matchesRoleFilter;
  });

  // Apply pagination to filtered results
  const totalFilteredPages = Math.max(1, Math.ceil(filteredUsers.length / 10));
  const startIndex = (currentPage - 1) * 10;
  const endIndex = startIndex + 10;
  const paginatedFilteredUsers = filteredUsers.slice(startIndex, endIndex);

  // Pagination wrapper functions that respect filtered results
  const handleGoToPage = (page: number) => {
    const clampedPage = Math.max(1, Math.min(page, totalFilteredPages));
    goToPage(clampedPage);
  };

  const handleGoToNextPage = () => {
    if (currentPage < totalFilteredPages) {
      goToPage(currentPage + 1);
    }
  };

  const handleGoToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleDownload = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Phone Number', 'Role', 'Status', 'Last Login', 'Created Date'];
    const rows = filteredUsers.map((user) => [
      user.name,
      user.email,
      user.phoneNumber || 'N/A',
      user.roleName,
      user.isActive ? 'Active' : 'Inactive',
      user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never',
      new Date(user.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateUser = async (data: CreateAdminUserInput) => {
    try {
      await createUser(data);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleUpdateUser = async (id: string, data: UpdateAdminUserInput) => {
    try {
      await updateUser(id, data);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (selectedUser) {
      try {
        await deleteUser(selectedUser.id);
        setIsDeleteModalOpen(false);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleChangePassword = async (password: string) => {
    if (selectedUser) {
      try {
        await changePassword(selectedUser.id, password);
        setIsChangePasswordModalOpen(false);
      } catch (error) {
        console.error('Failed to change password:', error);
      }
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-red-100 text-red-700',
    };

    return (
      <Badge className={variants[isActive ? 'active' : 'inactive']}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">User Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage admin users and their access roles
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
              onClick={handleDownload}
            >
              <div className="mr-2">
                <FiDownload size={16} />
              </div>
              Download List
            </Button>
            <Button
              className="bg-primary-600 hover:bg-primary-700"
              onClick={() => setIsAddModalOpen(true)}
            >
              <div className="mr-2">
                <FiPlus size={16} />
              </div>
              Add New User
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Main Content: List + Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Users List */}
          <Card className="lg:col-span-1 overflow-visible">
            <CardHeader>
              <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
                <FiUsers size={20} />
                Users List
              </CardTitle>

              {/* Search */}
              <div className="relative mt-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiSearch size={18} />
                </div>
                <Input
                  placeholder="Search users..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 mt-3">
                {/* Status Filter */}
                <Button
                  size="sm"
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  className={
                    statusFilter === 'all'
                      ? 'bg-primary-600 hover:bg-primary-700'
                      : 'text-primary-600 hover:bg-primary-50'
                  }
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('active')}
                  className={
                    statusFilter === 'active'
                      ? 'bg-primary-600 hover:bg-primary-700'
                      : 'text-primary-600 hover:bg-primary-50'
                  }
                >
                  Active
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('inactive')}
                  className={
                    statusFilter === 'inactive'
                      ? 'bg-primary-600 hover:bg-primary-700'
                      : 'text-primary-600 hover:bg-primary-50'
                  }
                >
                  Inactive
                </Button>
              </div>

              {/* Role Filter */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  size="sm"
                  variant={roleFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setRoleFilter('all')}
                  className={
                    roleFilter === 'all'
                      ? 'bg-primary-600 hover:bg-primary-700'
                      : 'text-primary-600 hover:bg-primary-50'
                  }
                >
                  All Roles
                </Button>
                {roles
                  .filter((role) => role.isActive)
                  .slice(0, 3)
                  .map((role) => (
                    <Button
                      key={role.id}
                      size="sm"
                      variant={roleFilter === role.id ? 'default' : 'outline'}
                      onClick={() => setRoleFilter(role.id)}
                      className={
                        roleFilter === role.id
                          ? 'bg-primary-600 hover:bg-primary-700'
                          : 'text-primary-600 hover:bg-primary-50'
                      }
                    >
                      {role.name}
                    </Button>
                  ))}
              </div>

              {/* Total count */}
              <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
                <span>Total: {filteredUsers.length} users</span>
                <span>Page {currentPage} of {totalFilteredPages}</span>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col">
              <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                {paginatedFilteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No users found.
                  </div>
                ) : (
                  paginatedFilteredUsers.map((user) => (
                    <div key={user.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedUser?.id === user.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
                        onClick={() => setSelectedUser(user)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-heading-700">{user.name}</h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                {user.email}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {user.roleName}
                                </Badge>
                                {getStatusBadge(user.isActive)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pointing Arrow - Only on large screens */}
                      {selectedUser?.id === user.id && (
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalFilteredPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalFilteredPages}
                  onPageChange={handleGoToPage}
                  onPrevious={handleGoToPreviousPage}
                  onNext={handleGoToNextPage}
                  isLoading={isLoading}
                />
              )}
            </CardContent>
          </Card>

          {/* Right: Selected User Information */}
          <Card className="lg:col-span-2">
            <CardContent className="max-h-[700px] overflow-y-auto !p-6">
              <UserTabs
                selectedUser={selectedUser}
                onEdit={() => setIsEditModalOpen(true)}
                onDelete={() => setIsDeleteModalOpen(true)}
                onChangePassword={() => setIsChangePasswordModalOpen(true)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddUserModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateUser}
        roles={roles}
        isLoading={isLoading}
      />

      <EditUserModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateUser}
        user={selectedUser}
        roles={roles}
        isLoading={isLoading}
      />

      <DeleteUserModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        userName={selectedUser?.name || ''}
        isLoading={isLoading}
      />

      <ChangePasswordModal
        open={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSubmit={handleChangePassword}
        isLoading={isLoading}
      />
    </DashboardLayout>
  );
};
