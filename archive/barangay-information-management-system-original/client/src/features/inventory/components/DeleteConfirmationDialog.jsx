import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Package, Trash2 } from "lucide-react";

const DeleteConfirmationDialog = ({
  inventory,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}) => {
  if (!inventory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Delete Inventory Item</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this inventory item? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Package className="h-8 w-8 text-muted-foreground" />
                <div>
                  <h4 className="font-semibold">{inventory.item_name}</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Type: {inventory.item_type || "N/A"}</p>
                    <p>Quantity: {inventory.quantity} {inventory.unit}</p>
                    <p>ID: {inventory.inventory_id}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> This will permanently remove the inventory item from the system. 
              All associated data and files will be lost.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center space-x-2 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Item</span>
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
