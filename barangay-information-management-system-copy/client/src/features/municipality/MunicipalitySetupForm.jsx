import React, { useState, useEffect, useRef } from "react";
import { handleError, handleErrorSilently } from "@/utils/errorHandler";
import { handleSetupError, handleSetupCompletion } from "@/utils/setupErrorHandler";
import logger from "@/utils/logger";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  MapPin, 
  LogOut, 
  Building,
  Map,
  FileText,
  Camera,
  Shield
} from "lucide-react";
import api from "@/utils/api";
import MunicipalityMap from "@/components/common/MunicipalityMap";
import useAuth from "@/hooks/useAuth";

const setupSchema = z.object({
  municipalityName: z.string().min(1, "Municipality name is required"),
  municipalityCode: z.string().min(1, "Municipality code is required"),
  region: z.string().min(1, "Region is required"),
  province: z.string().min(1, "Province is required"),
  description: z.string().optional(),
  municipalityLogo: z.any().refine((file) => file !== null && file !== undefined, {
    message: "Municipality logo is required"
  }),
  idBgFront: z.any().optional(),
  idBgBack: z.any().optional(),
});

const imageFields = [
  { name: "municipalityLogo", label: "Municipality Logo", description: "Official logo for documents and headers", required: true },
  { name: "idBgFront", label: "ID Background Front", description: "Front side of ID background", required: false },
  { name: "idBgBack", label: "ID Background Back", description: "Back side of ID background", required: false },
];

