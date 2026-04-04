// React imports
import React from 'react';

// Third-party libraries
import { FiCheckCircle, FiSettings } from 'react-icons/fi';

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

interface ActivateGovernmentProgramModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  programName: string;
  isActivating?: boolean; // true for activate, false for deactivate
  isLoading?: boolean;
}

export const ActivateGovernmentProgramModal: React.FC<ActivateGovernmentProgramModalProps> = ({
  open,
  onClose,
  onConfirm,
  programName,
  isActivating = false,
  isLoading = false,
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
            {isActivating ? 'Activate Government Program' : 'Deactivate Government Program'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-lg border ${isActivating ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className={isActivating ? "text-blue-600" : "text-orange-600"}>
              <FiSettings size={20} />
            </div>
            <div>
              <p className={`font-medium ${isActivating ? 'text-blue-900' : 'text-orange-900'}`}>Program Information</p>
              <p className={`text-sm ${isActivating ? 'text-blue-700' : 'text-orange-700'}`}>{programName}</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-gray-700 mb-2">
              {isActivating 
                ? 'Are you sure you want to activate this government program?'
                : 'Are you sure you want to deactivate this government program?'}
            </p>
            <p className="text-sm text-gray-500">
              {isActivating
                ? 'This will make the program available for selection when adding beneficiaries.'
                : 'This will hide the program from selection when adding beneficiaries. Existing records will not be affected.'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              className='text-primary-600 hover:text-primary-700 hover:bg-primary-50'
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              className={isActivating ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading 
                ? (isActivating ? 'Activating...' : 'Deactivating...')
                : (isActivating ? 'Activate Program' : 'Deactivate Program')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

