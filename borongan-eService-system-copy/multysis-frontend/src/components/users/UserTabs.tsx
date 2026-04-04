import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AdminUser } from '@/types/user';
import React from 'react';
import { FiEdit, FiKey, FiTrash2, FiUser } from 'react-icons/fi';

interface UserTabsProps {
  selectedUser: AdminUser | null;
  onEdit: () => void;
  onDelete: () => void;
  onChangePassword: () => void;
}

export const UserTabs: React.FC<UserTabsProps> = ({
  selectedUser,
  onEdit,
  onDelete,
  onChangePassword,
}) => {
  if (!selectedUser) {
    return (
      <div className={cn("text-center py-12 text-gray-500")}>
        Select a user to view details
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

  return (
    <div className="space-y-6">
      {/* User Overview */}
      <Card>
        <CardHeader>
          <div className={cn("flex items-center justify-between")}>
            <CardTitle className="text-xl text-heading-700 flex items-center gap-2">
              <FiUser size={20} />
              User Overview
            </CardTitle>
            {getStatusBadge(selectedUser.isActive)}
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-4")}>
          <div>
            <h3 className={cn("text-lg font-semibold text-heading-700")}>{selectedUser.name}</h3>
            <p className={cn("text-gray-600 mt-1")}>{selectedUser.email}</p>
            {selectedUser.phoneNumber && (
              <p className={cn("text-gray-600 mt-1")}>Phone: {selectedUser.phoneNumber}</p>
            )}
          </div>
          
          <div className={cn("grid grid-cols-2 gap-4")}>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiUser size={16} />
                <span>Role</span>
              </div>
              <Badge variant="outline" className="mt-1">
                {selectedUser.roleName}
              </Badge>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiUser size={16} />
                <span>Last Login</span>
              </div>
              <p className={cn("text-sm text-gray-600 mt-1")}>
                {selectedUser.lastLogin
                  ? new Date(selectedUser.lastLogin).toLocaleDateString()
                  : 'Never'}
              </p>
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
              Edit User
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className={cn("text-blue-600 hover:text-blue-700 hover:bg-blue-50")}
              onClick={onChangePassword}
            >
              <FiKey size={14} className="mr-1" />
              Change Password
            </Button>
            <Button 
              size="sm" 
              className={cn("bg-red-600 hover:bg-red-700")}
              onClick={onDelete}
            >
              <FiTrash2 size={14} className="mr-1" />
              Delete User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-heading-700">User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Created:</span>
              <p className="text-gray-600">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Last Updated:</span>
              <p className="text-gray-600">{new Date(selectedUser.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

