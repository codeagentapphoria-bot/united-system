// React imports
import React, { useEffect } from 'react';

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Types
import type { Address, UpdateAddressInput } from '@/services/api/address.service';

// Constants
import { regionOptions } from '@/constants/regions';

// Utils
import { createReactSelectStyles } from '@/components/social-amelioration/shared';
import { cn } from '@/lib/utils';
import { addressSchema, type AddressInput } from '@/validations/address.schema';

interface EditAddressModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateAddressInput) => void;
  address: Address | null;
  isLoading?: boolean;
}

export const EditAddressModal: React.FC<EditAddressModalProps> = ({
  open,
  onClose,
  onSubmit,
  address,
  isLoading = false,
}) => {
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      region: '',
      province: '',
      municipality: '',
      barangay: '',
      postalCode: '',
      streetAddress: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (address) {
      form.reset({
        region: address.region,
        province: address.province,
        municipality: address.municipality,
        barangay: address.barangay,
        postalCode: address.postalCode,
        streetAddress: address.streetAddress || '',
        isActive: address.isActive,
      });
    }
  }, [address, form]);

  const handleFormSubmit = (data: AddressInput) => {
    if (address) {
      onSubmit(address.id, data);
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
            Edit Address
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region <span className="text-red-500">required</span></FormLabel>
                  <FormControl>
                    <Select
                      value={regionOptions.find(option => option.value === field.value)}
                      onChange={(selectedOption) => field.onChange(selectedOption?.value || '')}
                      options={regionOptions}
                      placeholder="Select region"
                      className="mt-1"
                      classNamePrefix="react-select"
                      isSearchable={true}
                      styles={createReactSelectStyles(!!form.formState.errors.region)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Province <span className="text-red-500">required</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter province" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="municipality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Municipality <span className="text-red-500">required</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter municipality" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="barangay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barangay <span className="text-red-500">required</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter barangay" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code <span className="text-red-500">required</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Enter postal code (4 digits)" {...field} maxLength={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="streetAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter street address (optional)" {...field} />
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
                {isLoading ? 'Updating...' : 'Update Address'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

