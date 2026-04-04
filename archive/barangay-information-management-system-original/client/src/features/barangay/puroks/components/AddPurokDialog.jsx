import { useState } from "react";
import { Button } from "@/components/ui/button";
import { handleError } from "@/utils/errorHandler";
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

const AddPurokDialog = ({ open, onOpenChange, onSuccess, barangayId }) => {
  // Auto-refresh for purok operations
  const { handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'puroks',
    successMessage: 'Purok created successfully!',
    errorMessage: 'Failed to create purok',
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
        async (data) => api.post("/purok", data),
        formData
      );

      toast({
        title: "Success",
        description: "Purok added successfully",
      });

      // Reset form
      setFormData({
        barangayId: barangayId,
        purokName: "",
        purokLeader: "",
        description: "",
      });

      onSuccess(response.data.data);
      onOpenChange(false);
    } catch (error) {
      handleError(error, "Add Purok");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      barangayId: barangayId,
      purokName: "",
      purokLeader: "",
      description: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Purok</DialogTitle>
          <DialogDescription>
            Create a new purok subdivision for your barangay.
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
              {loading ? "Adding..." : "Add Purok"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPurokDialog;
