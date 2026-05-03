import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { libreSakayBeneficiaryService } from '@/services/api/libre-sakay-beneficiary.service';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FiAlertTriangle } from 'react-icons/fi';

interface RemoveBeneficiaryDialogProps {
  open: boolean;
  onClose: () => void;
  beneficiaryId: string | null;
  beneficiaryName: string | null;
  onSuccess: () => void;
}

export function RemoveBeneficiaryDialog({
  open,
  onClose,
  beneficiaryId,
  beneficiaryName,
  onSuccess,
}: RemoveBeneficiaryDialogProps) {
  const { toast } = useToast();
  const [confirmName, setConfirmName] = useState('');

  const mutation = useMutation({
    mutationFn: () => libreSakayBeneficiaryService.remove(beneficiaryId!),
    onSuccess: () => {
      toast({ title: 'Beneficiary removed successfully' });
      setConfirmName('');
      onSuccess();
      onClose();
    },
    onError: (e: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    },
  });

  const handleClose = () => {
    setConfirmName('');
    onClose();
  };

  const isConfirmed = confirmName === beneficiaryName;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <FiAlertTriangle className="h-5 w-5" />
            Remove Beneficiary
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <p>
              This will permanently remove the Libre Sakay beneficiary record for{' '}
              <strong>{beneficiaryName}</strong>. The underlying application will
              not be deleted, but the beneficiary will lose access to the program.
            </p>
            <p className="font-medium text-amber-600">
              This action cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Type <span className="font-bold">{beneficiaryName}</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={e => setConfirmName(e.target.value)}
            placeholder={beneficiaryName ?? ''}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={!isConfirmed || mutation.isPending}
          >
            {mutation.isPending ? 'Removing...' : 'Remove Beneficiary'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
