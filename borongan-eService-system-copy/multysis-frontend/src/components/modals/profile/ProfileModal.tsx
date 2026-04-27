// React imports
import React, { useState } from 'react';

// UI Components (shadcn/ui)
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Custom Components
import { ChangeOwnPasswordModal } from '@/components/modals/users/ChangeOwnPasswordModal';

// Context and Hooks
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/api/auth.service';

// Icons
import { FiUser, FiMail, FiShield, FiKey } from 'react-icons/fi';

// Context
import { useProfileModal } from '@/context/ProfileModalContext';

export const ProfileModal: React.FC = () => {
  const { isOpen, close } = useProfileModal();
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

  // Get role display name
  const roleDisplayName = user?.role || 'Admin';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>My Profile</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Page Header */}
            <div>
              <h2 className="text-lg font-semibold text-heading-800">Account Information</h2>
              <p className="text-sm text-gray-500 mt-1">
                View your account information and manage your password.
              </p>
            </div>

            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FiUser size={16} className="text-primary-500" />
                  Account Details
                </CardTitle>
                <CardDescription>
                  Your admin account details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            {/* Security Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FiKey size={16} className="text-primary-500" />
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
        </SheetContent>
      </Sheet>

      {/* Change Password Modal */}
      <ChangeOwnPasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSubmit={handleChangePassword}
        isLoading={isChangingPassword}
      />
    </>
  );
};
