// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Custom Components
import { AddressFields } from '@/components/subscribers/forms/AddressFields';
import { MotherInfoFields } from '@/components/subscribers/forms/MotherInfoFields';
import { PersonalInfoFields } from '@/components/subscribers/forms/PersonalInfoFields';
import { PlaceOfBirthFields } from '@/components/subscribers/forms/PlaceOfBirthFields';
import { ProfilePictureUpload } from '@/components/subscribers/forms/ProfilePictureUpload';
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Hooks
import { useEditProfile } from '@/hooks/subscribers/useEditProfile';

// Types and Schemas
import type { EditProfileInput } from '@/validations/subscriber.schema';

// Utils
import { cn } from '@/lib/utils';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EditProfileInput) => void;
  initialData?: Partial<EditProfileInput>;
  isLinkedToCitizen?: boolean; // If true, disable personal info editing
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  isLinkedToCitizen = false,
}) => {
  const {
    form,
    reset,
    previewImage,
    handleImageChange,
  } = useEditProfile(initialData);

  const handleFormSubmit = async (data: EditProfileInput) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (error: any) {
      // Error handling is done in the parent component
      throw error; // Re-throw to prevent modal from closing on error
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0")}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className={cn("text-2xl font-semibold text-primary-600")}>
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8 pb-6">
              {isLinkedToCitizen ? (
                <>
                  {/* For citizens, only show email and phone number */}
                  <div className="mb-4 p-4 bg-info-50 border border-info-200 rounded-lg">
                    <p className="text-sm text-info-800">
                      <strong>Note:</strong> This subscriber is linked to a citizen record. Personal information (name, birthdate, address, place of birth, etc.) is managed through the citizen record and cannot be edited here.
                    </p>
                  </div>

                  {/* Contact Information - Only editable fields for citizens */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary-600 border-b pb-2">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <CustomFormLabel>Email</CustomFormLabel>
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

                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <CustomFormLabel required>Phone Number</CustomFormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="+639171234567"
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* For non-citizens, show all fields */}
                  {/* Personal Info Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary-600 border-b pb-2">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <ProfilePictureUpload 
                        previewImage={previewImage}
                        onImageChange={handleImageChange}
                        disabled={false}
                      />
                      
                      <PersonalInfoFields disabled={false} />
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary-600 border-b pb-2">
                      Address
                    </h3>
                    <AddressFields disabled={false} />
                  </div>

                  {/* Place of Birth Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary-600 border-b pb-2">
                      Place of Birth
                    </h3>
                    <PlaceOfBirthFields disabled={false} />
                  </div>

                  {/* Mother's Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary-600 border-b pb-2">
                      Document Owner's Mother's Information
                      <span className="text-sm text-gray-500 font-normal ml-2">(Optional)</span>
                    </h3>
                    <MotherInfoFields disabled={false} />
                  </div>
                </>
              )}
            </form>
          </Form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose} 
            disabled={form.formState.isSubmitting}
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={form.handleSubmit(handleFormSubmit)}
            className="bg-primary-600 hover:bg-primary-700"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

