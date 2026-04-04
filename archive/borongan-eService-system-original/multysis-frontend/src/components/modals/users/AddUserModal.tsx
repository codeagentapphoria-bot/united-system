// React imports
import React from 'react';

// Third-party libraries
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
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
import type { Role } from '@/types/role';
import { createAdminUserSchema, type CreateAdminUserInput } from '@/validations/user.schema';

// Utils
import { cn } from '@/lib/utils';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAdminUserInput) => void;
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

export const AddUserModal: React.FC<AddUserModalProps> = ({
  open,
  onClose,
  onSubmit,
  roles,
  isLoading = false,
}) => {
  const form = useForm<CreateAdminUserInput>({
    resolver: zodResolver(createAdminUserSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      roleId: '',
    },
  });

  const roleOptions = roles
    .filter((role) => role.isActive)
    .map((role) => ({
      value: role.id,
      label: role.name,
      description: role.description,
    }));

  const handleSubmit = (data: CreateAdminUserInput) => {
    onSubmit(data);
    form.reset();
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
            Add New Admin User
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
                        value={roleOptions.find(opt => opt.value === field.value)}
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

              <div className="bg-primary-50 border border-primary-200 rounded-md p-3">
                <p className="text-sm text-primary-700 font-medium mb-1">Password Requirements:</p>
                <ul className="text-xs text-primary-600 space-y-0.5 list-disc list-inside">
                  <li>At least 8 characters long</li>
                  <li>Contains at least one uppercase letter (A-Z)</li>
                  <li>Contains at least one lowercase letter (a-z)</li>
                  <li>Contains at least one number (0-9)</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Password</CustomFormLabel>
                      <FormControl>
                        <PasswordInput
                          {...field}
                          placeholder="Create password"
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
                          placeholder="Confirm password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
            {isLoading ? 'Adding...' : 'Add User'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

