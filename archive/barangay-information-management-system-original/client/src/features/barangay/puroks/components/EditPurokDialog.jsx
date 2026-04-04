import { useState, useEffect } from "react";
import { handleError } from "@/utils/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";
import api from "@/utils/api";

const EditPurokDialog = ({
  open,
  onOpenChange,
  onSuccess,
  purok,
  barangayId,
}) => {
  // Auto-refresh for purok operations
  const { handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'puroks',
    successMessage: 'Purok updated successfully!',
    errorMessage: 'Failed to update purok',
    showToast: true,
    autoRefresh: true,
    refreshDelay: 100
  });

  const [formData, setFormData] = useState({
    barangayId: barangayId,
    purokName: "",
    purokLeader: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);

  // Update form data when purok prop changes
  useEffect(() => {
    if (purok) {
      setFormData({
        barangayId: barangayId,
        purokName: purok.purok_name || "",
        purokLeader: purok.purok_leader || "",
        description: purok.description || "",
      });
    }
  }, [purok, barangayId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.purokName.trim()) {
      toast({
        title: "Validation Error",
        description: "Purok name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await handleCRUDOperation(
        async (data) => api.put(`/${purok.purok_id}/purok`, data),
        formData
      );

      toast({
        title: "Success",
        description: "Purok updated successfully",
      });

      onSuccess(response.data.data);
      onOpenChange(false);
    } catch (error) {
      handleError(error, "Update Purok");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (purok) {
      setFormData({
        barangayId: barangayId,
        purokName: purok.purok_name || "",
        purokLeader: purok.purok_leader || "",
        description: purok.description || "",
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Purok</DialogTitle>
          <DialogDescription>
            Update purok information for {purok?.purok_name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="purokName" className="text-sm font-medium">
              Purok Name *
            </Label>
            <Input
              id="purokName"
              name="purokName"
              value={formData.purokName}
              onChange={handleInputChange}
              placeholder="Enter purok name"
              required
            />
          </div>

          <div>
            <Label htmlFor="purokLeader" className="text-sm font-medium">
              Purok Leader
            </Label>
            <Input
              id="purokLeader"
              name="purokLeader"
              value={formData.purokLeader}
              onChange={handleInputChange}
              placeholder="Enter purok leader name"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter purok description"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Purok"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPurokDialog;
