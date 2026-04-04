// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// Utils
import { cn } from '@/lib/utils';
import { FiCheckCircle, FiUser } from 'react-icons/fi';

interface ActivateCitizenModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  citizenName: string;
  isActivating?: boolean; // true for activate, false for deactivate
}

export const ActivateCitizenModal: React.FC<ActivateCitizenModalProps> = ({
  open,
  onClose,
  onConfirm,
  citizenName,
  isActivating = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-md")}>
        <DialogHeader>
          <DialogTitle className={cn("text-xl font-semibold flex items-center gap-2", isActivating ? "text-green-600" : "text-orange-600")}>
            <FiCheckCircle size={24} />
            {isActivating ? 'Activate Citizen' : 'Deactivate Citizen'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${isActivating ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className={isActivating ? "text-blue-600" : "text-orange-600"}>
              <FiUser size={20} />
            </div>
            <div>
              <p className={`font-medium ${isActivating ? 'text-blue-900' : 'text-orange-900'}`}>Citizen Information</p>
              <p className={`text-sm ${isActivating ? 'text-blue-700' : 'text-orange-700'}`}>{citizenName}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-700 mb-2">
              {isActivating 
                ? 'Are you sure you want to activate this citizen?'
                : 'Are you sure you want to deactivate this citizen?'}
            </p>
            <p className="text-sm text-gray-500">
              {isActivating
                ? 'This will change their residency status to active and grant them full access to citizen services.'
                : 'This will change their residency status to inactive and restrict their access to citizen services.'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              className='text-primary-600 hover:text-primary-700 hover:bg-primary-50'
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              className={isActivating ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
              onClick={handleConfirm}
            >
              {isActivating ? 'Activate Citizen' : 'Deactivate Citizen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

