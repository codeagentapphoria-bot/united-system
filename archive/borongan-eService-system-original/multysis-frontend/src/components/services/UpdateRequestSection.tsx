// React imports
import React, { useState } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Services
import { transactionService, type Transaction } from '@/services/api/transaction.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Utils
import { cn } from '@/lib/utils';
import { FiAlertCircle, FiCheck, FiEdit, FiX } from 'react-icons/fi';

interface UpdateRequestSectionProps {
  transaction: Transaction;
  onUpdate?: () => void;
}

const requestSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description must be less than 1000 characters'),
});

type RequestFormData = z.infer<typeof requestSchema>;

export const UpdateRequestSection: React.FC<UpdateRequestSectionProps> = ({
  transaction,
  onUpdate,
}) => {
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      description: '',
    },
  });

  const updateStatus = transaction.updateRequestStatus || 'NONE';
  const updateRequestedBy = transaction.updateRequestedBy;
  const adminRequestDescription = transaction.adminUpdateRequestDescription;
  const updateRequestDescription = transaction.updateRequestDescription;

  const handleRequestUpdate = async (data: RequestFormData) => {
    setIsRequesting(true);
    try {
      await transactionService.adminRequestUpdate(transaction.id, {
        description: data.description,
      });
      toast({
        title: 'Success',
        description: 'Update request sent to subscriber',
      });
      setShowRequestForm(false);
      reset();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to request update',
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleReviewRequest = async (approved: boolean) => {
    setIsReviewing(true);
    try {
      await transactionService.reviewUpdateRequest(transaction.id, {
        approved,
      });
      toast({
        title: 'Success',
        description: approved ? 'Update request approved' : 'Update request rejected',
      });
      if (onUpdate) onUpdate();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to review update request',
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = () => {
    switch (updateStatus) {
      case 'PENDING_PORTAL':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending Portal Update</Badge>;
      case 'PENDING_ADMIN':
        return <Badge className="bg-blue-100 text-blue-700">Admin Requested</Badge>;
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Update Request</h4>
        {getStatusBadge()}
      </div>

      {updateStatus === 'PENDING_PORTAL' && updateRequestDescription && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <FiAlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 mb-1">Portal Update Request</p>
              <p className="text-sm text-yellow-800 whitespace-pre-wrap mb-3">{updateRequestDescription}</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleReviewRequest(true)}
                  disabled={isReviewing}
                >
                  <FiCheck className="mr-2" size={14} />
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-50"
                  onClick={() => handleReviewRequest(false)}
                  disabled={isReviewing}
                >
                  <FiX className="mr-2" size={14} />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {updateStatus === 'PENDING_ADMIN' && updateRequestedBy === 'ADMIN' && adminRequestDescription && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <FiAlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-1">Update Request Sent</p>
              <p className="text-sm text-blue-800 whitespace-pre-wrap mb-2">{adminRequestDescription}</p>
              <p className="text-xs text-blue-700 italic">Waiting for subscriber to review and apply the update...</p>
            </div>
          </div>
        </div>
      )}

      {updateStatus === 'APPROVED' && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FiCheck className="text-green-600" size={18} />
              <p className="text-sm font-medium text-green-900">Update has been approved and applied</p>
            </div>
          </div>
          {!showRequestForm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRequestForm(true)}
              className="text-primary-600 border-primary-300 hover:bg-primary-50"
            >
              <FiEdit className="mr-2" size={14} />
              Request Another Update
            </Button>
          ) : (
            <form onSubmit={handleSubmit(handleRequestUpdate)} className="space-y-3 bg-white border border-gray-200 rounded-lg p-4">
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Update Request Description *
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Clearly describe what changes you need from the subscriber. For example: "Please change the appointment date to [specific date]" or "Please update the contact information to [new details]".
                </p>
                <Textarea
                  {...register('description')}
                  id="description"
                  placeholder="Example: Please change the appointment date to December 15, 2024 at 2:00 PM. The current date conflicts with another appointment."
                  className={cn('mt-1 min-h-[120px]', errors.description && 'border-red-500')}
                  disabled={isRequesting}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isRequesting}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  {isRequesting ? 'Sending...' : 'Send Update Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRequestForm(false);
                    reset();
                  }}
                  disabled={isRequesting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {updateStatus === 'REJECTED' && (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FiX className="text-red-600" size={18} />
              <p className="text-sm font-medium text-red-900">Update request was rejected</p>
            </div>
          </div>
          {!showRequestForm ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowRequestForm(true)}
              className="text-primary-600 border-primary-300 hover:bg-primary-50"
            >
              <FiEdit className="mr-2" size={14} />
              Request Another Update
            </Button>
          ) : (
            <form onSubmit={handleSubmit(handleRequestUpdate)} className="space-y-3 bg-white border border-gray-200 rounded-lg p-4">
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Update Request Description *
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Clearly describe what changes you need from the subscriber. For example: "Please change the appointment date to [specific date]" or "Please update the contact information to [new details]".
                </p>
                <Textarea
                  {...register('description')}
                  id="description"
                  placeholder="Example: Please change the appointment date to December 15, 2024 at 2:00 PM. The current date conflicts with another appointment."
                  className={cn('mt-1 min-h-[120px]', errors.description && 'border-red-500')}
                  disabled={isRequesting}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isRequesting}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  {isRequesting ? 'Sending...' : 'Send Update Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRequestForm(false);
                    reset();
                  }}
                  disabled={isRequesting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {updateStatus === 'NONE' && (
        <div className="space-y-3">
          {!showRequestForm ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                Request the subscriber to update their application. You can specify what changes are needed, such as updating dates, correcting information, or providing additional details.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRequestForm(true)}
                className="text-primary-600 border-primary-300 hover:bg-primary-50"
              >
                <FiEdit className="mr-2" size={14} />
                Request Update from Subscriber
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(handleRequestUpdate)} className="space-y-3 bg-white border border-gray-200 rounded-lg p-4">
              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Update Request Description *
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  Clearly describe what changes you need from the subscriber. For example: "Please change the appointment date to [specific date]" or "Please update the contact information to [new details]".
                </p>
                <Textarea
                  {...register('description')}
                  id="description"
                  placeholder="Example: Please change the appointment date to December 15, 2024 at 2:00 PM. The current date conflicts with another appointment."
                  className={cn('mt-1 min-h-[120px]', errors.description && 'border-red-500')}
                  disabled={isRequesting}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isRequesting}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  {isRequesting ? 'Sending...' : 'Send Update Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRequestForm(false);
                    reset();
                  }}
                  disabled={isRequesting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};


