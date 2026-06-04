import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type OptionStringMode = 'add' | 'edit' | 'delete';

interface OptionStringModalProps {
  open: boolean;
  mode: OptionStringMode;
  fieldLabel: string;
  initialValue?: string;
  existingValues: string[];
  onClose: () => void;
  onConfirm: (value: string) => Promise<void> | void;
}

export const OptionStringModal: React.FC<OptionStringModalProps> = ({
  open,
  mode,
  fieldLabel,
  initialValue = '',
  existingValues,
  onClose,
  onConfirm,
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
    }
  }, [open, initialValue]);

  const isDelete = mode === 'delete';
  const title = mode === 'add' ? `Add ${fieldLabel}`
              : mode === 'edit' ? `Edit ${fieldLabel}`
              : `Delete ${fieldLabel}`;

  const handleConfirm = async () => {
    const trimmed = value.trim();
    if (!isDelete) {
      if (trimmed.length === 0) { setError('Value is required'); return; }
      if (trimmed !== initialValue && existingValues.includes(trimmed)) {
        setError('That value already exists');
        return;
      }
    }
    setSubmitting(true);
    try {
      await onConfirm(isDelete ? initialValue : trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {isDelete ? (
          <p>Are you sure you want to delete <strong>{initialValue}</strong>? This cannot be undone.</p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="option-value">{fieldLabel}</Label>
            <Input
              id="option-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            variant={isDelete ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : isDelete ? 'Delete' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
