// React imports
import React, { useEffect } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Types
import type { DisabilityType, UpdateDisabilityTypeInput } from '@/hooks/social-amelioration/useDisabilityTypes';

// Utils
import { cn } from '@/lib/utils';

const disabilityTypeSchema = z.object({
  name: z.string().min(1, 'Disability type name is required').min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type DisabilityTypeFormData = z.infer<typeof disabilityTypeSchema>;

interface EditDisabilityTypeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateDisabilityTypeInput) => void;
  disabilityType: DisabilityType | null;
  isLoading?: boolean;
}

export const EditDisabilityTypeModal: React.FC<EditDisabilityTypeModalProps> = ({
  open,
  onClose,
  onSubmit,
  disabilityType,
  isLoading = false,
}) => {
  const form = useForm<DisabilityTypeFormData>({
    resolver: zodResolver(disabilityTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (disabilityType) {
      form.reset({
        name: disabilityType.name,
        description: disabilityType.description || '',
        isActive: disabilityType.isActive,
      });
    }
  }, [disabilityType, form]);

  const handleFormSubmit = (data: DisabilityTypeFormData) => {
    if (disabilityType) {
      onSubmit(disabilityType.id, data);
      form.reset();
      onClose();
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn('max-w-2xl')}>
        <DialogHeader>
          <DialogTitle className={cn('text-xl font-semibold text-primary-600')}>
            Edit Disability Type
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disability Type Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter disability type name" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter description (optional)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
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
                type="submit"
                className="bg-primary-600 hover:bg-primary-700"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Disability Type'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

