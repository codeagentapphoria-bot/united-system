// React imports
import React from 'react';

// Third-party libraries
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Hooks
import { usePages } from '@/hooks/usePages';

// Types and Schemas
import type { Permission, Role } from '@/types/role';
import { updateRoleSchema, type UpdateRoleInput } from '@/validations/role.schema';

// Utils
import { cn } from '@/lib/utils';

interface EditRoleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateRoleInput) => void;
  role: Role | null;
  permissions: Permission[];
  isLoading?: boolean;
}

export const EditRoleModal: React.FC<EditRoleModalProps> = ({
  open,
  onClose,
  onSubmit,
  role,
  permissions,
  isLoading = false,
}) => {
  const { redirectOptions, isLoading: pagesLoading } = usePages();
  
  const form = useForm<UpdateRoleInput>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissionIds: [],
      redirectPath: '',
      isActive: true,
    },
  });

  const selectedPermissionIds = form.watch('permissionIds') || [];

  // Reset form when role changes
  React.useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description,
        permissionIds: role.permissions.map(p => p.id),
        redirectPath: role.redirectPath || '',
        isActive: role.isActive,
      });
    }
  }, [role, form]);

  const handleFormSubmit = (data: UpdateRoleInput) => {
    if (role) {
      onSubmit(role.id, data);
      onClose();
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const togglePermission = (permissionId: string) => {
    const currentIds = selectedPermissionIds;
    const newIds = currentIds.includes(permissionId)
      ? currentIds.filter(id => id !== permissionId)
      : [...currentIds, permissionId];
    form.setValue('permissionIds', newIds);
  };

  const toggleAllPermissions = () => {
    const allIds = permissions.map(p => p.id);
    const isAllSelected = allIds.every(id => selectedPermissionIds.includes(id));
    form.setValue('permissionIds', isAllSelected ? [] : allIds);
  };

  const isAllSelected = permissions.length > 0 && permissions.every(p => selectedPermissionIds.includes(p.id));

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0") }>
        <DialogHeader className={cn("px-6 pt-6 pb-4") }>
          <DialogTitle className={cn("text-2xl font-semibold text-primary-600") }>
            Edit Role: {role.name}
          </DialogTitle>
        </DialogHeader>

        <div className={cn("flex-1 overflow-y-auto px-6")}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pb-6">
              {/* Role Basic Information */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Role Name</CustomFormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter role name"
                          className="mt-1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Description</CustomFormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          placeholder="Enter role description"
                          rows={3}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="redirectPath"
                  render={({ field }) => (
                    <FormItem>
                      <CustomFormLabel required>Login Redirect Page</CustomFormLabel>
                      <FormControl>
                        <Select
                          value={redirectOptions.find(option => option.value === field.value)}
                          onChange={(selectedOption) => field.onChange(selectedOption?.value || '')}
                          options={redirectOptions}
                          placeholder={pagesLoading ? "Loading pages..." : "Select redirect page"}
                          className="mt-1"
                          classNamePrefix="react-select"
                          isLoading={pagesLoading}
                          isDisabled={pagesLoading}
                          formatOptionLabel={(option) => (
                            <div className="flex flex-col">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{option.label}</span>
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
                                  {option.category}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 mt-1">{option.description}</span>
                            </div>
                          )}
                          styles={{
                            control: (base) => ({
                              ...base,
                              minHeight: '40px',
                              borderColor: form.formState.errors.redirectPath ? '#ef4444' : '#d1d5db',
                              '&:hover': {
                                borderColor: form.formState.errors.redirectPath ? '#ef4444' : '#9ca3af',
                              },
                            }),
                            option: (base, state) => ({
                              ...base,
                              padding: '12px',
                              backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                              color: state.isSelected ? 'white' : '#374151',
                              '&:hover': {
                                backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                              },
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                          isSearchable={true}
                          noOptionsMessage={() => "No pages found"}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription>
                        Choose the page where users with this role will be redirected after login
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">
                        Active Role
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Permissions Selection */}
              <FormField
                control={form.control}
                name="permissionIds"
                render={() => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-4">
                      <CustomFormLabel required>Permissions</CustomFormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleAllPermissions}
                        className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      >
                        {isAllSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Available Permissions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                          {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                              <Checkbox
                                id={`permission-${permission.id}`}
                                checked={selectedPermissionIds.includes(permission.id)}
                                onCheckedChange={() => togglePermission(permission.id)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <label
                                  htmlFor={`permission-${permission.id}`}
                                  className="text-sm font-medium text-gray-900 cursor-pointer"
                                >
                                  {permission.name}
                                </label>
                                <p className="text-xs text-gray-500 mt-1">
                                  {permission.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    {permission.resource}
                                  </span>
                                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                    {permission.action}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </CardContent>
                    </Card>
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
            onClick={form.handleSubmit(handleFormSubmit)}
            className="bg-primary-600 hover:bg-primary-700"
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update Role'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
