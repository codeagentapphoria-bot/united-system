import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessControlGate } from '@/components/common/AccessControlGate';
import {
    AddRoleModal,
    DeleteRoleModal,
    EditRoleModal
} from '@/components/modals/roles';
import { RoleTabs } from '@/components/roles/RoleTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';

import { useDebounce } from '@/hooks/useDebounce';
import { useRoles } from '@/hooks/roles/useRoles';
import { cn } from '@/lib/utils';
import type { CreateRoleInput, UpdateRoleInput } from '@/validations/role.schema';
import React, { useEffect, useState } from 'react';
import { FiDownload, FiPlus, FiSearch, FiShield } from 'react-icons/fi';

export const AdminRoleManagement: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // Debounce search query
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  const {
    roles,
    permissions,
    selectedRole,
    setSelectedRole,
    isLoading,
    isFetching,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    createRole,
    updateRole,
    deleteRole,
    // Pagination
    currentPage,
    total,
    totalPages,
    goToPage,
    goToNextPage: _goToNextPage,
    goToPreviousPage: _goToPreviousPage,
  } = useRoles({ search: debouncedSearchQuery });

  // Reset to page 1 when search changes
  useEffect(() => {
    if (currentPage !== 1) {
      goToPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery]);

  // Guarded pagination handlers
  const handleGoToPage = (page: number) => {
    if (currentPage !== page) goToPage(page);
  };

  const handleGoToNextPage = () => {
    if (currentPage < totalPages) goToPage(currentPage + 1);
  };

  const handleGoToPreviousPage = () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  };

  const handleDownload = () => {
    // Create CSV content
    const headers = ['Role Name', 'Description', 'Permissions Count', 'Status', 'Created Date'];
    const rows = roles.map((role) => [
      role.name,
      role.description,
      role.permissions.length.toString(),
      role.isActive ? 'Active' : 'Inactive',
      new Date(role.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roles-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateRole = async (data: CreateRoleInput) => {
    try {
      await createRole(data);
    } catch (error) {
      console.error('Failed to create role:', error);
    }
  };

  const handleUpdateRole = async (id: string, data: UpdateRoleInput) => {
    try {
      await updateRole(id, data);
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleDeleteRole = async () => {
    if (selectedRole) {
      try {
        await deleteRole(selectedRole.id);
        setIsDeleteModalOpen(false);
      } catch (error) {
        console.error('Failed to delete role:', error);
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
    <DashboardLayout>
      <AccessControlGate pagePath="/admin/access-control/role-management">
        <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">Role Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage user roles and their permissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
              onClick={handleDownload}
            >
              <div className="mr-2"><FiDownload size={16} /></div>
              Download List
            </Button>
            <Button 
              className="bg-primary-600 hover:bg-primary-700"
              onClick={() => setIsAddModalOpen(true)}
            >
              <div className="mr-2"><FiPlus size={16} /></div>
              Add New Role
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
          {/* Left: Roles List */}
          <Card className="lg:col-span-1 overflow-visible">
            <CardHeader>
              <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
                <FiShield size={20} />
                Roles List
              </CardTitle>
              
              {/* Search */}
              <div className="relative mt-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiSearch size={18} />
                </div>
                <Input
                  placeholder="Search roles..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Total count */}
              <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
                <span>Total: {total} roles</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex flex-col">
              <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-[90px] bg-gray-100 rounded-lg animate-pulse" />
                  ))
                ) : roles.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No roles found.
                  </div>
                ) : (
                  roles.map((role) => (
                    <div key={role.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedRole?.id === role.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
                        onClick={() => setSelectedRole(role)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-heading-700">{role.name}</h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {role.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500">
                                  {role.permissions.length} permissions
                                </span>
                                {getStatusBadge(role.isActive)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pointing Arrow - Only on large screens */}
                      {selectedRole?.id === role.id && (
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handleGoToPage}
                  onPrevious={handleGoToPreviousPage}
                  onNext={handleGoToNextPage}
                  isLoading={isFetching}
                />
              )}
            </CardContent>
          </Card>

          {/* Right: Selected Role Information */}
          <Card className="lg:col-span-2">
            <CardContent className="max-h-[700px] overflow-y-auto !p-6">
              <RoleTabs 
                selectedRole={selectedRole}
                onEdit={() => setIsEditModalOpen(true)}
                onDelete={() => setIsDeleteModalOpen(true)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      </AccessControlGate>

      {/* Modals */}
      <AddRoleModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateRole}
        permissions={permissions}
        isLoading={isCreating}
      />

      <EditRoleModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateRole}
        role={selectedRole}
        permissions={permissions}
        isLoading={isUpdating}
      />

      <DeleteRoleModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteRole}
        roleName={selectedRole?.name || ''}
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
};
