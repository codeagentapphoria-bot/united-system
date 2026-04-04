import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, PawPrint } from "lucide-react";

const PetDeleteConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  pet = null,
}) => {
  if (!pet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Delete Pet</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this pet? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pet Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold flex items-center gap-2">
              <PawPrint className="h-4 w-4" />
              {pet.pet_name}
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Species: {pet.species}</p>
              <p>Breed: {pet.breed}</p>
              <p>Owner: {pet.owner_name}</p>
              {pet.address && <p>Address: {pet.address}</p>}
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> This will permanently remove the pet
              from the system. All associated data will be lost.
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
                  <span>Delete Pet</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PetDeleteConfirmationDialog;
