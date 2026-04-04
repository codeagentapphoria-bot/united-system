import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import logger from "@/utils/logger";
import { handleSetupError, handleSetupCompletion } from "@/utils/setupErrorHandler";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  XCircle, 
  Plus, 
  Trash2, 
  MapPin, 
  LogOut, 
  Building2,
  Mail,
  Phone,
  Camera,
  Users,
  Shield
} from "lucide-react";
import api from "@/utils/api";
import MunicipalityBarangaysMap from "@/components/common/MunicipalityBarangaysMap";
import useAuth from "@/hooks/useAuth";

const setupSchema = z.object({
  barangayName: z.string().min(1, "Barangay name is required"),
  barangayCode: z.string().min(1, "Barangay code is required"),
  email: z.string().email("Please enter a valid email address"),
  contact: z.string().min(1, "Contact number is required"),
  barangayLogo: z.any().refine((file) => file !== null && file !== undefined, {
    message: "Barangay logo is required"
  }),
  certBg: z.any().optional(),
  orgChartImage: z.any().optional(),
  gisCode: z.string().optional(),
});

const imageFields = [
  { name: "barangayLogo", label: "Barangay Logo", description: "Official logo for documents and headers", required: true },
  { name: "certBg", label: "Certificate Background", description: "Background image for certificates", required: false },
  { name: "orgChartImage", label: "Organization Chart", description: "Organizational structure image", required: false },
];

