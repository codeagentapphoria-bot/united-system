import { useState, useEffect, useRef, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  PawPrint,
  User,
  Calendar,
  Palette,
  Image,
  Upload,
  X,
  Camera,
} from "lucide-react";
import Select from "react-select";
import api from "@/utils/api";

const steps = [
  { label: "Basic Info", icon: <PawPrint className="h-5 w-5" /> },
  { label: "Photo", icon: <Image className="h-5 w-5" /> },
];

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

const PetForm = ({
  mode = "create",
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  startStep = 0,
}) => {
  const [step, setStep] = useState(startStep);
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

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
    if (initialData && mode === "edit") {
      setFormData({
        ownerId: initialData.owner_id || "",
        petName: initialData.pet_name || "",
        species: initialData.species || "",
        breed: initialData.breed || "",
        sex: initialData.sex || "",
        birthdate: initialData.birthdate
          ? new Date(initialData.birthdate).toISOString().split("T")[0]
          : "",
        color: initialData.color || "",
        description: initialData.description || "",
      });

      // Set image preview if exists
      if (initialData.picture_path) {
        setImagePreview(initialData.picture_path);
      }

      // If we have an owner_id, fetch the owner data to display in the select
      if (initialData.owner_id) {
        fetchOwnerById(initialData.owner_id);
      }
    }
  }, [initialData, mode]);

  const validateCurrentStep = () => {
    const newErrors = {};

    if (step === 0) {
      // Validate Basic Info step only if we're not editing just the image
      if (mode === "edit" && startStep === 1) {
        // When editing only image, skip basic info validation
        return true;
      }

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
    }
    // Photo step is optional, no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }
  };

  const handleBack = () => {
    setStep((s) => s - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateCurrentStep()) {
      // Create FormData for file upload
      const submitData = new FormData();

      // Add form fields
      Object.keys(formData).forEach((key) => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Add image if selected
      if (selectedImage) {
        submitData.append("picturePath", selectedImage);
      }

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

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error("Error playing video:", err);
          });
        }
      }, 100);
      
    } catch (error) {
      handleError(error, "Access Camera");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "pet-photo.jpg", { type: "image/jpeg" });
          setSelectedImage(file);
          
          // Create object URL with error handling
          try {
            const objectUrl = URL.createObjectURL(blob);
            setImagePreview(objectUrl);
          } catch (error) {
            console.error("Error creating object URL:", error);
            // Fallback to data URL
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(blob);
          }
        }
        
        setShowCamera(false);
        if (stream) {
          stream.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
          setStream(null);
        }
      }, "image/jpeg", 0.8);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        
        // If not found in search results, try to get from initial data
        if (!ownerData && initialData && initialData.owner_id === currentValue) {
          // Create owner data from initial data if available
          ownerData = {
            id: initialData.owner_id,
            first_name: initialData.owner_name?.split(' ')[0] || 'Unknown',
            last_name: initialData.owner_name?.split(' ').slice(-1)[0] || 'Unknown',
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
  }, [ownerOptions, owners, initialData]);

  const selectedOwner = getFilteredOwnerOptions(formData.ownerId).find(
    (option) => option.value === formData.ownerId
  );

  // Check if current step is valid
  const isStepValid = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        // When editing only image, skip basic info validation
        if (mode === "edit" && startStep === 1) {
          return true;
        }
        return (
          formData.ownerId &&
          formData.petName.trim() &&
          formData.species.trim() &&
          formData.breed.trim() &&
          formData.sex &&
          formData.birthdate &&
          formData.color.trim()
        );
      case 1:
        return true; // Photo is optional
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Linear Progress Bar and Step Labels */}
      <div className="mb-4">
        <Progress value={((step + 1) / steps.length) * 100} />
        <div className="flex justify-between text-xs mt-1">
          {steps.map((s, idx) => {
            const isCurrentStep = step === idx;
            const isCompleted = step > idx;

            return (
              <span
                key={s.label}
                className={`flex items-center gap-1 ${
                  isCurrentStep
                    ? "font-bold text-blue-600"
                    : isCompleted
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
                {isCompleted && <span className="text-green-500">✓</span>}
                {isCurrentStep && !isStepValid(idx) && (
                  <span className="text-red-500 text-xs">*</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Form Steps */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5" />
              Basic Information
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
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Additional information about the pet..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Pet Photo (optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Image Preview */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-center block">
                Current Image
              </Label>
              <div className="flex justify-center">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Pet preview"
                      className="w-48 h-48 object-cover rounded-lg border shadow-sm"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                      onClick={removeImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-48 h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/20">
                    <div className="text-center">
                      <PawPrint className="h-16 w-16 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No image uploaded
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload and Capture Buttons */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Upload or Capture Image
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("image").click()}
                  className="flex items-center gap-2 flex-1"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCameraCapture}
                  className="flex items-center gap-2 flex-1"
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </Button>
              </div>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground text-center">
                Supported formats: JPG, PNG, GIF. Max size: 5MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-96 h-72 object-cover rounded"
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-2 mt-4 justify-center">
              <Button onClick={capturePhoto}>Capture</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCamera(false);
                  if (stream) {
                    stream.getTracks().forEach((track) => {
                      track.stop();
                      track.enabled = false;
                    });
                    setStream(null);
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-2 pt-4">
        <div className="flex gap-2">
          {step > 0 && !(mode === "edit" && startStep === 1) && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          {step < steps.length - 1 && !(mode === "edit" && startStep === 1) ? (
            <Button type="button" onClick={handleNext} disabled={loading}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {mode === "create" ? "Adding..." : "Updating..."}
                </div>
              ) : mode === "create" ? (
                "Add Pet"
              ) : (
                "Update Pet"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetForm;
