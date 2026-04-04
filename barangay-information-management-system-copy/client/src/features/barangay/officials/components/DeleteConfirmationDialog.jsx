import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "lucide-react";

const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  official,
  onConfirm,
}) => {
  if (!official) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Delete Official</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this official? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Official Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold">
              {official.first_name} {official.last_name}
              {official.suffix && ` ${official.suffix}`}
            </h4>
            <p className="text-sm text-muted-foreground">
              Position: {official.position}
            </p>
            {official.committee && (
              <p className="text-sm text-muted-foreground">
                Committee: {official.committee}
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> This will permanently remove the
              official from the system. All associated data will be lost.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Official</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
