// React imports
import React from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Hooks
import { useTransactionMessages } from '@/hooks/useTransactionMessages';

// Utils
import { cn } from '@/lib/utils';
import { FiLock, FiSend } from 'react-icons/fi';

interface MessageComposerProps {
  transactionId: string;
  onMessageSent?: () => void;
  disabled?: boolean;
}

const messageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters'),
  isInternal: z.boolean().optional(),
});

type MessageFormData = z.infer<typeof messageSchema>;

export const MessageComposer: React.FC<MessageComposerProps> = ({
  transactionId,
  onMessageSent,
  disabled = false,
}) => {
  const { createMessage } = useTransactionMessages({
    transactionId,
    autoRefresh: false, // Don't auto-refresh in composer
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: '',
      isInternal: false,
    },
  });

  const isInternal = watch('isInternal');

  const onSubmit = async (data: MessageFormData) => {
    try {
      await createMessage({
        message: data.message,
        isInternal: data.isInternal || false,
      });
      reset();
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <Textarea
          {...register('message')}
          placeholder="Type your message here..."
          className={cn(
            'min-h-[100px] resize-none',
            errors.message && 'border-red-500 focus-visible:ring-red-500'
          )}
          disabled={disabled || isSubmitting}
        />
        {errors.message && (
          <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isInternal"
            {...register('isInternal')}
            className="rounded border-gray-300"
            disabled={disabled || isSubmitting}
          />
          <Label
            htmlFor="isInternal"
            className={cn(
              'text-sm cursor-pointer flex items-center gap-2',
              isInternal && 'text-orange-600 font-medium'
            )}
          >
            <FiLock size={14} />
            Internal Note (Admin Only)
          </Label>
        </div>
        <Button
          type="submit"
          disabled={disabled || isSubmitting}
          className="bg-primary-600 hover:bg-primary-700 text-white"
        >
          {isSubmitting ? (
            'Sending...'
          ) : (
            <>
              <FiSend className="mr-2" size={16} />
              Send Message
            </>
          )}
        </Button>
      </div>
      {isInternal && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-xs text-orange-800">
            This message will only be visible to administrators and will not be shown to the subscriber.
          </p>
        </div>
      )}
    </form>
  );
};

