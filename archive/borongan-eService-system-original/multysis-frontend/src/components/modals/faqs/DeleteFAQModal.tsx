// React imports
import React from 'react';

// Third-party libraries
import { FiAlertTriangle } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Utils
import { cn } from '@/lib/utils';

interface DeleteFAQModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  faqQuestion: string;
  isLoading?: boolean;
}

export const DeleteFAQModal: React.FC<DeleteFAQModalProps> = ({
  open,
  onClose,
  onConfirm,
  faqQuestion,
  isLoading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn('max-w-md')}>
        <DialogHeader>
          <DialogTitle className={cn('text-xl font-semibold flex items-center gap-2 text-red-600')}>
            <FiAlertTriangle size={24} />
            Delete FAQ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 border-red-200">
            <div className="text-red-600">
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <p className="font-medium text-red-900">FAQ Question</p>
              <p className="text-sm text-red-700">{faqQuestion}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete this FAQ?
            </p>
            <p className="text-sm text-gray-500">
              This action cannot be undone. The FAQ will be permanently removed from the system.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete FAQ'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


