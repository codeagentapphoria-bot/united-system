import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Permission } from '@/types/role';
import React from 'react';
import { FiEdit, FiShield, FiTrash2 } from 'react-icons/fi';

interface PermissionTabsProps {
  selectedPermission: Permission | null;
  onEdit: () => void;
  onDelete: () => void;
}

export const PermissionTabs: React.FC<PermissionTabsProps> = ({
  selectedPermission,
  onEdit,
  onDelete,
}) => {
  if (!selectedPermission) {
    return (
      <div className={cn("text-center py-12 text-gray-500")}>
        Select a permission to view details
      </div>
    );
  }

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
    <div className="space-y-6">
      {/* Permission Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-heading-700 flex items-center gap-2">
            <FiShield size={20} />
            Permission Overview
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("space-y-4")}>
          <div>
            <h3 className={cn("text-lg font-semibold text-heading-700")}>{selectedPermission.name}</h3>
            <p className={cn("text-gray-600 mt-1")}>{selectedPermission.description}</p>
          </div>
          
          <div className={cn("grid grid-cols-2 gap-4")}>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiShield size={16} />
                <span>Resource</span>
              </div>
              <p className={cn("text-lg font-bold text-heading-700 mt-1")}>{selectedPermission.resource}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiShield size={16} />
                <span>Action</span>
              </div>
              <div className="mt-1">
                {getActionBadge(selectedPermission.action)}
              </div>
            </div>
          </div>

          <div className={cn("flex gap-2")}>
            <Button 
              size="sm" 
              variant="outline"
              className={cn("text-primary-600 hover:text-primary-700 hover:bg-primary-50")}
              onClick={onEdit}
            >
              <FiEdit size={14} className="mr-1" />
              Edit Permission
            </Button>
            <Button 
              size="sm" 
              className={cn("bg-red-600 hover:bg-red-700")}
              onClick={onDelete}
            >
              <FiTrash2 size={14} className="mr-1" />
              Delete Permission
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Permission Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-heading-700">Permission Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <p className="text-gray-600">{new Date(selectedPermission.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <p className="text-gray-600">{new Date(selectedPermission.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

