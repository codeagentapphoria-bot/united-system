// React imports
import React, { useEffect } from 'react';

// Third-party libraries
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Types and Schemas
import type { AdminUser } from '@/types/user';
import type { Role } from '@/types/role';
import { updateAdminUserSchema, type UpdateAdminUserInput } from '@/validations/user.schema';

// Utils
import { cn } from '@/lib/utils';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateAdminUserInput) => void;
  user: AdminUser | null;
  roles: Role[];
  isLoading?: boolean;
}

const reactSelectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: '40px',
    borderColor: '#d1d5db',
    '&:hover': {
      borderColor: '#9ca3af',
    },
  }),
  option: (base: any, state: any) => ({
    ...base,
    padding: '12px',
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
    color: state.isSelected ? 'white' : '#374151',
  }),
  menu: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
};

export const EditUserModal: React.FC<EditUserModalProps> = ({
  open,
  onClose,
  onSubmit,
  user,
  roles,
  isLoading = false,
}) => {
  const form = useForm<UpdateAdminUserInput>({
    resolver: zodResolver(updateAdminUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      roleId: '',
      isActive: true,
    },
  });

  const roleOptions = roles
    .filter((role) => role.isActive)
    .map((role) => ({
      value: role.id,
      label: role.name,
      description: role.description,
    }));

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        roleId: user.roleId && user.roleId.trim() !== '' ? user.roleId : '',
        isActive: user.isActive,
      });
    }
  }, [user, form]);

  const handleSubmit = (data: UpdateAdminUserInput) => {
    if (user) {
      onSubmit(user.id, data);
      form.reset();
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0")}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-semibold text-primary-600">
            Edit Admin User
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Full Name</CustomFormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter full name"
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Email</CustomFormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="email@example.com"
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <CustomFormLabel>Phone Number</CustomFormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="09171234567"
                        className="h-10"
                      />
                    </FormControl>
                    <FormDescription>
                      Philippine format: 09XXXXXXXXX or +639XXXXXXXXX
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <CustomFormLabel required>Role</CustomFormLabel>
                    <FormControl>
                      <Select
                        options={roleOptions}
                        placeholder="Select role"
                        styles={reactSelectStyles}
                        value={field.value ? roleOptions.find(opt => opt.value === field.value) : null}
                        onChange={(option) => field.onChange(option?.value || '')}
                        formatOptionLabel={(option) => (
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-gray-500 mt-1">{option.description}</span>
                            )}
                          </div>
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3">
                    <FormControl>
                      <input
                        id="isActive"
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </FormControl>
                    <Label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Active Status
                    </Label>
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
            disabled={isLoading || !user}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

