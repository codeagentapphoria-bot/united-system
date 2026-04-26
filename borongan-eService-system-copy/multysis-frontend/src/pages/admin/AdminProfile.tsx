// React imports
import React, { useState } from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Layout and Access
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessControlGate } from '@/components/common/AccessControlGate';
import { ChangeOwnPasswordModal } from '@/components/modals/users/ChangeOwnPasswordModal';

// Context and Hooks
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/api/auth.service';

// Icons
import { FiUser, FiMail, FiShield, FiKey } from 'react-icons/fi';

// Utils
import { adminMenuItems } from '@/config/admin-menu';
import { cn } from '@/lib/utils';

export const AdminProfile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
    setIsChangingPassword(true);
    try {
      await authService.changeOwnPassword(oldPassword, newPassword);
      setPasswordModalOpen(false);
      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Change Password',
        description: error.message || 'Please check your current password and try again.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Get role display name from first role if available
  const roleDisplayName = user?.roles?.[0]?.role?.name || 'Admin';

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <AccessControlGate pagePath="/admin/profile">
        <div className={cn("space-y-6")}>
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-heading-800">My Profile</h1>
            <p className="text-sm text-gray-500 mt-1">
              View your account information and manage your password.
            </p>
          </div>

          {/* Profile Card */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FiUser size={18} className="text-primary-500" />
                Account Information
              </CardTitle>
              <CardDescription>
                Your admin account details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User ID */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b">
                <div className="sm:w-40">
                  <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    User ID
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-heading-700">
                    {user?.id || '—'}
                  </span>
                </div>
              </div>

              {/* Name */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b">
                <div className="sm:w-40">
                  <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Name
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <FiUser size={14} className="text-gray-400" />
                  <span className="font-medium text-heading-700">
                    {user?.name || '—'}
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b">
                <div className="sm:w-40">
                  <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Email
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <FiMail size={14} className="text-gray-400" />
                  <span className="text-heading-700">
                    {user?.email || '—'}
                  </span>
                </div>
              </div>

              {/* Role */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b">
                <div className="sm:w-40">
                  <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Role
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <FiShield size={14} className="text-gray-400" />
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    {roleDisplayName}
                  </span>
                </div>
              </div>

              {/* User Type */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3">
                <div className="sm:w-40">
                  <Label className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Account Type
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {user?.type === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FiKey size={18} className="text-primary-500" />
                Security
              </CardTitle>
              <CardDescription>
                Manage your account security settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-heading-700">Password</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Change your password to keep your account secure.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPasswordModalOpen(true)}
                  className="ml-4 flex-shrink-0"
                >
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Change Password Modal */}
        <ChangeOwnPasswordModal
          open={passwordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
          onSubmit={handleChangePassword}
          isLoading={isChangingPassword}
        />
      </AccessControlGate>
    </DashboardLayout>
  );
};
