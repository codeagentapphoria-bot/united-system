// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { FiDownload, FiPlus, FiSearch, FiShield } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';

// Custom Components
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessControlGate } from '@/components/common/AccessControlGate';
import {
  AddPermissionModal,
  DeletePermissionModal,
  EditPermissionModal,
} from '@/components/modals/permissions';
import { PermissionTabs } from '@/components/permissions/PermissionTabs';

// Hooks
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/permissions/usePermissions';

// Types and Schemas
import type { CreatePermissionInput, UpdatePermissionInput } from '@/validations/permission.schema';

// Utils

import { cn } from '@/lib/utils';

export const AdminPermissionsManagement: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localResourceFilter, setLocalResourceFilter] = useState('all');

  // Debounce search query
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  const {
    permissions,
    selectedPermission,
    setSelectedPermission,
    isLoading,
    isFetching,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    createPermission,
    updatePermission,
    deletePermission,
    currentPage,
    total,
    totalPages,
    goToPage,
  } = usePermissions({ search: debouncedSearchQuery, resource: localResourceFilter });

  // Reset to page 1 when filters change
  useEffect(() => {
    goToPage(1);
  }, [debouncedSearchQuery, localResourceFilter]);

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

  // Get unique resources for filter
  const uniqueResources = Array.from(
    new Set(permissions.map((p) => p.resource))
  ).sort();

  const handleDownload = () => {
    const headers = ['Permission Name', 'Description', 'Resource', 'Action', 'Created Date'];
    const rows = permissions.map((permission) => [
      permission.name,
      permission.description,
      permission.resource,
      permission.action,
      new Date(permission.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permissions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreatePermission = async (data: CreatePermissionInput) => {
    try {
      await createPermission(data);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create permission:', error);
    }
  };

  const handleUpdatePermission = async (id: string, data: UpdatePermissionInput) => {
    try {
      await updatePermission(id, data);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  const handleDeletePermission = async () => {
    if (selectedPermission) {
      try {
        await deletePermission(selectedPermission.id);
        setIsDeleteModalOpen(false);
      } catch (error) {
        console.error('Failed to delete permission:', error);
      }
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, string> = {
      read: 'bg-blue-100 text-blue-700',
      all: 'bg-green-100 text-green-700',
    };

    const actionLabels: Record<string, string> = {
      read: 'View',
      all: 'Manage',
    };

    return (
      <Badge className={variants[action] || 'bg-gray-100 text-gray-700'}>
        {actionLabels[action] || action.charAt(0).toUpperCase() + action.slice(1)}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <AccessControlGate pagePath="/admin/access-control/permissions">
        <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">Permissions Management</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage system permissions and access controls
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
              Add New Permission
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
          {/* Left: Permissions List */}
          <Card className="lg:col-span-1 overflow-visible">
            <CardHeader>
              <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
                <FiShield size={20} />
                Permissions List
              </CardTitle>

              {/* Search */}
              <div className="relative mt-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiSearch size={18} />
                </div>
                <Input
                  placeholder="Search permissions..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Filter */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm"
                  variant={localResourceFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setLocalResourceFilter('all')}
                  className={
                    localResourceFilter === 'all'
                      ? 'bg-primary-600 hover:bg-primary-700'
                      : 'text-primary-600 hover:bg-primary-50'
                  }
                >
                  All
                </Button>
                {uniqueResources.slice(0, 5).map((resource) => (
                  <Button
                    key={resource}
                    size="sm"
                    variant={localResourceFilter === resource ? 'default' : 'outline'}
                    onClick={() => setLocalResourceFilter(resource)}
                    className={
                      localResourceFilter === resource
                        ? 'bg-primary-600 hover:bg-primary-700'
                        : 'text-primary-600 hover:bg-primary-50'
                    }
                  >
                    {resource}
                  </Button>
                ))}
              </div>

              {/* Total count */}
              <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
                <span>Total: {total} permissions</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col">
              <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-[90px] bg-gray-100 rounded-lg animate-pulse" />
                  ))
                ) : permissions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No permissions found.
                  </div>
                ) : (
                  permissions.map((permission) => (
                    <div key={permission.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedPermission?.id === permission.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
                        onClick={() => setSelectedPermission(permission)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-heading-700">{permission.name}</h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {permission.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {permission.resource}
                                </Badge>
                                {getActionBadge(permission.action)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Pointing Arrow - Only on large screens */}
                      {selectedPermission?.id === permission.id && (
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

          {/* Right: Selected Permission Information */}
          <Card className="lg:col-span-2">
            <CardContent className="max-h-[700px] overflow-y-auto !p-6">
              <PermissionTabs
                selectedPermission={selectedPermission}
                onEdit={() => setIsEditModalOpen(true)}
                onDelete={() => setIsDeleteModalOpen(true)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      </AccessControlGate>

      {/* Modals */}
      <AddPermissionModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreatePermission}
        isLoading={isCreating}
      />

      <EditPermissionModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdatePermission}
        permission={selectedPermission}
        isLoading={isUpdating}
      />

      <DeletePermissionModal
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeletePermission}
        permissionName={selectedPermission?.name || ''}
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
};
