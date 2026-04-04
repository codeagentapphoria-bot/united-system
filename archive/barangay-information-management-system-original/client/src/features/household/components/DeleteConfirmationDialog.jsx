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
  onConfirm,
  loading = false,
  type = "household", // "resident" or "household"
  data = null, // resident or household object
}) => {
  const isResident = type === "resident";

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>{isResident ? "Delete Resident" : "Delete Household"}</span>
          </DialogTitle>
          <DialogDescription>
            {isResident
              ? "Are you sure you want to delete this resident? This action cannot be undone."
              : "Are you sure you want to delete this household? This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold">
              {isResident ? (
                <>
                  {data.first_name} {data.middle_name} {data.last_name}
                  {data.suffix && ` ${data.suffix}`}
                </>
              ) : (
                data.house_head
              )}
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              {isResident ? (
                <>
                  <p>Sex: {data.sex}</p>
                  <p>Birthdate: {data.birthdate}</p>
                  <p>
                    Address: {data.house_number} {data.street},{" "}
                    {data.purok_name}, {data.barangay_name}
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Address: {data.house_number} {data.street}
                  </p>
                  <p>Purok: {data.purok_name}</p>
                </>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> This will permanently remove the{" "}
              {isResident ? "resident" : "household"} from the system. All
              associated data will be lost.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>
                    {isResident ? "Delete Resident" : "Delete Household"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
