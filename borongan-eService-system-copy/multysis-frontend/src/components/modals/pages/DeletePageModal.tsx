import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface DeletePageModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pageName: string;
  isLoading?: boolean;
}

export function DeletePageModal({
  open,
  onClose,
  onConfirm,
  pageName,
  isLoading,
}: DeletePageModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Page</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{pageName}</strong>? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}