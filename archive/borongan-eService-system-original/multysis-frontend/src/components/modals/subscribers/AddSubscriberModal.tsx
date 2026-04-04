// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';

// Custom Components
import { AddSubscriberFields } from '@/components/subscribers/forms/AddSubscriberFields';

// Hooks
import { useAddSubscriber } from '@/hooks/subscribers/useAddSubscriber';

// Types and Schemas
import type { AddSubscriberInput } from '@/validations/subscriber.schema';

// Utils
import { cn } from '@/lib/utils';

interface AddSubscriberModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddSubscriberInput) => void;
}

export const AddSubscriberModal: React.FC<AddSubscriberModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const { form, reset } = useAddSubscriber();

  const handleFormSubmit = async (data: AddSubscriberInput) => {
    try {
      await onSubmit(data);
      reset();
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
      <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0")}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className={cn("text-2xl font-semibold text-primary-600")}>
            Add New Subscriber
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pb-6">
              <AddSubscriberFields />
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
            {form.formState.isSubmitting ? 'Adding...' : 'Add Subscriber'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

