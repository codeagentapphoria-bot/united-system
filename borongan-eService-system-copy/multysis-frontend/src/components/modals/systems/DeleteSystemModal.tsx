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

interface ImpactInfo {
  affectedPages: number;
  affectedRoles: number;
}

export function DeleteSystemModal({ open, onClose, system }: DeleteSystemModalProps) {
  const { deleteSystem, isDeleting } = useSystemManagement();
  const [impact, setImpact] = useState<ImpactInfo | null>(null);
  const [step, setStep] = useState<'initial' | 'confirm'>('initial');

  const handleClose = () => {
    setImpact(null);
    setStep('initial');
    onClose();
  };

  const handleDelete = async () => {
    if (!system) return;

    if (step === 'initial') {
      // Attempt force delete directly — backend returns 409 with impact counts if
      // there are dependents (pages/roles using this system)
      try {
        await deleteSystem(system.slug, true);
        handleClose();
      } catch (error: any) {
        // 409 with impact info means dependents exist — show confirmation step
        if (error.response?.status === 409 && error.response?.data?.status === 'warning') {
          setImpact(error.response.data.data);
          setStep('confirm');
        }
        // Other errors (e.g. not found) — handled by hook toast, stay on initial
      }
    } else {
      // Confirmed — retry force delete after user acknowledged impact
      try {
        await deleteSystem(system.slug, true);
        handleClose();
      } catch {
        // Error handled by hook toast
      }
    }
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
            {isReserved ? (
              'The "unassigned" system cannot be deleted.'
            ) : step === 'confirm' && impact ? (
              <>
                System <strong>{system.label}</strong> is used by{' '}
                {impact.affectedPages > 0 && `${impact.affectedPages} page(s)`}
                {impact.affectedPages > 0 && impact.affectedRoles > 0 && ' and '}
                {impact.affectedRoles > 0 && `${impact.affectedRoles} role(s)`}. All
                affected pages and roles will be set to <strong>Unassigned</strong>{' '}
                before this system is deleted. This cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete system <strong>{system.label}</strong>?
                {impact == null &&
                  ' Any pages and roles using this system will be set to Unassigned.'}{' '}
                This cannot be undone.
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
            {isDeleting ? 'Deleting...' : step === 'confirm' ? 'Delete Anyway' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
