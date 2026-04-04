import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Permission } from '@/types/role';
import React from 'react';
import { FiPlus, FiX } from 'react-icons/fi';

interface PermissionManagerProps {
  permissions: Permission[];
  selectedPermissionIds: string[];
  onPermissionToggle: (permissionId: string) => void;
  onAddPermission?: () => void;
  onRemovePermission?: (permissionId: string) => void;
  showActions?: boolean;
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({
  permissions,
  selectedPermissionIds,
  onPermissionToggle,
  onAddPermission,
  onRemovePermission,
  showActions = false,
}) => {
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const resource = permission.resource;
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className={cn("space-y-4") }>
      {Object.entries(groupedPermissions).map(([resource, resourcePermissions]) => (
        <Card key={resource}>
          <CardHeader>
            <CardTitle className={cn("text-lg capitalize") }>
              {resource.replace('-', ' ')} Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-3") }>
              {resourcePermissions.map((permission) => {
                const isSelected = selectedPermissionIds.includes(permission.id);
                
                return (
                  <div
                    key={permission.id}
                    className={cn(
                      'flex items-start space-x-3 p-3 border rounded-lg transition-colors',
                      isSelected ? 'border-primary-300 bg-primary-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      id={`permission-${permission.id}`}
                      checked={isSelected}
                      onChange={() => onPermissionToggle(permission.id)}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <div className={cn("flex-1") }>
                      <label
                        htmlFor={`permission-${permission.id}`}
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        {permission.name}
                      </label>
                      <p className={cn("text-xs text-gray-500 mt-1") }>
                        {permission.description}
                      </p>
                      <div className={cn("flex items-center gap-2 mt-2") }>
                        <Badge variant="secondary" className="text-xs">
                          {permission.resource}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {permission.action}
                        </Badge>
                      </div>
                    </div>
                    {showActions && onRemovePermission && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemovePermission(permission.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <FiX size={16} />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            
            {showActions && onAddPermission && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAddPermission}
                  className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                >
                  <FiPlus size={16} className="mr-2" />
                  Add Permission
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};



