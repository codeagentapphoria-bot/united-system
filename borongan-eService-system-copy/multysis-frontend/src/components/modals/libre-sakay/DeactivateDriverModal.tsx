import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DeactivateDriverModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  driverName: string;
  isDeactivating: boolean; // true = deactivating, false = reactivating
  isLoading?: boolean;
}

export const DeactivateDriverModal: React.FC<DeactivateDriverModalProps> = ({
  open,
  onClose,
  onConfirm,
  driverName,
  isDeactivating,
  isLoading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-amber-600 flex items-center gap-2">
            <FiAlertTriangle size={24} className="text-amber-500" />
            {isDeactivating ? 'Deactivate Driver' : 'Reactivate Driver'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              {isDeactivating
                ? 'Are you sure you want to deactivate this driver? They will no longer be able to access the driver app.'
                : 'Are you sure you want to reactivate this driver? They will regain access to the driver app.'}
            </p>
            <p className="text-sm text-amber-700 mt-2">
              <strong>Driver:</strong> {driverName}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This action can be reversed at any time by toggling the driver&apos;s status again.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={isDeactivating ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading
              ? 'Processing...'
              : isDeactivating
              ? 'Deactivate Driver'
              : 'Reactivate Driver'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
