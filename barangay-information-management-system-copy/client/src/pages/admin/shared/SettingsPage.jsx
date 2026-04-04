import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { handleError, handleErrorSilently } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Building2,
  FileText,
  Plus,
  Edit,
  Trash2,
  Save,
  Type,
  Palette,
  Monitor,
  Upload,
  Download,
  X,
  Map,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import RefreshControls from "@/components/common/RefreshControls";
import { useCrudRefresh } from "@/hooks/useCrudRefresh";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";
import api from "@/utils/api";
import { ADMIN_ROUTES } from "@/constants/routes";
import MunicipalityBarangaysMap from "@/components/common/MunicipalityBarangaysMap";
import MunicipalityMap from "@/components/common/MunicipalityMap";
import {
  municipalitySetupSchema,
  barangaySetupSchema,
  interfacePreferencesSchema,
} from "@/utils/settingsSchema";
import ClassificationTypeManager from "@/components/ui/ClassificationTypeManager";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import BulkIDPage from "@/pages/admin/municipality/BulkIDPage";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const SettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // CRUD refresh functionality
  const { handleCrudSuccess, handleCrudError } = useCrudRefresh({
    autoRefresh: false, // Disabled to prevent double refresh - data is refreshed by individual CRUD operations
    clearCache: true,
    refreshDelay: 1500
  });

  // Auto-refresh for settings operations
  const { handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'settings',
    successMessage: 'Settings updated successfully!',
    errorMessage: 'Failed to update settings',
    showToast: true,
    autoRefresh: true,
    refreshDelay: 100
  });
  const [activeTab, setActiveTab] = useState("setup");

  const [isDeleteBarangayDialogOpen, setIsDeleteBarangayDialogOpen] =
    useState(false);
  const [isExportDataDialogOpen, setIsExportDataDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Interface settings state
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [interfaceLoaded, setInterfaceLoaded] = useState(false);

  // Setup form state (now handled by React Hook Form)
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [existingBarangayId, setExistingBarangayId] = useState(null);
  const [municipalityCode, setMunicipalityCode] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  const [existingMunicipalityId, setExistingMunicipalityId] = useState(null);
  const [municipalityIdForClassification, setMunicipalityIdForClassification] = useState(null);
  const [imageFiles, setImageFiles] = useState({});
  const [imagePreviews, setImagePreviews] = useState({});

  const isMunicipality = user?.target_type === "municipality";
  const isBarangay = user?.target_type === "barangay";

  // Set municipality ID for classification types
  useEffect(() => {
    if (isMunicipality) {
      setMunicipalityIdForClassification(user.target_id);
    } else if (isBarangay && user?.target_id) {
      const fetchMunicipalityId = async () => {
        try {
          const res = await api.get(`/${user.target_id}/barangay`);
          const barangay = res.data?.data || res.data;
          if (barangay?.municipality_id || barangay?.municipalityId) {
            setMunicipalityIdForClassification(barangay.municipality_id || barangay.municipalityId);
          }
        } catch (err) {
          logger.error('Error fetching barangay:', err);
        }
      };
      fetchMunicipalityId();
    }
  }, [user, isMunicipality, isBarangay]);



  // React Hook Form setup
  const setupForm = useForm({
    resolver: zodResolver(
      isMunicipality ? municipalitySetupSchema : barangaySetupSchema
    ),
            defaultValues: isMunicipality
      ? {
          municipalityName: "",
          municipalityCode: "",
          region: "",
          province: "",
          description: "",
          municipalityLogoPath: undefined,
          idBackgroundFrontPath: undefined,
          idBackgroundBackPath: undefined,
        }
      : {
          name: "",
          code: "",
          email: "",
          contact: "",
          region: "",
          province: "",
          website: "",
          address: "",
          gisCode: null,
          barangayLogo: undefined,
        },
  });



  const interfaceForm = useForm({
    resolver: zodResolver(interfacePreferencesSchema),
    defaultValues: {
      theme: "system",
      sidebarCollapsed: false,
      notificationsEnabled: true,
      autoSave: true,
    },
  });



  useEffect(() => {
    // Load saved interface preferences
    loadInterfacePreferences();
    // Load setup data when user is available
    if (user?.target_id) {
      loadSetupData();
    }
  }, [user?.target_id]);

  // Handle hash fragment to open specific tabs
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'classification' && isBarangay) {
      setActiveTab('classification');
    }
  }, [isBarangay]);



  // Apply interface settings on mount
  useEffect(() => {
    // Apply font size
    document.documentElement.style.fontSize = `${fontSize}px`;

    // Apply high contrast
    if (highContrast) {
      document.body.classList.add("high-contrast");
    } else {
      document.body.classList.remove("high-contrast");
    }

    // Apply reduced motion
    if (reducedMotion) {
      document.body.classList.add("reduced-motion");
    } else {
      document.body.classList.remove("reduced-motion");
    }
  }, [fontSize, highContrast, reducedMotion]);

  const loadInterfacePreferences = () => {
    if (interfaceLoaded) return; // Prevent infinite loop
    
    const savedFontSize = localStorage.getItem("fontSize");
    const savedHighContrast = localStorage.getItem("highContrast");
    const savedReducedMotion = localStorage.getItem("reducedMotion");

    if (savedFontSize) setFontSize(parseInt(savedFontSize));
    if (savedHighContrast) setHighContrast(savedHighContrast === "true");
    if (savedReducedMotion) setReducedMotion(savedReducedMotion === "true");
    
    setInterfaceLoaded(true);
  };

  const saveInterfacePreferences = () => {
    localStorage.setItem("fontSize", fontSize.toString());
    localStorage.setItem("highContrast", highContrast.toString());
    localStorage.setItem("reducedMotion", reducedMotion.toString());

    // Apply font size to document
    document.documentElement.style.fontSize = `${fontSize}px`;

    // Apply high contrast
    if (highContrast) {
      document.body.classList.add("high-contrast");
    } else {
      document.body.classList.remove("high-contrast");
    }

    // Apply reduced motion
    if (reducedMotion) {
      document.body.classList.add("reduced-motion");
    } else {
      document.body.classList.remove("reduced-motion");
    }

    toast({
      title: "Interface Settings Saved",
      description: "Your interface preferences have been updated.",
    });
  };

  const loadSetupData = async () => {
    try {
      if (isMunicipality) {
        // Load municipality data
        const response = await api.get("/municipality");
        const municipality = response.data.data;

        // Handle both array and single object responses
        const municipalityData = Array.isArray(municipality)
          ? municipality[0]
          : municipality;

        const formData = {
          municipalityName: municipalityData?.municipality_name || "",
          municipalityCode: municipalityData?.municipality_code || "",
          description: municipalityData?.description || "",
          region: municipalityData?.region || "",
          province: municipalityData?.province || "",
        };

        setupForm.reset(formData);

        // Set image previews for municipality
        if (municipalityData?.municipality_logo_path) {
          setImagePreviews((prev) => ({
            ...prev,
            municipalityLogoPath: `${SERVER_URL}/${municipalityData.municipality_logo_path}`,
          }));
        }
        if (municipalityData?.id_background_front_path) {
          setImagePreviews((prev) => ({
            ...prev,
            idBackgroundFrontPath: `${SERVER_URL}/${municipalityData.id_background_front_path}`,
          }));
        }
        if (municipalityData?.id_background_back_path) {
          setImagePreviews((prev) => ({
            ...prev,
            idBackgroundBackPath: `${SERVER_URL}/${municipalityData.id_background_back_path}`,
          }));
        }

        // Set existing municipality ID for auto-highlighting (don't set as selected initially)
        if (municipalityData?.gis_code) {
          setExistingMunicipalityId(municipalityData.gis_code);
          // Don't set selectedMunicipality here - let user click to select
        }

        // Fetch current prefix if municipality code is not set
        if (!municipalityData?.municipality_code) {
          try {
            const prefixResponse = await api.get("/prefix");
            const currentPrefix = prefixResponse.data.data.prefix;
            setupForm.setValue("municipalityCode", currentPrefix);
          } catch (prefixError) {
            handleErrorSilently(prefixError, "Fetch Prefix");
          }
        }
      } else if (isBarangay) {
        // Load barangay data
        const response = await api.get(`/${user?.target_id}/barangay`);
        const barangay = response.data.data;
        const formData = {
          name: barangay.barangay_name || "",
          code: barangay.barangay_code || "",
          email: barangay.email || "",
          contact: barangay.contact_number || "",
          description: barangay.description || "",
          gisCode: barangay.gis_code || null,
        };

        setupForm.reset(formData);

        // For barangay settings, we want to show ALL barangays in the municipality for selection
        // This allows users to select their barangay from the map
        logger.debug("Barangay data loaded:", {
          barangay_id: barangay.id,
          barangay_name: barangay.barangay_name,
          gis_code: barangay.gis_code,
          municipality_id: barangay.municipality_id
        });
        
        // Always use municipality code to show all barangays for selection
        if (barangay.municipality_id) {
          try {
            const municipalityRes = await api.get(`/municipality/${barangay.municipality_id}`);
            const municipality = municipalityRes.data.data;
            const newMunicipalityCode = municipality.municipality_code;

            if (newMunicipalityCode) {
              setMunicipalityCode(newMunicipalityCode);
            }
          } catch (err) {
            logger.warn("Failed to fetch municipality info:", err.message);
            // Don't set a fallback - let the user handle this case
          }
        }

        // Set existing barangay ID for auto-highlighting (don't set as selected initially)
        if (barangay.gis_code) {
          setExistingBarangayId(barangay.gis_code);
          // Don't set selectedBarangay here - let user click to select
          // But populate the barangay name in setupData
        }

        // Set image previews for barangay
        if (barangay.barangay_logo_path) {
          setImagePreviews((prev) => ({
            ...prev,
            logo: `${SERVER_URL}/${barangay.barangay_logo_path}`,
          }));
        }
        if (barangay.certificate_background_path) {
          setImagePreviews((prev) => ({
            ...prev,
            certificate: `${SERVER_URL}/${barangay.certificate_background_path}`,
          }));
        }
        if (barangay.organizational_chart_path) {
          setImagePreviews((prev) => ({
            ...prev,
            orgChart: `${SERVER_URL}/${barangay.organizational_chart_path}`,
          }));
        }
      }
    } catch (error) {
      handleErrorSilently(error, "Load Setup Data");
    }
  };



  const handleSetupSubmit = async (data) => {
    setLoading(true);
    try {
      
      const formData = new FormData();

      if (isMunicipality) {
        // Municipality fields
        formData.append("municipalityName", data.municipalityName);
        formData.append("municipalityCode", data.municipalityCode);
        formData.append("region", data.region);
        formData.append("province", data.province);
        formData.append("description", data.description);

        // Add GIS code if selected, otherwise use existing municipality's GIS code
        if (selectedMunicipality?.gis_code) {
          formData.append("gisCode", selectedMunicipality.gis_code);
        } else if (existingMunicipalityId) {
          formData.append("gisCode", existingMunicipalityId);
        }

        // Municipality image files - handle new uploads (logos cannot be removed)
        if (data.municipalityLogoPath instanceof File) {
          formData.append("municipalityLogoPath", data.municipalityLogoPath);
        }
        if (data.idBackgroundFrontPath instanceof File) {
          formData.append("idBackgroundFrontPath", data.idBackgroundFrontPath);
        } else if (data.idBackgroundFrontPath === null) {
          formData.append("removeIdBackgroundFrontPath", "true");
        }
        if (data.idBackgroundBackPath instanceof File) {
          formData.append("idBackgroundBackPath", data.idBackgroundBackPath);
        } else if (data.idBackgroundBackPath === null) {
          formData.append("removeIdBackgroundBackPath", "true");
        }

        await handleCRUDOperation(
          async (data) => api.put(`/${user?.target_id}/municipality`, data),
          formData
        );
      } else {
        // Barangay fields
        formData.append("barangayName", data.name);
        formData.append("barangayCode", data.code);
        formData.append("email", data.email);
        formData.append("contactNumber", data.contact);

        // Add municipality ID (for barangay users, this should be 1 for the main municipality)
        formData.append("municipalityId", "1");

        // Add GIS ID if selected, otherwise use existing barangay's GIS ID
        if (selectedBarangay?.gis_code) {
          formData.append("gisCode", selectedBarangay.gis_code);
        } else if (existingBarangayId) {
          formData.append("gisCode", existingBarangayId);
        }

        // Barangay image files - handle new uploads (logos cannot be removed)
        if (imageFiles.logo) {
          formData.append("barangayLogoPath", imageFiles.logo);
        }
        if (imageFiles.certificate) {
          formData.append("certificateBackgroundPath", imageFiles.certificate);
        } else if (imageFiles.certificate === null) {
          formData.append("removeCertificateBackgroundPath", "true");
        }
        if (imageFiles.orgChart) {
          formData.append("organizationalChartPath", imageFiles.orgChart);
        } else if (imageFiles.orgChart === null) {
          formData.append("removeOrganizationalChartPath", "true");
        }

        logger.debug("Submitting form data:", {
          barangayName: data.name,
          barangayCode: data.code,
          email: data.email,
          contactNumber: data.contact,
          municipalityId: "1",
          gisCode: selectedBarangay?.gis_code || existingBarangayId,
          imageFiles: Object.keys(imageFiles).filter(key => imageFiles[key])
        });

        // Log FormData contents for debugging
        for (let [key, value] of formData.entries()) {
          logger.debug(`FormData ${key}:`, value);
        }

        const response = await handleCRUDOperation(
          async (data) => api.put(`/${user?.target_id}/barangay`, data),
          formData
        );
        logger.debug("API response:", response.data);
      }

      // Handle successful update with auto-refresh
      await handleCrudSuccess('update', {
        message: 'Settings have been updated successfully'
      });

      // Reload setup data to get updated information
      await loadSetupData();

      // Reset map selection after successful update
      setSelectedBarangay(null);
      setSelectedMunicipality(null);
    } catch (error) {
      handleCrudError(error, 'update');
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteBarangayConfirm = async () => {
    try {
      setLoading(true);
      await handleCRUDOperation(
        async () => api.delete(`/${user?.target_id}/barangay`),
        {}
      );

      // Handle successful deletion with auto-refresh (but redirect to login instead)
      toast({
        title: "Barangay Deleted",
        description:
          "Barangay has been successfully deleted. You will be logged out.",
      });

      // Logout the user after successful deletion
      setTimeout(() => {
        window.location.href = ADMIN_ROUTES.LOGIN;
      }, 2000);
    } catch (error) {
      handleCrudError(error, 'delete');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExportLoading(true);

      // Call the export API endpoint
      const response = await api.get(
        `/export/${user?.target_id}/barangay-data`,
        {
          responseType: "blob",
        }
      );

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Set filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const barangayName =
        user?.target_type === "barangay" ? "barangay" : "municipality";
      link.setAttribute(
        "download",
        `${barangayName}-data-export-${timestamp}.zip`
      );

      // Trigger download
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "All data has been exported successfully.",
      });

      setIsExportDataDialogOpen(false);
    } catch (error) {
      handleError(error, "Export Data");
    } finally {
      setExportLoading(false);
    }
  };



  const handleImageChange = (name, file) => {
    logger.debug(`Image change for ${name}:`, file);
    
    if (isMunicipality) {
      setupForm.setValue(name, file);
    } else {
      setImageFiles((prev) => ({ ...prev, [name]: file }));
    }
    
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPEG, PNG, or WebP image.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      
      setImagePreviews((prev) => ({
        ...prev,
        [name]: URL.createObjectURL(file),
      }));
    } else {
      setImagePreviews((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleRemoveImage = (name) => {
    if (isMunicipality) {
      setupForm.setValue(name, null);
    } else {
      setImageFiles((prev) => ({ ...prev, [name]: null }));
    }
    setImagePreviews((prev) => ({ ...prev, [name]: null }));
  };



  const SetupForm = () => {
    const {
      register,
      handleSubmit,
      formState: { errors },
      watch,
    } = setupForm;

    // Use state to track municipality code length without causing re-renders
    const [municipalityCodeLength, setMunicipalityCodeLength] = useState(0);

    // Update length when municipality code changes
    useEffect(() => {
      const subscription = watch((value, { name }) => {
        if (name === "municipalityCode") {
          setMunicipalityCodeLength(value.municipalityCode?.length || 0);
        }
      });
      return () => subscription.unsubscribe();
    }, [watch]);

    const onSubmit = (data) => {
      handleSetupSubmit(data);
    };

    if (isMunicipality) {
      return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Municipality Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Municipality Information</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="municipalityName">Municipality Name</Label>
                <Input
                  id="municipalityName"
                  {...register("municipalityName")}
                  placeholder="Enter municipality name"
                  className={errors.municipalityName ? "border-red-500" : ""}
                />
                {errors.municipalityName && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.municipalityName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="municipalityCode">Municipality Code</Label>
                <Input
                  id="municipalityCode"
                  {...register("municipalityCode")}
                  placeholder="Enter municipality code (max 4 chars)"
                  maxLength={4}
                  className={errors.municipalityCode ? "border-red-500" : ""}
                />
                {errors.municipalityCode && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.municipalityCode.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  {...register("region")}
                  placeholder="Enter region"
                  className={errors.region ? "border-red-500" : ""}
                />
                {errors.region && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.region.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  {...register("province")}
                  placeholder="Enter province"
                  className={errors.province ? "border-red-500" : ""}
                />
                {errors.province && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.province.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Enter municipality description"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Municipality Map Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Municipality Map</h3>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                Select Municipality from Map
              </Label>
              <MunicipalityMap
                onMunicipalitySelect={useCallback((municipalityData) => {
                  setSelectedMunicipality(municipalityData);
                  // Don't automatically update the form field - let user manually enter the name
                }, [])}
                selectedMunicipalityId={selectedMunicipality?.gis_code || null} // Show selected municipality
                existingMunicipalityId={existingMunicipalityId} // Auto-highlight existing municipality
              />

              {selectedMunicipality && selectedMunicipality.gis_code !== existingMunicipalityId && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    New Selection: {selectedMunicipality.name}
                  </p>
                  <p className="text-xs text-green-600">
                    GIS Code: {selectedMunicipality.gis_code}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Click on a municipality area to change your selection. The purple highlighted area shows your current municipality. 
                The municipality name field will not be automatically updated.
              </p>
            </div>
          </div>

          <Separator />

          {/* Municipality Images */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Municipality Images</h3>
              <Badge variant="outline" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Images can be updated anytime
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload and manage your municipality's official images. These will be used for certificates, ID cards, and official documents. <span className="text-red-500 font-medium">* Logos are required and cannot be deleted.</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="municipalityLogoPath" className="text-sm font-medium">
                    Municipality Logo <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Official logo used on certificates and documents <span className="text-red-500">*</span>
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id="municipalityLogoPath"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(
                        "municipalityLogoPath",
                        e.target.files[0]
                      )
                    }
                    className="hidden"
                  />
                  <label
                    htmlFor="municipalityLogoPath"
                    className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                  >
                    {imagePreviews.municipalityLogoPath ? (
                      <>
                        <img
                          src={imagePreviews.municipalityLogoPath}
                          alt="Logo preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                            <Upload className="h-6 w-6 mx-auto mb-1" />
                            <span className="text-xs">Change Logo</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-700">
                        <Upload className="h-8 w-8 mb-2" />
                        <span className="text-sm font-medium">Upload Logo</span>
                        <span className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</span>
                      </div>
                    )}
                  </label>

                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="idBackgroundFrontPath" className="text-sm font-medium">
                    ID Background Front
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Front side background for resident ID cards
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id="idBackgroundFrontPath"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(
                        "idBackgroundFrontPath",
                        e.target.files[0]
                      )
                    }
                    className="hidden"
                  />
                  <label
                    htmlFor="idBackgroundFrontPath"
                    className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                  >
                    {imagePreviews.idBackgroundFrontPath ? (
                      <>
                        <img
                          src={imagePreviews.idBackgroundFrontPath}
                          alt="ID Front preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                            <Upload className="h-6 w-6 mx-auto mb-1" />
                            <span className="text-xs">Change Image</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-700">
                        <Upload className="h-8 w-8 mb-2" />
                        <span className="text-sm font-medium">Upload ID Front</span>
                        <span className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</span>
                      </div>
                    )}
                  </label>
                  {imagePreviews.idBackgroundFrontPath && (
                    <button
                      onClick={() => handleRemoveImage("idBackgroundFrontPath")}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors duration-200 shadow-lg"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="idBackgroundBackPath" className="text-sm font-medium">
                    ID Background Back
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Back side background for resident ID cards
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    id="idBackgroundBackPath"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageChange(
                        "idBackgroundBackPath",
                        e.target.files[0]
                      )
                    }
                    className="hidden"
                  />
                  <label
                    htmlFor="idBackgroundBackPath"
                    className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                  >
                    {imagePreviews.idBackgroundBackPath ? (
                      <>
                        <img
                          src={imagePreviews.idBackgroundBackPath}
                          alt="ID Back preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                            <Upload className="h-6 w-6 mx-auto mb-1" />
                            <span className="text-xs">Change Image</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-700">
                        <Upload className="h-8 w-8 mb-2" />
                        <span className="text-sm font-medium">Upload ID Back</span>
                        <span className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</span>
                      </div>
                    )}
                  </label>
                  {imagePreviews.idBackgroundBackPath && (
                    <button
                      onClick={() => handleRemoveImage("idBackgroundBackPath")}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors duration-200 shadow-lg"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Save className="h-4 w-4" />
                              {loading ? (
                  <LoadingSpinner message="Saving..." variant="default" size="sm" compact={true} />
                ) : (
                  "Save Municipality Settings"
                )}
            </Button>
          </div>
        </form>
      );
    }

    // Barangay Setup Form
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Barangay Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Barangay Information</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Barangay Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter barangay name"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="code">Barangay Code</Label>
              <Input
                id="code"
                {...register("code")}
                placeholder="Enter barangay code"
                className={errors.code ? "border-red-500" : ""}
              />
              {errors.code && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.code.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="Enter email address"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                {...register("contact")}
                placeholder="Enter contact number"
                className={errors.contact ? "border-red-500" : ""}
              />
              {errors.contact && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.contact.message}
                </p>
              )}
            </div>
          </div>

        </div>

        <Separator />

        {/* Barangay Selection Map */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Barangay Location</h3>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Select Barangay from Map
            </Label>
            <MunicipalityBarangaysMap
              onBarangaySelect={useCallback((barangayData) => {
                setSelectedBarangay(barangayData);
                // Don't automatically update the form field - let user manually enter the name
              }, [])}
              selectedBarangayId={selectedBarangay?.gis_code || null} // Show selected barangay
              existingBarangayId={existingBarangayId} // Auto-highlight existing barangay
              municipalityId={municipalityCode}
            />

            {selectedBarangay && selectedBarangay.gis_code !== existingBarangayId && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">
                  New Selection: {selectedBarangay.name}
                </p>
                <p className="text-xs text-green-600">
                  GIS Code: {selectedBarangay.gis_code}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Click on a barangay area to change your selection. The purple highlighted area shows your current barangay. 
              The barangay name field will not be automatically updated.
            </p>
          </div>
        </div>

        <Separator />

        {/* Barangay Images */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Barangay Images</h3>
            <Badge variant="outline" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Images can be updated anytime
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload and manage your barangay's official images. These will be used for certificates, ID cards, and official documents. <span className="text-red-500 font-medium">* Logos are required and cannot be deleted.</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Barangay Logo */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="barangayLogo" className="text-sm font-medium">
                  Barangay Logo <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Official logo used on certificates and documents <span className="text-red-500">*</span>
                </p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  id="barangayLogo"
                  accept="image/*"
                  onChange={(e) => handleImageChange("logo", e.target.files[0])}
                  className="hidden"
                />
                <label
                  htmlFor="barangayLogo"
                  className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  {imagePreviews.logo ? (
                    <>
                      <img
                        src={imagePreviews.logo}
                        alt="Logo preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                          <Upload className="h-6 w-6 mx-auto mb-1" />
                          <span className="text-xs">Change Image</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-700">
                      <Upload className="h-8 w-8 mb-2" />
                      <span className="text-sm font-medium">Upload Logo</span>
                      <span className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</span>
                    </div>
                  )}
                </label>

              </div>
            </div>

            {/* Certificate Background */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="certificate" className="text-sm font-medium">
                  Certificate Background
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Background image for official certificates
                </p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  id="certificate"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageChange("certificate", e.target.files[0])
                  }
                  className="hidden"
                />
                <label
                  htmlFor="certificate"
                  className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  {imagePreviews.certificate ? (
                    <>
                      <img
                        src={imagePreviews.certificate}
                        alt="Certificate preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                          <Upload className="h-6 w-6 mx-auto mb-1" />
                          <span className="text-xs">Change Image</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-700">
                      <Upload className="h-8 w-8 mb-2" />
                      <span className="text-sm font-medium">Upload Certificate</span>
                      <span className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</span>
                    </div>
                  )}
                </label>
                {imagePreviews.certificate && (
                  <button
                    onClick={() => handleRemoveImage("certificate")}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors duration-200 shadow-lg"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Organizational Chart */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="orgChart" className="text-sm font-medium">
                  Organizational Chart
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Chart showing barangay officials structure
                </p>
              </div>
              <div className="relative">
                <input
                  type="file"
                  id="orgChart"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageChange("orgChart", e.target.files[0])
                  }
                  className="hidden"
                />
                <label
                  htmlFor="orgChart"
                  className="group relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  {imagePreviews.orgChart ? (
                    <>
                      <img
                        src={imagePreviews.orgChart}
                        alt="Org Chart preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                          <Upload className="h-6 w-6 mx-auto mb-1" />
                          <span className="text-xs">Change Image</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-700">
                      <Upload className="h-8 w-8 mb-2" />
                      <span className="text-sm font-medium">Upload Org Chart</span>
                      <span className="text-xs text-gray-400">PNG, JPG, WebP up to 5MB</span>
                    </div>
                  )}
                </label>
                {imagePreviews.orgChart && (
                  <button
                    onClick={() => handleRemoveImage("orgChart")}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors duration-200 shadow-lg"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Save className="h-4 w-4" />
                            {loading ? (
                  <LoadingSpinner message="Saving..." variant="default" size="sm" compact={true} />
                ) : (
                  "Save Barangay Settings"
                )}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your organization's configuration and preferences
          </p>
        </div>
        <RefreshControls
          variant="outline"
          size="sm"
        />
      </div>

             {/* Settings Tabs */}
       <Tabs
         value={activeTab}
         onValueChange={setActiveTab}
         className="space-y-6"
       >
         {/* Mobile: Dropdown Select */}
         <div className="sm:hidden">
           <Select value={activeTab} onValueChange={setActiveTab}>
             <SelectTrigger className="w-full">
               <SelectValue placeholder="Select tab" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="setup">
                 <div className="flex items-center gap-2">
                   <Building2 className="h-4 w-4" />
                   Setup
                 </div>
               </SelectItem>
               {isBarangay && (
                 <SelectItem value="classification">
                   <div className="flex items-center gap-2">
                     <FileText className="h-4 w-4" />
                     Classification
                   </div>
                 </SelectItem>
               )}
               {isMunicipality && (
                 <SelectItem value="bulk-id">
                   <div className="flex items-center gap-2">
                     <CreditCard className="h-4 w-4" />
                     Bulk ID
                   </div>
                 </SelectItem>
               )}
               <SelectItem value="interface">
                 <div className="flex items-center gap-2">
                   <Monitor className="h-4 w-4" />
                   Interface
                 </div>
               </SelectItem>
               {isBarangay && (
                 <SelectItem value="danger">
                   <div className="flex items-center gap-2">
                     <AlertTriangle className="h-4 w-4" />
                     Danger Zone
                   </div>
                 </SelectItem>
               )}
             </SelectContent>
           </Select>
         </div>
         
         {/* Desktop: Original Tabs */}
         <TabsList
           className={`hidden sm:grid w-full ${
             isBarangay ? "grid-cols-4" : "grid-cols-3"
           }`}
         >
           <TabsTrigger value="setup" className="flex items-center gap-2">
             <Building2 className="h-4 w-4" />
             Setup
           </TabsTrigger>
           {isBarangay && (
             <TabsTrigger
               value="classification"
               className="flex items-center gap-2"
             >
               <FileText className="h-4 w-4" />
               Classification
             </TabsTrigger>
           )}
           {isMunicipality && (
             <TabsTrigger value="bulk-id" className="flex items-center gap-2">
               <CreditCard className="h-4 w-4" />
               Bulk ID
             </TabsTrigger>
           )}
           <TabsTrigger value="interface" className="flex items-center gap-2">
             <Monitor className="h-4 w-4" />
             Interface
           </TabsTrigger>
           {isBarangay && (
             <TabsTrigger
               value="danger"
               className="flex items-center gap-2 text-red-600"
             >
               <AlertTriangle className="h-4 w-4" />
               Danger Zone
             </TabsTrigger>
           )}
         </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">
                      Organization Information
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Update your organization's basic details and contact
                      information
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {isMunicipality ? "Municipality" : "Barangay"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <SetupForm />
            </CardContent>
          </Card>
        </TabsContent>

                {/* Classification Tab (Barangay Only) */}
        {isBarangay && (
          <TabsContent value="classification" className="space-y-6">
            <ClassificationTypeManager municipalityId={municipalityIdForClassification} />
          </TabsContent>
        )}

        {/* Bulk ID Tab (Municipality Only) */}
        {isMunicipality && (
          <TabsContent value="bulk-id" className="space-y-6">
            <BulkIDPage />
          </TabsContent>
        )}

        {/* Danger Zone Tab (Barangay Only) */}
        {isBarangay && (
          <TabsContent value="danger" className="space-y-6">
            <Card className="border-0 shadow-sm bg-white border-red-200">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl text-red-900">
                      Danger Zone
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-red-700">
                      Irreversible actions that will permanently delete data
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Export Data Section */}
                  <div className="border border-blue-200 rounded-lg p-4 sm:p-6 bg-blue-50">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">
                          Export All Data
                        </h3>
                        <p className="text-xs sm:text-sm text-blue-700 mb-4">
                          Download a complete backup of all barangay data in
                          Excel format including residents, households,
                          officials, documents, statistics, and vaccination
                          records. Data will be organized in separate worksheets
                          for easy analysis.
                        </p>
                        <div className="text-xs sm:text-sm text-blue-600 space-y-1">
                          <p>• All resident records and information</p>
                          <p>• Complete household data and family structures</p>
                          <p>• Official records and positions</p>
                          <p>• Documents and archives</p>
                          <p>• Statistics and reports</p>
                          <p>• Data will be exported as a ZIP file</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsExportDataDialogOpen(true)}
                        className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4" />
                        Export Data
                      </Button>
                    </div>
                  </div>

                  {/* Delete Barangay Section */}
                  <div className="border border-red-200 rounded-lg p-4 sm:p-6 bg-red-50">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-red-900 mb-2">
                          Delete Barangay
                        </h3>
                        <p className="text-xs sm:text-sm text-red-700 mb-4">
                          Permanently delete this barangay and all associated
                          data including residents, households, officials, and
                          records. This action cannot be undone.
                        </p>
                        <div className="text-xs sm:text-sm text-red-600 space-y-1">
                          <p>
                            • All resident records will be permanently deleted
                          </p>
                          <p>• All household data will be lost</p>
                          <p>• All official records will be removed</p>
                          <p>• All documents and archives will be deleted</p>
                          <p>• All statistics and reports will be lost</p>
                        </div>
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs sm:text-sm text-yellow-800">
                            <strong>⚠️ Important:</strong> Before deleting,
                            consider exporting all data using the option above
                            to create a backup.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setIsDeleteBarangayDialogOpen(true)}
                        className="flex items-center gap-2 w-full sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Barangay
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Interface Tab */}
        <TabsContent value="interface" className="space-y-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Monitor className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl">Interface Settings</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Customize your user experience with accessibility and
                    display options
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Font Size Control */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Type className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-900">
                      Font Size
                    </label>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Adjust the base font size for better readability
                    </p>
                  </div>
                  <div className="text-sm font-medium text-gray-900 min-w-[3rem] text-center">
                    {fontSize}px
                  </div>
                </div>
                <div className="px-4">
                  <Slider
                    value={[fontSize]}
                    onValueChange={(value) => setFontSize(value[0])}
                    max={24}
                    min={12}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* High Contrast Toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Palette className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      High Contrast Mode
                    </label>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Increase contrast for better visibility
                    </p>
                  </div>
                </div>
                <Switch
                  checked={highContrast}
                  onCheckedChange={setHighContrast}
                />
              </div>

              <Separator />

              {/* Reduced Motion Toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                  <div>
                    <label className="text-sm font-medium text-gray-900">
                      Reduced Motion
                    </label>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Minimize animations and transitions
                    </p>
                  </div>
                </div>
                <Switch
                  checked={reducedMotion}
                  onCheckedChange={setReducedMotion}
                />
              </div>

              <Separator />

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={saveInterfacePreferences}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Save className="h-4 w-4" />
                  Save Interface Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>



      {/* Export Data Confirmation Dialog */}
      <Dialog
        open={isExportDataDialogOpen}
        onOpenChange={setIsExportDataDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-blue-600" />
              <span>Export All Data</span>
            </DialogTitle>
            <DialogDescription>
              Download a complete backup of all barangay data in Excel format
              with organized worksheets. This may take a few moments depending
              on the amount of data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* What's Included */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                📊 Data Included in Excel Export
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>
                  • <strong>Summary:</strong> Overview of all exported data with
                  record counts
                </p>
                <p>
                  • <strong>Barangay Info:</strong> Basic barangay information
                </p>
                <p>
                  • <strong>Residents:</strong> Complete resident records and
                  personal information
                </p>
                <p>
                  • <strong>Households:</strong> Household data and family
                  structures
                </p>
                <p>
                  • <strong>Officials:</strong> Official records and positions
                </p>
                <p>
                  • <strong>Puroks:</strong> Purok subdivisions and leaders
                </p>
                <p>
                  • <strong>Classifications:</strong> Resident classification
                  data
                </p>
                <p>
                  • <strong>Pets:</strong> Pet registrations and information
                </p>
                <p>
                  • <strong>Vaccines:</strong> Vaccination records for residents
                  and pets
                </p>
                <p>
                  • <strong>Archives:</strong> Documents and archives
                </p>
                <p>
                  • <strong>Inventories:</strong> Barangay inventory items
                </p>
                <p>
                  • <strong>Requests:</strong> Service requests and certificates
                </p>
              </div>
            </div>

            {/* File Information */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>File Format:</strong> ZIP archive containing Excel
                workbook with multiple worksheets and document attachments
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Filename:</strong> barangay-data-export-YYYY-MM-DD.zip
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Excel Sheets:</strong> Summary, Barangay Info,
                Residents, Households, Officials, Pets, Vaccines, and more
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsExportDataDialogOpen(false)}
                disabled={exportLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportData}
                disabled={exportLoading}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                <span>
                                  {exportLoading ? (
                  <LoadingSpinner message="Exporting..." variant="default" size="sm" compact={true} />
                ) : (
                  "Export Data"
                )}
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Barangay Confirmation Dialog */}
      <Dialog
        open={isDeleteBarangayDialogOpen}
        onOpenChange={setIsDeleteBarangayDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span>Delete Barangay</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this barangay? This action cannot
              be undone and will permanently remove all data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Warning */}
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <h4 className="font-semibold text-destructive mb-2">
                ⚠️ Irreversible Action
              </h4>
              <div className="text-sm text-destructive space-y-1">
                <p>• All resident records will be permanently deleted</p>
                <p>• All household data will be lost</p>
                <p>• All official records will be removed</p>
                <p>• All documents and archives will be deleted</p>
                <p>• All statistics and reports will be lost</p>
                <p>• You will be logged out immediately</p>
              </div>
            </div>

            {/* Final Confirmation */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Final Warning:</strong> This action will completely
                remove the barangay from the system. Please ensure you have
                backed up any important data before proceeding.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteBarangayDialogOpen(false)}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteBarangayConfirm}
                disabled={loading}
                className="flex items-center space-x-2 w-full sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                <span>
                                  {loading ? (
                  <LoadingSpinner message="Deleting..." variant="default" size="sm" compact={true} />
                ) : (
                  "Delete Barangay"
                )}
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