const MunicipalitySetupForm = ({
  user,
  toast,
  navigate,
  updateSetupStatus,
  checkSetup,
  onSubmit: externalOnSubmit,
  onSetupComplete,
}) => {
  const [imagePreviews, setImagePreviews] = useState({});
  const [loadingMunicipality, setLoadingMunicipality] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [municipalityCode, setMunicipalityCode] = useState("");
  const userSelectedMunicipality = useRef(false);
  const targetId = user?.target_id;
  const { logout } = useAuth();
  
  const form = useForm({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      municipalityName: "",
      municipalityCode: "",
      region: "",
      province: "",
      description: "",
      municipalityLogo: null,
      idBgFront: null,
      idBgBack: null,
    },
    mode: "onTouched",
  });
  const { handleSubmit, control, setValue, formState: { errors, isSubmitting } } = form;

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  useEffect(() => {
    const fetchMunicipality = async () => {
      try {
        const res = await api.get("/municipality");
        const muni = Array.isArray(res.data.data)
          ? res.data.data[0]
          : res.data.data;
        if (muni) {
          setValue("municipalityName", muni.municipality_name || "");
          setValue("municipalityCode", muni.municipality_code || "");
          setValue("region", muni.region || "");
          setValue("province", muni.province || "");
          setValue("description", muni.description || "");

          // Set selected municipality if GIS Code is available
          if (muni.gis_code) {
            setSelectedMunicipality({
              gis_code: muni.gis_code,
              name: muni.municipality_name,
            });
          }
          if (muni.municipality_logo_path) {
            setImagePreviews((prev) => ({
              ...prev,
              municipalityLogo: muni.municipality_logo_path,
            }));
          }
          if (muni.id_background_front_path) {
            setImagePreviews((prev) => ({
              ...prev,
              idBgFront: muni.id_background_front_path,
            }));
          }
          if (muni.id_background_back_path) {
            setImagePreviews((prev) => ({
              ...prev,
              idBgBack: muni.id_background_back_path,
            }));
          }

          // Fetch current prefix if municipality code is not set
          if (!muni.municipality_code) {
            try {
              const prefixResponse = await api.get("/prefix");
              const currentPrefix = prefixResponse.data.data.prefix;
              setValue("municipalityCode", currentPrefix);
            } catch (prefixError) {
              handleErrorSilently(prefixError, "Fetch Prefix");
            }
          }
        }
      } catch (err) {
        logger.error("Error fetching municipality:", err);
      }
    };
    fetchMunicipality();
  }, [setValue]);

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

  const handleMunicipalitySelect = (municipalityData) => {
    logger.debug("Municipality selected:", municipalityData);
    setSelectedMunicipality(municipalityData);
    setValue("municipalityName", municipalityData.name);
    setValue("gisCode", municipalityData.gis_code);
  };

  // Function to check for potential conflicts
  const checkForConflicts = async (municipalityName, municipalityCode) => {
    try {
      const response = await api.get(`/municipality/${targetId}/conflicts`, {
        params: {
          municipalityName,
          municipalityCode
        }
      });
      
      return response.data.data;
    } catch (error) {
      logger.error("Error checking for conflicts:", error);
      // If conflict check fails, we'll proceed with the submission and let the server handle it
      return { hasConflicts: false, conflicts: [] };
    }
  };

  const onSubmit = async (data) => {
    // Prevent multiple submissions
    if (loadingMunicipality || isSubmitting) {
      return;
    }
    
    setLoadingMunicipality(true);
    try {
      // Check for potential conflicts
      const conflictCheck = await checkForConflicts(data.municipalityName, data.municipalityCode);
      if (conflictCheck.hasConflicts) {
        const conflictMessages = conflictCheck.conflicts.map(conflict => conflict.message).join(', ');
        toast({
          title: "Potential Conflict Detected",
          description: conflictMessages,
          variant: "warning",
        });
        return;
      }

      const formData = new FormData();
      formData.append("municipalityName", data.municipalityName);
      formData.append("municipalityCode", data.municipalityCode);
      formData.append("region", data.region);
      formData.append("province", data.province);
      formData.append("description", data.description);

      // Add GIS Code if selected
      if (selectedMunicipality?.gis_code) {
        formData.append("gisCode", selectedMunicipality.gis_code);
      }

      // Add location data if selected (fallback to default coordinates if not set)
      if (selectedLocation) {
        formData.append("latitude", selectedLocation[0]);
        formData.append("longitude", selectedLocation[1]);
      } else {
        // Default fallback coordinates (override via map selection)
        formData.append("latitude", 11.6081);
        formData.append("longitude", 125.4311);
      }

      if (data.municipalityLogo)
        formData.append("municipalityLogoPath", data.municipalityLogo);
      if (data.idBgFront)
        formData.append("idBackgroundFrontPath", data.idBgFront);
      if (data.idBgBack)
        formData.append("idBackgroundBackPath", data.idBgBack);

      if (externalOnSubmit) {
        // If external onSubmit is provided, use it (for settings page)
        await externalOnSubmit(data);
      } else {
        // Original behavior for setup page
        await api.put(`/${targetId}/municipality`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        // Create barangays from GIS data in the background
        if (selectedMunicipality?.gis_code) {
          try {
            await api.post("/setup/municipality", {
              gis_municipality_code: selectedMunicipality.gis_code,
              province: data.province,
              region: data.region,
            });
          } catch (gisError) {
            // Non-fatal — barangays may already exist
            logger.warn("Background barangay creation warning:", gisError);
          }
        }

        // Use the new setup completion handler
        await handleSetupCompletion(
          () => checkSetup("municipality", targetId),
          updateSetupStatus,
          user,
          () => {
            if (onSetupComplete) {
              onSetupComplete();
            } else {
              navigate("/admin/municipality/dashboard");
            }
          },
          "Municipality Setup"
        );
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Setup error:", error);
      }
      
      // Use the new setup error handler
      const errorResult = handleSetupError(error, "Municipality Setup");
      
      // If it's an authorization error, don't show the error but still check if setup succeeded
      if (error.response?.status === 401 && errorResult.shouldRetry) {
        logger.info("Authorization error during setup, checking if setup actually succeeded...");
        
        try {
          // Check if setup actually succeeded despite the auth error
          const setupResult = await checkSetup("municipality", targetId);
          if (setupResult.isSetup) {
            logger.info("Setup succeeded despite authorization error");
            toast({
              title: "Setup Successful",
              description: "Municipality setup completed successfully.",
            });
            
            try {
              await updateSetupStatus(user);
            } catch (updateError) {
              logger.warn("Setup status update failed:", updateError);
            }
            
            if (onSetupComplete) {
              onSetupComplete();
            } else {
              navigate("/admin/municipality/dashboard");
            }
            return;
          }
        } catch (setupCheckError) {
          logger.warn("Setup check failed:", setupCheckError);
        }
      }
      
      // Only show error if the handler says we should
      if (errorResult.shouldShowError) {
        // Error already shown by handleSetupError
        logger.error("Setup failed:", errorResult.message);
      }
    } finally {
      setLoadingMunicipality(false);
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
                  <Building className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Municipality Setup
              </h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                Complete your municipality organization profile to get started with BIMS.
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
                      Set up your municipality details and upload organizational assets
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
                          <Building className="w-5 h-5 text-primary" />
                          Basic Information
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enter your municipality's basic details
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={control}
                          name="municipalityName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                Municipality Name
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter municipality name"
                                  {...field}
                                  disabled={loadingMunicipality}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name="municipalityCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Municipality Code
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter municipality code (max 4 chars)"
                                  maxLength={4}
                                  {...field}
                                  disabled={loadingMunicipality}
                                />
                              </FormControl>
                              <FormMessage />
                              
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name="region"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Region
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter region"
                                  {...field}
                                  disabled={loadingMunicipality}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={control}
                          name="province"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Province
                                <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter province"
                                  {...field}
                                  disabled={loadingMunicipality}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Description
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe your municipality (optional)"
                                {...field}
                                disabled={loadingMunicipality}
                                className="min-h-[90px]"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Municipality Selection Map */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Map className="w-5 h-5 text-primary" />
                          Location Selection
                          <span className="text-destructive">*</span>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click on your municipality area in the map to select it
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <MunicipalityMap
                          onMunicipalitySelect={handleMunicipalitySelect}
                          selectedMunicipalityId={selectedMunicipality?.gis_code}
                        />
                        
                        {selectedMunicipality && (
                          <div className="bg-muted rounded-lg p-4 border border-success/20">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="w-4 h-4 text-success" />
                              <span className="text-sm font-medium text-foreground">
                                Selected Municipality
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                {selectedMunicipality.name}
                              </p>
                              <Badge variant="secondary" className="text-xs">
                                GIS Code: {selectedMunicipality.gis_code}
                              </Badge>
                            </div>
                          </div>
                        )}
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
                          Upload official images for your municipality
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
                        disabled={loadingMunicipality || isSubmitting || Object.keys(errors).length > 0 || !form.getValues("municipalityLogo")}
                      >
                        {loadingMunicipality || isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                            {externalOnSubmit ? "Updating..." : "Setting up..."}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            {externalOnSubmit ? "Update Settings" : "Complete Municipality Setup"}
                          </div>
                        )}
                      </Button>
                      
                      {Object.keys(errors).length > 0 && (
                        <p className="text-sm text-destructive text-center">
                          Please fix the validation errors above before submitting.
                        </p>
                      )}
                      {!selectedMunicipality?.gis_code && (
                        <p className="text-sm text-destructive text-center">
                          Please select a municipality from the map before submitting.
                        </p>
                      )}
                      {!form.getValues("municipalityLogo") && (
                        <p className="text-sm text-destructive text-center">
                          Please upload a municipality logo before submitting.
                        </p>
                      )}
                      
                      <p className="text-xs text-muted-foreground text-center">
                        Make sure to select your municipality from the map and upload a logo before proceeding.
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

export default MunicipalitySetupForm;