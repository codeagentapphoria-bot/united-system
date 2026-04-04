// React imports
import React from 'react';

// Third-party libraries
import { FiAlertTriangle } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';


interface DeletePermissionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  permissionName: string;
  isLoading?: boolean;
}

export const DeletePermissionModal: React.FC<DeletePermissionModalProps> = ({
  open,
  onClose,
  onConfirm,
  permissionName,
  isLoading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-red-600 flex items-center gap-2">
            <FiAlertTriangle size={24} className="text-red-500" />
            Delete Permission
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Are you sure you want to delete this permission? This action cannot be undone.
            </p>
            <p className="text-sm text-red-700 mt-2">
              <strong>Permission:</strong> {permissionName}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Deleting this permission will remove it from all roles that currently have it assigned.
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
            className="bg-red-600 hover:bg-red-700"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Permission'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

