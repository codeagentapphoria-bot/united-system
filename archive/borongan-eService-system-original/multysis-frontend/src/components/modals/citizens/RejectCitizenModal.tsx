import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { FiXCircle } from 'react-icons/fi';

interface RejectCitizenModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  citizenName: string;
  isLoading?: boolean;
}

export const RejectCitizenModal: React.FC<RejectCitizenModalProps> = ({
  open,
  onClose,
  onConfirm,
  citizenName,
  isLoading = false,
}) => {
  const [remarks, setRemarks] = useState('');

  const handleConfirm = () => {
    onConfirm(remarks);
    setRemarks('');
  };

  const handleClose = () => {
    setRemarks('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-md")}>
        <DialogHeader>
          <DialogTitle className={cn("text-xl font-semibold text-red-600 flex items-center gap-2")}>
            <FiXCircle size={24} className="text-red-500" />
            Reject Citizen
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Are you sure you want to reject <span className="font-bold text-red-700">{citizenName}</span>?
            This action will deny their citizen application.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks (Optional)</Label>
            <textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter reason for rejection..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            className='text-primary-600 hover:text-primary-700 hover:bg-primary-50'
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700"
            type="button" 
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Rejecting...' : 'Reject'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
