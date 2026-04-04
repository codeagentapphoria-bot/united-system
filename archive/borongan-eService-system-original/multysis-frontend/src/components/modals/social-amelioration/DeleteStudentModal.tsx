// React imports
import React from 'react';

// Third-party libraries
import { FiAlertTriangle } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Utils
import { cn } from '@/lib/utils';

interface DeleteStudentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  beneficiaryName: string;
  isLoading?: boolean;
}

export const DeleteStudentModal: React.FC<DeleteStudentModalProps> = ({
  open,
  onClose,
  onConfirm,
  beneficiaryName,
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
            Remove Student Beneficiary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-lg border bg-red-50 border-red-200">
            <div className="text-red-600">
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <p className="font-medium text-red-900">Beneficiary Information</p>
              <p className="text-sm text-red-700">{beneficiaryName}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-700 mb-2">
              Are you sure you want to remove this student beneficiary?
            </p>
            <p className="text-sm text-gray-500">
              This action cannot be undone. The beneficiary record will be permanently removed from the system.
            </p>
            <p className="text-sm text-red-600 font-medium mt-2">
              Note: The citizen record will remain in the system, only the beneficiary registration will be removed.
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
              {isLoading ? 'Removing...' : 'Remove Beneficiary'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

