import { useState } from "react";
import { handleError } from "@/utils/errorHandler";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import api from "@/utils/api";

const DeleteConfirmationDialog = ({ open, onOpenChange, onSuccess, purok }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!purok?.purok_id) {
      toast({
        title: "Error",
        description: "Invalid purok data",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await api.delete(`/${purok.purok_id}/purok`);

      toast({
        title: "Success",
        description: "Purok deleted successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      handleError(error, "Delete Purok");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Purok</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the purok "{purok?.purok_name}"?
            This action cannot be undone and will remove all associated data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Purok"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
