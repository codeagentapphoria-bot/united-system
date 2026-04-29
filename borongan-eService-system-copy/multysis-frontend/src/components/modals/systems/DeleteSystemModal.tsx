import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useSystemManagement } from '@/hooks/systems/useSystemManagement';
import type { System } from '@/services/api/system.service';

interface DeleteSystemModalProps {
  open: boolean;
  onClose: () => void;
  system: System | null;
}

interface WarningResult {
  affectedPages: number;
  affectedRoles: number;
}

export function DeleteSystemModal({ open, onClose, system }: DeleteSystemModalProps) {
  const { deleteSystem, isDeleting } = useSystemManagement();
  const [warning, setWarning] = useState<WarningResult | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleDelete = async () => {
    if (!system) return;

    if (!isConfirming) {
      // First call — get warning if any
      try {
        const result = await deleteSystem(system.slug, false);
        if (result) {
          // Got warning response — show confirmation
          setWarning(result);
          return;
        }
        // No warning — was deleted successfully (204)
        onClose();
      } catch {
        // Error already handled in hook
      }
    } else {
      // Confirming — force delete
      try {
        await deleteSystem(system.slug, true);
        onClose();
      } catch {
        // Error already handled in hook
      }
    }
  };

  const handleClose = () => {
    setWarning(null);
    setIsConfirming(false);
    onClose();
  };

  if (!system) return null;

  const isReserved = system.slug === 'unassigned';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            Delete System
          </DialogTitle>
          <DialogDescription>
            {isReserved
              ? 'The "unassigned" system cannot be deleted.'
              : warning ? (
                  <>
                    System <strong>{system.label}</strong> is currently used by{' '}
                    {warning.affectedPages > 0 && `${warning.affectedPages} page(s)`}
                    {warning.affectedPages > 0 && warning.affectedRoles > 0 && ' and '}
                    {warning.affectedRoles > 0 && `${warning.affectedRoles} role(s)`}
                    . Click Confirm to set all affected pages and roles to
                    "Unassigned" and delete this system.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete system{' '}
                    <strong>{system.label}</strong>? This action cannot be undone.
                  </>
                )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isReserved}
          >
            {isDeleting
              ? 'Deleting...'
              : warning
                ? 'Confirm'
                : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
