import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { handleError } from "@/utils/errorHandler";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PawPrint, User, Calendar, Palette } from "lucide-react";
import Select from "react-select";
import api from "@/utils/api";

// Predefined species options
const speciesOptions = [
  { value: "Dog", label: "Dog" },
  { value: "Cat", label: "Cat" },
  { value: "Bird", label: "Bird" },
  { value: "Fish", label: "Fish" },
  { value: "Rabbit", label: "Rabbit" },
  { value: "Hamster", label: "Hamster" },
  { value: "Guinea Pig", label: "Guinea Pig" },
  { value: "Ferret", label: "Ferret" },
  { value: "Reptile", label: "Reptile" },
  { value: "Other", label: "Other" },
];

const PetDetailsForm = ({ pet, onSubmit, onCancel, loading = false }) => {
  const [formData, setFormData] = useState({
    ownerId: "",
    petName: "",
    species: "",
    breed: "",
    sex: "",
    birthdate: "",
    color: "",
    description: "",
  });

  const [owners, setOwners] = useState([]);
  const [ownerSearchTerm, setOwnerSearchTerm] = useState("");
  const [ownerSearchLoading, setOwnerSearchLoading] = useState(false);
  const [ownerSearchTimeout, setOwnerSearchTimeout] = useState(null);
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [errors, setErrors] = useState({});

  // Load owners for React Select
  const fetchOwners = async () => {
    try {
      // Don't fetch all owners initially - wait for search
      setOwners([]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to fetch owners:", error);
}
    }
  };

  // Fetch owner by ID for display in edit mode
  const fetchOwnerById = async (ownerId) => {
    try {
      const response = await api.get(`/${ownerId}/resident`);
      const owner = response.data.data;
      if (owner) {
        const option = {
          value: owner.id,
          label: `${owner.first_name} ${owner.last_name}${
            owner.suffix ? ` ${owner.suffix}` : ""
          }`,
        };
        // Add to existing options instead of replacing them
        setOwnerOptions(prev => {
          const exists = prev.some(opt => opt.value === ownerId);
          return exists ? prev : [...prev, option];
        });
        setOwners(prev => {
          const exists = prev.some(o => o.id === ownerId);
          return exists ? prev : [...prev, owner];
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Failed to fetch owner:", error);
      }
    }
  };

  // Search owners with debouncing
  const searchOwners = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setOwners([]);
      return;
    }

    setOwnerSearchLoading(true);
    try {
      const response = await api.get("/list/residents", {
        params: {
          search: searchTerm.trim(),
          page: 1,
          perPage: 50, // Limit results for better performance
        },
      });
      const residents = response.data.data?.data || response.data.data || [];
      const options = residents.map((resident) => ({
        value: resident.id,
        label: `${resident.first_name} ${resident.last_name}${
          resident.suffix ? ` ${resident.suffix}` : ""
        }`,
      }));
      setOwners(residents);
      setOwnerOptions(options);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to search owners:", error);
}
      setOwners([]);
      setOwnerOptions([]);
    } finally {
      setOwnerSearchLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (ownerSearchTimeout) {
      clearTimeout(ownerSearchTimeout);
    }

    if (ownerSearchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchOwners(ownerSearchTerm);
      }, 300); // 300ms debounce
      setOwnerSearchTimeout(timeout);
    } else if (ownerSearchTerm.trim().length === 0) {
      setOwners([]);
      setOwnerOptions([]);
    }

    return () => {
      if (ownerSearchTimeout) {
        clearTimeout(ownerSearchTimeout);
      }
    };
  }, [ownerSearchTerm]);

  // Set initial data for edit mode
  useEffect(() => {
    if (pet) {
      setFormData({
        ownerId: pet.owner_id || "",
        petName: pet.pet_name || "",
        species: pet.species || "",
        breed: pet.breed || "",
        sex: pet.sex || "",
        birthdate: pet.birthdate
          ? new Date(pet.birthdate).toISOString().split("T")[0]
          : "",
        color: pet.color || "",
        description: pet.description || "",
      });

      // If we have an owner_id, fetch the owner data to display in the select
      if (pet.owner_id) {
        fetchOwnerById(pet.owner_id);
      }
    }
  }, [pet]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.ownerId) {
      newErrors.ownerId = "Owner is required";
    }
    if (!formData.petName.trim()) {
      newErrors.petName = "Pet name is required";
    }
    if (!formData.species.trim()) {
      newErrors.species = "Species is required";
    }
    if (!formData.breed.trim()) {
      newErrors.breed = "Breed is required";
    }
    if (!formData.sex) {
      newErrors.sex = "Sex is required";
    }
    if (!formData.birthdate) {
      newErrors.birthdate = "Birthdate is required";
    }
    if (!formData.color.trim()) {
      newErrors.color = "Color is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Create FormData for submission
      const submitData = new FormData();

      // Add form fields
      Object.keys(formData).forEach((key) => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add metadata to indicate this is a partial update for details only
      submitData.append(
        "_metadata",
        JSON.stringify({
          updateType: "partial",
          changedFields: [
            "ownerId",
            "petName",
            "species",
            "breed",
            "sex",
            "birthdate",
            "color",
            "description",
          ],
        })
      );

      onSubmit(submitData);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleOwnerChange = (selectedOption) => {
    handleInputChange("ownerId", selectedOption ? selectedOption.value : "");
    // Clear search term after selection
    setOwnerSearchTerm("");
  };

  // Get filtered owner options ensuring the current selection is always included
  const getFilteredOwnerOptions = useCallback((currentValue) => {
    // Start with current ownerOptions (search results)
    let options = [...ownerOptions];

    // Always include the current value if it exists, even if not in search results
    if (currentValue) {
      const alreadyIncluded = options.some(opt => opt.value === currentValue);
      if (!alreadyIncluded) {
        // First try to find in current owners (search results)
        let ownerData = owners.find(o => o.id === currentValue);
        
        // If not found in search results, try to get from pet data (for original owner)
        if (!ownerData && pet && pet.owner_id === currentValue) {
          // Create owner data from pet information if available
          ownerData = {
            id: pet.owner_id,
            first_name: pet.owner_name?.split(' ')[0] || 'Unknown',
            last_name: pet.owner_name?.split(' ').slice(-1)[0] || 'Unknown',
            suffix: '',
          };
        }

        // If still no data found, try to fetch the owner by ID
        if (!ownerData) {
          // Fetch owner data by ID to get the correct information
          fetchOwnerById(currentValue);
          // Don't create a placeholder - let the fetchOwnerById handle it
          return options;
        }

        if (ownerData) {
          const option = {
            value: ownerData.id,
            label: `${ownerData.first_name} ${ownerData.last_name}${
              ownerData.suffix ? ` ${ownerData.suffix}` : ""
            }`,
          };
          options.push(option);
        }
      }
    }

    return options;
  }, [ownerOptions, owners, pet]);

  const selectedOwner = getFilteredOwnerOptions(formData.ownerId).find(
    (option) => option.value === formData.ownerId
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="h-5 w-5" />
            Pet Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Owner Selection */}
          <div className="space-y-2">
            <Label htmlFor="owner">Pet Owner</Label>
            <Select
              value={selectedOwner}
              onChange={handleOwnerChange}
              options={getFilteredOwnerOptions(formData.ownerId)}
              onInputChange={(newValue, { action }) => {
                if (action === "input-change") {
                  setOwnerSearchTerm(newValue);
                }
              }}
              inputValue={ownerSearchTerm}
              placeholder={
                ownerSearchLoading
                  ? "Searching owners..."
                  : "Type to search for pet owner (min 2 characters)"
              }
              noOptionsMessage={() => 
                ownerSearchTerm.trim().length < 2 
                  ? "Type at least 2 characters to search" 
                  : "No owners found"
              }
              isClearable
              isSearchable
              isLoading={ownerSearchLoading}
              className="react-select-container"
              classNamePrefix="react-select"
            />
            {errors.ownerId && (
              <p className="text-sm text-red-500">{errors.ownerId}</p>
            )}
          </div>

          {/* Pet Name */}
          <div className="space-y-2">
            <Label htmlFor="petName">Pet Name</Label>
            <Input
              id="petName"
              value={formData.petName}
              onChange={(e) => handleInputChange("petName", e.target.value)}
              placeholder="Enter pet name"
            />
            {errors.petName && (
              <p className="text-sm text-red-500">{errors.petName}</p>
            )}
          </div>

          {/* Species and Breed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="species">Species</Label>
              <UISelect
                value={formData.species}
                onValueChange={(value) => handleInputChange("species", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  {speciesOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </UISelect>
              {errors.species && (
                <p className="text-sm text-red-500">{errors.species}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed">Breed</Label>
              <Input
                id="breed"
                value={formData.breed}
                onChange={(e) => handleInputChange("breed", e.target.value)}
                placeholder="e.g., Golden Retriever, Persian"
              />
              {errors.breed && (
                <p className="text-sm text-red-500">{errors.breed}</p>
              )}
            </div>
          </div>

          {/* Sex and Color */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sex">Sex</Label>
              <UISelect
                value={formData.sex}
                onValueChange={(value) => handleInputChange("sex", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </UISelect>
              {errors.sex && (
                <p className="text-sm text-red-500">{errors.sex}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                placeholder="e.g., Brown, White, Black"
              />
              {errors.color && (
                <p className="text-sm text-red-500">{errors.color}</p>
              )}
            </div>
          </div>

          {/* Birthdate */}
          <div className="space-y-2">
            <Label htmlFor="birthdate">Birthdate</Label>
            <Input
              id="birthdate"
              type="date"
              value={formData.birthdate}
              onChange={(e) => handleInputChange("birthdate", e.target.value)}
            />
            {errors.birthdate && (
              <p className="text-sm text-red-500">{errors.birthdate}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Additional information about the pet..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Updating...
            </div>
          ) : (
            "Update Pet"
          )}
        </Button>
      </div>
    </div>
  );
};

export default PetDetailsForm;
