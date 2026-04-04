import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/role';
import React from 'react';
import { FiArrowRight, FiEdit, FiShield, FiTrash2, FiUsers } from 'react-icons/fi';

interface RoleTabsProps {
  selectedRole: Role | null;
  onEdit: () => void;
  onDelete: () => void;
}

export const RoleTabs: React.FC<RoleTabsProps> = ({
  selectedRole,
  onEdit,
  onDelete,
}) => {
  if (!selectedRole) {
    return (
      <div className={cn("text-center py-12 text-gray-500") }>
        Select a role to view details
      </div>
    );
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  const getPermissionCount = () => {
    return selectedRole.permissions.length;
  };

  const getResourceCount = () => {
    const resources = new Set(selectedRole.permissions.map(p => p.resource));
    return resources.size;
  };

  return (
    <div className="space-y-6">
      {/* Role Overview */}
      <Card>
        <CardHeader>
          <div className={cn("flex items-center justify-between") }>
            <CardTitle className="text-xl text-heading-700 flex items-center gap-2">
              <FiShield size={20} />
              Role Overview
            </CardTitle>
            {getStatusBadge(selectedRole.isActive)}
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-4") }>
          <div>
            <h3 className={cn("text-lg font-semibold text-heading-700") }>{selectedRole.name}</h3>
            <p className={cn("text-gray-600 mt-1") }>{selectedRole.description}</p>
            
            {/* Redirect Page Display */}
            {selectedRole.redirectPath && (
              <div className={cn("mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg") }>
                <div className={cn("flex items-center gap-2 text-sm text-blue-800") }>
                  <FiArrowRight size={16} />
                  <span className="font-medium">Login Redirect:</span>
                  <span className={cn("bg-blue-100 px-2 py-1 rounded text-xs font-medium") }>
                    {selectedRole.redirectPath}
                  </span>
                </div>
                <p className={cn("text-xs text-blue-600 mt-1") }>
                  Users with this role will be redirected to this page after login
                </p>
              </div>
            )}
          </div>
          
          <div className={cn("grid grid-cols-2 gap-4") }>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiUsers size={16} />
                <span>Total Permissions</span>
              </div>
              <p className={cn("text-2xl font-bold text-heading-700 mt-1") }>{getPermissionCount()}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiShield size={16} />
                <span>Resource Areas</span>
              </div>
              <p className={cn("text-2xl font-bold text-heading-700 mt-1") }>{getResourceCount()}</p>
            </div>
          </div>

          <div className={cn("flex gap-2") }>
            <Button 
              size="sm" 
              variant="outline"
              className={cn("text-primary-600 hover:text-primary-700 hover:bg-primary-50") }
              onClick={onEdit}
            >
              <FiEdit size={14} className="mr-1" />
              Edit Role
            </Button>
            <Button 
              size="sm" 
              className={cn("bg-red-600 hover:bg-red-700") }
              onClick={onDelete}
            >
              <FiTrash2 size={14} className="mr-1" />
              Delete Role
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-heading-700">Assigned Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedRole.permissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No permissions assigned to this role
            </div>
          ) : (
            <div className="space-y-3">
              {selectedRole.permissions.map((permission) => (
                <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <h4 className="font-medium text-heading-700">{permission.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {permission.resource}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {permission.action}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-heading-700">Role Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <p className="text-gray-600">{new Date(selectedRole.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <p className="text-gray-600">{new Date(selectedRole.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
