import { useState, useEffect, useCallback } from "react";
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
import ReactSelect from "react-select";
import api from "@/utils/api";

// Official position options
const POSITION_OPTIONS = [
  {
    value: "Barangay Captain (Punong Barangay)",
    label: "Barangay Captain (Punong Barangay)",
  },
  {
    value: "Barangay Councilors (Kagawad)",
    label: "Barangay Councilors (Kagawad)",
  },
  {
    value: "Sangguniang Kabataan (SK) Chairperson",
    label: "Sangguniang Kabataan (SK) Chairperson",
  },
  {
    value: "Sangguniang Kabataan (SK) Councilors (Kagawad)",
    label: "Sangguniang Kabataan (SK) Councilors (Kagawad)",
  },
  { value: "Barangay Secretary", label: "Barangay Secretary" },
  { value: "Barangay Treasurer", label: "Barangay Treasurer" },
  { value: "Barangay Tanod", label: "Barangay Tanod" },
  { value: "Lupon Members", label: "Lupon Members" },
];

const AddOfficialDialog = ({
  open,
  onOpenChange,
  onSuccess,
  barangayId,
  existingOfficials = [],
}) => {
  // Auto-refresh for officials operations
  const { handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'officials',
    successMessage: 'Official created successfully!',
    errorMessage: 'Failed to create official',
    showToast: true,
    autoRefresh: true,
    refreshDelay: 100
  });

  const [formData, setFormData] = useState({
    barangayId: barangayId,
    residentId: "",
    position: "",
    committee: "",
    termStart: "",
    termEnd: "",
    responsibilities: "",
  });

  const [residents, setResidents] = useState([]);
  const [residentSearchTerm, setResidentSearchTerm] = useState("");
  const [residentSearchLoading, setResidentSearchLoading] = useState(false);
  const [residentSearchTimeout, setResidentSearchTimeout] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);

  // Filter position options based on existing officials
  // Only allow one Punong Barangay and one SK Chairperson
  const availablePositionOptions = POSITION_OPTIONS.filter((option) => {
    const existingPosition = existingOfficials.find(
      (official) => official.position === option.value
    );

    // For single-occupancy positions, check if they already exist
    const singleOccupancyPositions = [
      "Barangay Captain (Punong Barangay)",
      "Sangguniang Kabataan (SK) Chairperson",
      "Barangay Secretary",
      "Barangay Treasurer",
    ];

    if (singleOccupancyPositions.includes(option.value) && existingPosition) {
      return false; // Don't show if position is already occupied
    }

    return true; // Show all other positions (allow multiple)
  });

  // Fetch residents for selection
  const fetchResidents = async () => {
    try {
      // Don't fetch all residents initially - wait for search
      setResidents([]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to fetch residents:", error);
}
    }
  };

  // Search residents with debouncing
  const searchResidents = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResidents([]);
      return;
    }

    setResidentSearchLoading(true);
    try {
      const response = await api.get("/list/residents", {
        params: {
          search: searchTerm.trim(),
          page: 1,
          perPage: 50, // Limit results for better performance
        },
      });
      const residentsData = response.data.data?.data || response.data.data || [];
      setResidents(residentsData);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to search residents:", error);
}
      setResidents([]);
    } finally {
      setResidentSearchLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (residentSearchTimeout) {
      clearTimeout(residentSearchTimeout);
    }

    if (residentSearchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchResidents(residentSearchTerm);
      }, 300); // 300ms debounce
      setResidentSearchTimeout(timeout);
    } else if (residentSearchTerm.trim().length === 0) {
      setResidents([]);
    }

    return () => {
      if (residentSearchTimeout) {
        clearTimeout(residentSearchTimeout);
      }
    };
  }, [residentSearchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.residentId || !formData.position || !formData.termStart) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await handleCRUDOperation(
        async (data) => api.post("/official", data),
        formData
      );
      onSuccess();
      resetForm();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error adding official:", error);
}
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add official",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      barangayId: barangayId,
      residentId: "",
      position: "",
      committee: "",
      termStart: "",
      termEnd: "",
      responsibilities: "",
    });
    setSelectedResident(null);
    setResidentSearchTerm("");
  };

  // Get filtered resident options ensuring the current selection is always included
  const getFilteredResidentOptions = useCallback((currentValue) => {
    // Start with current residents (search results)
    let options = residents.map((resident) => ({
      value: resident.id,
      label: `${resident.first_name} ${resident.last_name}${
        resident.suffix ? ` ${resident.suffix}` : ""
      }`,
    }));

    // Always include the selected resident if it exists
    if (selectedResident && !options.some(opt => opt.value === selectedResident.id)) {
      options.push({
        value: selectedResident.id,
        label: `${selectedResident.first_name} ${selectedResident.last_name}${
          selectedResident.suffix ? ` ${selectedResident.suffix}` : ""
        }`,
      });
    }

    return options;
  }, [residents, selectedResident]);

  const handleResidentChange = (selectedOption) => {
    setFormData({
      ...formData,
      residentId: selectedOption?.value || "",
    });
    // Store the selected resident data
    if (selectedOption) {
      const residentData = residents.find(r => r.id === selectedOption.value);
      if (residentData) {
        setSelectedResident(residentData);
      }
    } else {
      setSelectedResident(null);
    }
    // Clear search term after selection
    setResidentSearchTerm("");
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Official</DialogTitle>
          <DialogDescription>
            Add a new barangay official. All fields marked with * are required.
            Note: Only one person per position for Punong Barangay, SK
            Chairperson, Secretary, and Treasurer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resident Selection */}
          <div className="space-y-2">
            <Label htmlFor="residentId">Resident *</Label>
            <ReactSelect
              value={getFilteredResidentOptions(formData.residentId).find(
                (option) => option.value === formData.residentId
              )}
              onChange={handleResidentChange}
              onInputChange={(newValue, { action }) => {
                if (action === "input-change") {
                  setResidentSearchTerm(newValue);
                }
              }}
              inputValue={residentSearchTerm}
              options={getFilteredResidentOptions(formData.residentId)}
              placeholder={
                residentSearchLoading
                  ? "Searching residents..."
                  : "Type to search for resident (min 2 characters)"
              }
              noOptionsMessage={() => 
                residentSearchTerm.trim().length < 2 
                  ? "Type at least 2 characters to search" 
                  : "No residents found"
              }
              isClearable
              isSearchable
              isLoading={residentSearchLoading}
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  backgroundColor: "transparent",
                  borderColor: state.isFocused ? "#d1d5db" : "#e5e7eb",
                  boxShadow: "none",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  paddingLeft: "0.5rem",
                  paddingRight: "0.5rem",
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 20,
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected
                    ? "#f3f4f6"
                    : state.isFocused
                    ? "#f9fafb"
                    : "transparent",
                  color: "#111827",
                  cursor: "pointer",
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: "#111827",
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: "#6b7280",
                }),
                indicatorSeparator: () => ({
                  display: "none",
                }),
              }}
            />
          </div>

          {/* Position and Committee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position *</Label>
              <ReactSelect
                value={
                  availablePositionOptions.find(
                    (opt) => opt.value === formData.position
                  ) || null
                }
                onChange={(selectedOption) =>
                  setFormData({
                    ...formData,
                    position: selectedOption?.value || "",
                  })
                }
                options={availablePositionOptions}
                placeholder="Select position..."
                isClearable
                isSearchable
                styles={{
                  control: (provided, state) => ({
                    ...provided,
                    backgroundColor: "transparent",
                    borderColor: state.isFocused ? "#d1d5db" : "#e5e7eb",
                    boxShadow: "none",
                    borderRadius: "0.5rem",
                    fontSize: "1rem",
                    paddingLeft: "0.5rem",
                    paddingRight: "0.5rem",
                  }),
                  menu: (provided) => ({
                    ...provided,
                    zIndex: 20,
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isSelected
                      ? "#f3f4f6"
                      : state.isFocused
                      ? "#f9fafb"
                      : "transparent",
                    color: "#111827",
                    cursor: "pointer",
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: "#111827",
                  }),
                  placeholder: (provided) => ({
                    ...provided,
                    color: "#6b7280",
                  }),
                  indicatorSeparator: () => ({
                    display: "none",
                  }),
                }}
              />
              {availablePositionOptions.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  All available positions have been filled. You can only have
                  one person per position for Punong Barangay, SK Chairperson,
                  Secretary, and Treasurer.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="committee">Committee</Label>
              <Input
                id="committee"
                value={formData.committee}
                onChange={(e) =>
                  setFormData({ ...formData, committee: e.target.value })
                }
                placeholder="e.g., Peace and Order"
              />
            </div>
          </div>

          {/* Term Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termStart">Term Start *</Label>
              <Input
                id="termStart"
                type="date"
                value={formData.termStart}
                onChange={(e) =>
                  setFormData({ ...formData, termStart: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="termEnd">Term End</Label>
              <Input
                id="termEnd"
                type="date"
                value={formData.termEnd}
                onChange={(e) =>
                  setFormData({ ...formData, termEnd: e.target.value })
                }
              />
            </div>
          </div>

          {/* Responsibilities */}
          <div className="space-y-2">
            <Label htmlFor="responsibilities">Responsibilities</Label>
            <Textarea
              id="responsibilities"
              value={formData.responsibilities}
              onChange={(e) =>
                setFormData({ ...formData, responsibilities: e.target.value })
              }
              placeholder="Describe the official's responsibilities..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Official"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddOfficialDialog;
