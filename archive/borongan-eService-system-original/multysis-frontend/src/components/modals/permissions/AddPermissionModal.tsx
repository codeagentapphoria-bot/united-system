// React imports
import React from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Select from 'react-select';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Types and Schemas
import { createPermissionSchema, type CreatePermissionInput } from '@/validations/permission.schema';

// Utils
import { cn } from '@/lib/utils';
import { getAdminResources } from '@/utils/admin-resources';

interface AddPermissionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePermissionInput) => void;
  isLoading?: boolean;
}

const actionOptions = [
  { value: 'read', label: 'View', description: 'Can only view this resource' },
  { value: 'all', label: 'Manage', description: 'Can view, create, edit, and delete' },
];

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

export const AddPermissionModal: React.FC<AddPermissionModalProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const resourceOptions = getAdminResources();

  const form = useForm<CreatePermissionInput>({
    resolver: zodResolver(createPermissionSchema),
    defaultValues: {
      name: '',
      description: '',
      resource: '',
      action: 'read',
    },
  });

  const handleSubmit = (data: CreatePermissionInput) => {
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
            Add New Permission
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <CustomFormLabel required>Permission Name</CustomFormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., View Dashboard"
                        className="h-10"
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
                      <Input
                        {...field}
                        placeholder="Describe what this permission allows"
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resource"
                render={({ field }) => (
                  <FormItem>
                    <CustomFormLabel required>Resource</CustomFormLabel>
                    <FormControl>
                      <Select
                        options={resourceOptions}
                        placeholder="Select a resource/page"
                        styles={reactSelectStyles}
                        value={resourceOptions.find(opt => opt.value === field.value)}
                        onChange={(option) => field.onChange(option?.value || '')}
                        formatOptionLabel={(option) => (
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            {option.description && (
                              <span className="text-xs text-gray-500 mt-1">{option.description}</span>
                            )}
                          </div>
                        )}
                        isSearchable={true}
                      />
                    </FormControl>
                    <FormDescription>
                      Select an admin page/resource from the list
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <CustomFormLabel required>Action</CustomFormLabel>
                    <FormControl>
                      <Select
                        options={actionOptions}
                        placeholder="Select action"
                        styles={reactSelectStyles}
                        value={actionOptions.find(opt => opt.value === field.value)}
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
            {isLoading ? 'Adding...' : 'Add Permission'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

