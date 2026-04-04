import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Syringe, Info } from "lucide-react";

// Common vaccine types for pets
const vaccineTypes = [
  "Rabies",
  "DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)",
  "Bordetella (Kennel Cough)",
  "Lyme Disease",
  "Leptospirosis",
  "FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)",
  "FeLV (Feline Leukemia)",
  "FIV (Feline Immunodeficiency Virus)",
  "Other",
];

const VaccineForm = ({
  mode = "create",
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  targetType = "pet",
  targetId = "",
}) => {
  const [formData, setFormData] = useState({
    vaccine_name: "",
    vaccine_type: "",
    vaccine_description: "",
    vaccination_date: "",
  });

  const [errors, setErrors] = useState({});

  // Set initial data when editing
  useEffect(() => {
    if (initialData && mode === "edit") {
      setFormData({
        vaccine_name: initialData.vaccine_name || "",
        vaccine_type: initialData.vaccine_type || "",
        vaccine_description: initialData.vaccine_description || "",
        vaccination_date: initialData.vaccination_date 
          ? new Date(initialData.vaccination_date).toISOString().split('T')[0]
          : "",
      });
    }
  }, [initialData, mode]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.vaccine_name.trim()) {
      newErrors.vaccine_name = "Vaccine name is required";
    }

    if (!formData.vaccination_date) {
      newErrors.vaccination_date = "Vaccination date is required";
    }

    // Check if vaccination date is not in the future
    if (formData.vaccination_date && new Date(formData.vaccination_date) > new Date()) {
      newErrors.vaccination_date = "Vaccination date cannot be in the future";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      target_type: targetType,
      target_id: targetId,
    };

    onSubmit(submitData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-primary" />
            {mode === "create" ? "Add Vaccine Record" : "Edit Vaccine Record"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vaccine Name */}
          <div className="space-y-2">
            <Label htmlFor="vaccine_name" className="flex items-center gap-2">
              <Syringe className="h-4 w-4 text-primary" />
              Vaccine Name *
            </Label>
            <Input
              id="vaccine_name"
              value={formData.vaccine_name}
              onChange={(e) => handleInputChange("vaccine_name", e.target.value)}
              placeholder="Enter vaccine name"
              className={errors.vaccine_name ? "border-red-500" : ""}
            />
            {errors.vaccine_name && (
              <p className="text-sm text-red-500">{errors.vaccine_name}</p>
            )}
          </div>

          {/* Vaccine Type */}
          <div className="space-y-2">
            <Label htmlFor="vaccine_type" className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Vaccine Type
            </Label>
            <Select
              value={formData.vaccine_type}
              onValueChange={(value) => handleInputChange("vaccine_type", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vaccine type" />
              </SelectTrigger>
              <SelectContent>
                {vaccineTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vaccination Date */}
          <div className="space-y-2">
            <Label htmlFor="vaccination_date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Vaccination Date *
            </Label>
            <Input
              id="vaccination_date"
              type="date"
              value={formData.vaccination_date}
              onChange={(e) => handleInputChange("vaccination_date", e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={errors.vaccination_date ? "border-red-500" : ""}
            />
            {errors.vaccination_date && (
              <p className="text-sm text-red-500">{errors.vaccination_date}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="vaccine_description" className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Description
            </Label>
            <Textarea
              id="vaccine_description"
              value={formData.vaccine_description}
              onChange={(e) => handleInputChange("vaccine_description", e.target.value)}
              placeholder="Enter additional notes or description"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : mode === "create" ? "Add Vaccine" : "Update Vaccine"}
        </Button>
      </div>
    </form>
  );
};

export default VaccineForm;
