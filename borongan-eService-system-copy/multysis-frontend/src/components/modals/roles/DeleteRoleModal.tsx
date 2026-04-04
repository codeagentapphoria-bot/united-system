import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

interface DeleteRoleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  roleName: string;
  isLoading?: boolean;
}

export const DeleteRoleModal: React.FC<DeleteRoleModalProps> = ({
  open,
  onClose,
  onConfirm,
  roleName,
  isLoading = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={cn("text-xl font-semibold text-red-600 flex items-center gap-2")}>
            <FiAlertTriangle size={24} />
            Delete Role
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              Are you sure you want to delete the role <strong>"{roleName}"</strong>?
            </p>
            <p className="text-sm text-red-700 mt-2">
              This action cannot be undone. Users assigned to this role will lose their permissions.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Make sure no users are currently assigned to this role before deleting.
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
            {isLoading ? 'Deleting...' : 'Delete Role'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};



