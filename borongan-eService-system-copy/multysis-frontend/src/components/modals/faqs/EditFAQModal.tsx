// React imports
import React, { useEffect } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

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
import type { FAQ, UpdateFAQInput } from '@/services/api/faq.service';

// Utils
import { cn } from '@/lib/utils';
import { faqSchema, type FAQInput } from '@/validations/faq.schema';

interface EditFAQModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateFAQInput) => void;
  faq: FAQ | null;
  isLoading?: boolean;
}

export const EditFAQModal: React.FC<EditFAQModalProps> = ({
  open,
  onClose,
  onSubmit,
  faq,
  isLoading = false,
}) => {
  const form = useForm<FAQInput>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: '',
      answer: '',
      order: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (faq) {
      form.reset({
        question: faq.question,
        answer: faq.answer,
        order: faq.order,
        isActive: faq.isActive,
      });
    }
  }, [faq, form]);

  const handleFormSubmit = (data: FAQInput) => {
    if (faq) {
      onSubmit(faq.id, data);
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
            Edit FAQ
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter question" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Answer <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter answer"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter order (0 for default)"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      value={field.value || 0}
                      min={0}
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
                {isLoading ? 'Updating...' : 'Update FAQ'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


