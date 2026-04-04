import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash, Syringe } from "lucide-react";

const VaccineDeleteConfirmationDialog = ({
  vaccine,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}) => {
  const handleConfirm = () => {
    onConfirm(vaccine.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Vaccine Record
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to delete this vaccine record? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {vaccine && (
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Syringe className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{vaccine.vaccine_name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {vaccine.vaccine_type || "No type specified"}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">
                    {new Date(vaccine.vaccination_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Days Ago:</span>
                  <p className="font-medium">
                    {Math.ceil((new Date() - new Date(vaccine.vaccination_date)) / (1000 * 60 * 60 * 24))}
                  </p>
                </div>
              </div>

              {vaccine.vaccine_description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="text-sm mt-1">{vaccine.vaccine_description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
            className="flex gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <Trash className="h-4 w-4" />
                Delete Vaccine
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VaccineDeleteConfirmationDialog;
