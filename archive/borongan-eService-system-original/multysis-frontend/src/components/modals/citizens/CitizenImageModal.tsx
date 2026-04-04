import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import React from 'react';

interface CitizenImageModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  citizenName: string;
}

export const CitizenImageModal: React.FC<CitizenImageModalProps> = ({
  open,
  onClose,
  imageUrl,
  citizenName,
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto")}>
        <DialogHeader className={cn("border-b border-gray-200 pb-4")}>
          <DialogTitle className={cn("text-xl font-semibold text-gray-900")}>
            Proof of Identification - {citizenName}
          </DialogTitle>
        </DialogHeader>

        <div className={cn("py-4")}>
          <div className="flex justify-center">
            <img
              src={imageUrl}
              alt={`Proof of Identification for ${citizenName}`}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-4 py-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
