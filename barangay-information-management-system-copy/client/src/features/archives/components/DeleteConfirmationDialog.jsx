import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText } from "lucide-react";

const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  archive = null,
}) => {
  if (!archive) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Delete Archive</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this archive document? This action cannot be
            undone and will permanently remove the document and its associated file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Archive Info */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-sm">{archive.title}</h4>
                <p className="text-xs text-muted-foreground">
                  Type: {archive.document_type || "N/A"}
                </p>
                {archive.author && (
                  <p className="text-xs text-muted-foreground">
                    Author: {archive.author}
                  </p>
                )}
                {archive.file_path && (
                  <p className="text-xs text-muted-foreground">
                    File: {archive.file_path.split('/').pop()}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-destructive mb-1">Warning:</p>
            <ul className="space-y-1 text-xs">
              <li>• The document will be permanently deleted</li>
              <li>• The associated file will be removed from the server</li>
              <li>• This action cannot be undone</li>
            </ul>
          </div>
        </div>

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
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : null}
            Delete Archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmationDialog;