const BarangaySetupForm = ({
  user,
  toast,
  navigate,
  updateSetupStatus,
  checkSetup,
  onSubmit: externalOnSubmit,
  onSetupComplete,
}) => {
  const [imagePreviews, setImagePreviews] = useState({});
  const [loadingBarangay, setLoadingBarangay] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [municipalityCode, setMunicipalityCode] = useState("");
  const userSelectedBarangay = useRef(false);
  const targetId = user?.target_id;
  const { logout } = useAuth();
  
  const form = useForm({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      barangayName: "",
      barangayCode: "",
      email: "",
      contact: "",
      barangayLogo: null,
      certBg: null,
      orgChartImage: null,
      gisCode: "",
    },
    mode: "onTouched",
  });
  
  const { handleSubmit, control, setValue, formState: { errors, isSubmitting } } = form;
  const [puroks, setPuroks] = useState([
    { purokName: "", purokLeader: "", description: "" },
  ]);

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  useEffect(() => {
    const fetchBarangay = async () => {
      if (targetId && !userSelectedBarangay.current) {
        setLoadingBarangay(true);
        try {
          const res = await api.get(`/${targetId}/barangay`);
          const barangay = res.data.data;
          setValue("barangayName", barangay.barangay_name || "");
          setValue("barangayCode", barangay.barangay_code || "");
          setValue("email", barangay.email || "");
          setValue("contact", barangay.contact_number || "");
          setValue("gisCode", barangay.gis_code || "");

          // Set location if available
          if (barangay.latitude && barangay.longitude) {
            setSelectedLocation([barangay.latitude, barangay.longitude]);
          }

          // For setup form, don't auto-set selected barangay - let user choose
          // Only set if this is an edit scenario (targetId exists and has gis_code)
          if (targetId && barangay.gis_code && !userSelectedBarangay.current) {
            setSelectedBarangay({
              gis_code: barangay.gis_code,
              name: barangay.barangay_name,
            });
          }

          // For barangay setup, we want to show ALL barangays in the municipality for selection
          // This allows users to select their barangay from the map
          if (barangay.municipality_id) {
            try {
              const municipalityRes = await api.get(`/municipality/${barangay.municipality_id}`);
              const municipality = municipalityRes.data.data;
              const newMunicipalityCode = municipality.municipality_code;
              if (newMunicipalityCode && municipalityCode !== newMunicipalityCode) {
                setMunicipalityCode(newMunicipalityCode);
              }
            } catch (err) {
              logger.warn("Failed to fetch municipality info:", err.message);
              // Don't set a fallback - let the user handle this case
            }
          }
        } catch (err) {
          logger.error("Error fetching barangay:", err);
        } finally {
          setLoadingBarangay(false);
        }
      }
    };
    fetchBarangay();
  }, [targetId, setValue, municipalityCode]);

  const handleImageChange = (name, file) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image file must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setValue(name, file);
      setImagePreviews((prev) => ({
        ...prev,
        [name]: URL.createObjectURL(file),
      }));
    }
  };

  const handleRemoveImage = (name) => {
    setValue(name, null);
    setImagePreviews((prev) => ({ ...prev, [name]: null }));
  };

  const handleBarangaySelect = useCallback((barangayData) => {
    setSelectedBarangay(barangayData);
    setValue("barangayName", barangayData.name);
    setValue("gisCode", barangayData.gis_code);
    userSelectedBarangay.current = true;
  }, [setValue]);

  const handleLocationSelect = (coordinates) => {
    setSelectedLocation(coordinates);
  };

  // Add handlers for dynamic purok list
  const handlePurokChange = (idx, field, value) => {
    setPuroks((prev) => {
      const updated = [...prev];
      updated[idx][field] = value;
      return updated;
    });
  };
  
  const addPurok = () => {
    setPuroks((prev) => [
      ...prev,
      { purokName: "", purokLeader: "", description: "" },
    ]);
  };
  
  const removePurok = (idx) => {
    setPuroks((prev) => prev.filter((_, i) => i !== idx));
  };

  const checkForConflicts = async (barangayName, barangayCode) => {
    try {
      const response = await api.get(`/barangay/${targetId}/conflicts`, {
        params: { barangayName, barangayCode }
      });
      return response.data.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error checking for conflicts:", error);
}
      return { hasConflicts: false, conflicts: [] };
    }
  };

  const onSubmit = async (data) => {
    // Prevent multiple submissions
    if (loadingBarangay || isSubmitting) {
      return;
    }
    
    setLoadingBarangay(true);
    try {
      // Check for conflicts before submitting
      const conflictCheck = await checkForConflicts(data.barangayName, data.barangayCode);
      
      if (conflictCheck.hasConflicts) {
        const conflictMessages = conflictCheck.conflicts.map(c => c.message).join(", ");
        toast({
          title: "Conflict Error",
          description: conflictMessages,
          variant: "destructive",
        });
        return;
      }
      const formData = new FormData();
      formData.append("barangayName", data.barangayName);
      formData.append("barangayCode", data.barangayCode);
      formData.append("email", data.email);
      formData.append("contactNumber", data.contact);

      // Add GIS Code if selected
      if (selectedBarangay?.gis_code) {
        formData.append("gisCode", selectedBarangay.gis_code);
      }

      // Add location data if selected (fallback to default coordinates if not set)
      if (selectedLocation) {
        formData.append("latitude", selectedLocation[0]);
        formData.append("longitude", selectedLocation[1]);
      } else {
        // Default coordinates for Borongan City
        formData.append("latitude", 11.6081);
        formData.append("longitude", 125.4311);
      }

      if (data.barangayLogo)
        formData.append("barangayLogoPath", data.barangayLogo);
      if (data.certBg)
        formData.append("certificateBackgroundPath", data.certBg);
      if (data.orgChartImage)
        formData.append("organizationalChartPath", data.orgChartImage);

      if (externalOnSubmit) {
        // If external onSubmit is provided, use it (for settings page)
        await externalOnSubmit(data);
      } else {
        // Original behavior for setup page
        await api.put(`/${targetId}/barangay`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        // --- Add: Create Puroks ---
        const barangayId = targetId; // already created
        for (const purok of puroks) {
          if (purok.purokName.trim()) {
            await api.post("/purok", {
              barangayId,
              purokName: purok.purokName,
              purokLeader: purok.purokLeader,
              description: purok.description,
            });
          }
        }
        
        let setupOk = false;
        let setupData = null;
        let lastError = null;
        try {
          // Add a small delay to ensure cache invalidation has completed
          await new Promise(resolve => setTimeout(resolve, 1000));
          const result = await checkSetup("barangay", targetId);
          setupOk = result.isSetup;
          setupData = result.data;
          if (!setupOk) {
            lastError = new Error("Setup verification failed - required fields not found");
          }
          if (setupOk) {
            try {
              await updateSetupStatus(user);
            } catch (err) {
              toast({
                title: "Setup Warning",
                description:
                  "Setup completed, but failed to update status. Please refresh.",
                variant: "warning",
              });
              return;
            }
            toast({
              title: "Setup Successful",
              description: "Barangay setup completed successfully.",
            });
            if (onSetupComplete) {
              onSetupComplete();
            } else {
              navigate("/admin/barangay/dashboard");
            }
          } else {
            toast({
              title: "Setup Error",
              description: lastError?.message
                ? `Please try again. Setup not detected. Error: ${lastError.message}`
                : "Please try again. Setup not detected.",
              variant: "destructive",
            });
          }
        } catch (outerError) {
          toast({
            title: "Unexpected Error",
            description:
              outerError?.message ||
              "An unexpected error occurred during setup. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Setup error:", error);
}
      
      // Handle specific errors
      if (error.response?.status === 409) {
        const errorMessage = error.response?.data?.message || "A barangay with this information already exists.";
        toast({
          title: "Conflict Error",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (error.response?.status === 400) {
        toast({
          title: "Validation Error",
          description: error.response?.data?.message || "Please check your input and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Setup Error",
          description:
            error.response?.data?.message ||
            "Failed to complete barangay setup. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingBarangay(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {!externalOnSubmit && (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <Building2 className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Barangay Setup
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Complete your barangay organization profile to get started with BIMS.
              </p>
            </div>

            {/* Main Setup Card */}
            <Card className="shadow-lg border-border">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold text-foreground">
                      Organization Information
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Set up your barangay details and upload organizational assets
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Logout</span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-8">
                <Form {...form}>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Basic Information Section */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-primary" />
                          Basic Information
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enter your barangay's basic details
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={control}
                          name="barangayName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                Barangay Name
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter barangay name"
                                  {...field}
                                  disabled={loadingBarangay}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name="barangayCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Barangay Code
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter barangay code"
                                  {...field}
                                  disabled={loadingBarangay}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Email Address
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Enter email address"
                                  {...field}
                                  disabled={loadingBarangay}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name="contact"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                Contact Number
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter contact number"
                                  {...field}
                                  disabled={loadingBarangay}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Barangay Selection Map */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-primary" />
                          Location Selection
                          <span className="text-destructive">*</span>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click on your barangay area in the map to select it
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <MunicipalityBarangaysMap
                          onBarangaySelect={handleBarangaySelect}
                          selectedBarangayId={selectedBarangay?.gis_code || null}
                          existingBarangayId={null}
                          municipalityId={municipalityCode}
                        />
                        
                        {selectedBarangay && (
                          <div className="bg-muted rounded-lg p-4 border border-success/20">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-success" />
                              <span className="text-sm font-medium text-foreground">
                                Selected Barangay
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {selectedBarangay.name}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                GIS Code: {selectedBarangay.gis_code}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Puroks Section */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          Puroks
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add the puroks within your barangay
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        {puroks.map((purok, idx) => (
                          <Card key={idx} className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <FormLabel className="text-sm font-medium text-foreground">
                                    Purok Name
                                    <span className="text-destructive">*</span>
                                  </FormLabel>
                                  <Input
                                    placeholder="Enter purok name"
                                    value={purok.purokName}
                                    onChange={(e) =>
                                      handlePurokChange(idx, "purokName", e.target.value)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <FormLabel className="text-sm font-medium text-foreground">
                                    Purok Leader
                                  </FormLabel>
                                  <Input
                                    placeholder="Enter purok leader (optional)"
                                    value={purok.purokLeader}
                                    onChange={(e) =>
                                      handlePurokChange(idx, "purokLeader", e.target.value)
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <FormLabel className="text-sm font-medium text-foreground">
                                      Description
                                    </FormLabel>
                                    <Input
                                      placeholder="Enter description (optional)"
                                      value={purok.description}
                                      onChange={(e) =>
                                        handlePurokChange(idx, "description", e.target.value)
                                      }
                                      className="mt-1"
                                    />
                                  </div>
                                  {puroks.length > 1 && (
                                    <div className="flex items-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePurok(idx)}
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addPurok}
                          className="w-fit flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Purok
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Images & Branding Section */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Camera className="w-5 h-5 text-primary" />
                          Images & Branding
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload official images for your barangay (optional)
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {imageFields.map((img) => (
                          <FormField
                            key={img.name}
                            control={control}
                            name={img.name}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-foreground">
                                  {img.label}
                                  {img.required && <span className="text-destructive">*</span>}
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  {img.description}
                                </FormDescription>
                                <FormControl>
                                  <div className="space-y-3">
                                    {imagePreviews[img.name] ? (
                                      <div className="relative">
                                        <img
                                          src={imagePreviews[img.name]}
                                          alt={img.label}
                                          className="w-full h-32 object-cover rounded-lg border border-border"
                                        />
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handleRemoveImage(img.name)}
                                          className="absolute -top-2 -right-2 rounded-full w-6 h-6 p-0 shadow-md"
                                        >
                                          <XCircle className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files[0];
                                            handleImageChange(img.name, file);
                                          }}
                                          className="hidden"
                                          id={`${img.name}-upload`}
                                        />
                                        <label htmlFor={`${img.name}-upload`} className="cursor-pointer">
                                          <div className="flex flex-col items-center text-muted-foreground">
                                            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mb-2">
                                              <Camera className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs font-medium">Upload Image</span>
                                            <span className="text-xs text-muted-foreground mt-1">
                                              JPG, PNG, GIF (Max 5MB)
                                            </span>
                                          </div>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Submit Button */}
                    <div className="space-y-4">
                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold"
                        disabled={loadingBarangay || isSubmitting || !selectedBarangay || !form.getValues("barangayLogo")}
                      >
                        {loadingBarangay || isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                            {externalOnSubmit ? "Updating..." : "Setting up..."}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            {externalOnSubmit ? "Update Settings" : "Complete Barangay Setup"}
                          </div>
                        )}
                      </Button>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Make sure to select your barangay from the map and upload a logo before proceeding.
                      </p>
                    </div>
                  </form>
                </Form>
                
                {externalOnSubmit && (
                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => externalOnSubmit(null)} // Cancel action
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default BarangaySetupForm;