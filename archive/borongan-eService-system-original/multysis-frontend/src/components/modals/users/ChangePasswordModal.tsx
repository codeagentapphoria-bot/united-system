// React imports
import React from 'react';

// Third-party libraries
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Types and Schemas
import { changePasswordSchema, type ChangePasswordInput } from '@/validations/user.schema';

// Utils
import { cn } from '@/lib/utils';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
  isLoading?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const handleSubmit = (data: ChangePasswordInput) => {
    onSubmit(data.password);
    form.reset();
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0")}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-semibold text-primary-600">
            Change Password
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
              <div className="bg-primary-50 border border-primary-200 rounded-md p-3">
                <p className="text-sm text-primary-700 font-medium mb-1">Password Requirements:</p>
                <ul className="text-xs text-primary-600 space-y-0.5 list-disc list-inside">
                  <li>At least 8 characters long</li>
                  <li>Contains at least one uppercase letter (A-Z)</li>
                  <li>Contains at least one lowercase letter (a-z)</li>
                  <li>Contains at least one number (0-9)</li>
                </ul>
              </div>

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <CustomFormLabel required>New Password</CustomFormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Enter new password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <CustomFormLabel required>Confirm Password</CustomFormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Confirm new password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isLoading}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {isLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

