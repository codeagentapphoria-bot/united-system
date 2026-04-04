import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Home,
  Settings,
  Zap,
  Users,
  MapPin,
  Edit,
  Info,
  User,
  Building,
  Phone,
  Mail,
  Trash,
  MoreHorizontal,
  Image,
  Maximize2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import LeafletMap from "@/components/common/LeafletMap";
import BarangayBoundaryMap from "@/components/common/BarangayBoundaryMap";
import FamilyManagementDialog from "./FamilyManagementDialog";
import PetList from "@/features/pets/components/PetList";
import ResidentViewDialog from "@/features/barangay/residents/components/ResidentViewDialog";
import {
  sexOptions,
  civilStatusOptions,
  employmentStatusOptions,
  educationAttainmentOptions,
  residentStatusOptions,
  indigenousPersonOptions,
} from "@/features/barangay/residents/constant/options";
import api from "@/utils/api";
import QRCode from "qrcode";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const ESERVICE_SERVER_URL =
  import.meta.env.VITE_ESERVICE_SERVER_URL || "http://localhost:3000";

// Resolve a stored household image path/filename to a full URL.
// E-Services uploads are stored as absolute paths like "/uploads/images/..."
// BIMS uploads are stored as bare filenames like "household-xxx.jpg"
const resolveHouseholdImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return `${ESERVICE_SERVER_URL}${image}`;
  return `${SERVER_URL}/uploads/households/${image}`;
};

const HouseholdViewDialog = ({
  household,
  open,
  onOpenChange,
  onEdit,
  onEditInfo,
  onEditDetails,
  onEditFamilies,
  onEditLocation,
  onEditImages,
  onDelete,
  loading = false,
  hideActions = false,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Ensure activeTab is always valid - but don't reset if it's already valid
  useEffect(() => {
    const validTabs = ["overview", "families", "location", "images", "pets"];
    if (!validTabs.includes(activeTab)) {
      setActiveTab("overview");
    }
  }, []); // Only run once on mount, not on every activeTab change
  const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
  const [isResidentViewDialogOpen, setIsResidentViewDialogOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [viewResidentLoading, setViewResidentLoading] = useState(false);
  const [viewResidentError, setViewResidentError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Separate tab state for resident modal
  const [residentModalTab, setResidentModalTab] = useState("info");
  
  // Force re-render state (removed - using activeTab approach instead)
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  
  // Additional state for ResidentViewDialog
  const [householdInfo, setHouseholdInfo] = useState(null);
  const [barangayData, setBarangayData] = useState(null);
  const [municipalityData, setMunicipalityData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [punongBarangay, setPunongBarangay] = useState(null);
  const [punongBarangayLoading, setPunongBarangayLoading] = useState(false);
  const [idTabLoading, setIdTabLoading] = useState(false);
  const [idTabError, setIdTabError] = useState("");
  const [classificationOptions, setClassificationOptions] = useState([]);

  // Helper: encrypt resident ID (simple base64 for demo, replace with real encryption if needed)
  const encryptId = (id) => btoa(id);

  const formatLabel = (text) => {
    if (!text) return "-";
    if (typeof text !== "string") {
      text = String(text);
    }
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const formatDateLong = (dateString) => {
    if (!dateString) return "Not provided";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const getAge = (birthdate) => {
    if (!birthdate) return "N/A";
    try {
      const today = new Date();
      const birth = new Date(birthdate);
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    } catch (error) {
      return "N/A";
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "deceased":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getDetailLabel = (type, key, options) => {
    if (!options || !Array.isArray(options)) return key;
    const option = options.find((opt) => opt.value === key);
    return option ? option.label : key;
  };

  const handleResidentClick = async (resident, event) => {
    console.log("👤 CLICKING family member:", resident);
    console.log("👤 Current household prop before click:", household);
    console.log("👤 Current open state before click:", open);
    
    // Prevent event bubbling to parent elements
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    setViewResidentLoading(true);
    setViewResidentError("");
    setSelectedResident(null);
    // Don't open the dialog yet - wait for all data to be loaded
    
    try {
      // Fetch resident data
      const res = await api.get(`/${resident.fm_member_id}/resident`);
      const residentData = res.data.data;
      setSelectedResident(residentData);
      
      // Fetch household info
      if (residentData.household_id) {
        try {
          const householdRes = await api.get(`/${residentData.household_id}/household`);
          setHouseholdInfo(householdRes.data.data);
        } catch (err) {
          console.error("Error fetching household info:", err);
        }
      }
      
      // Fetch barangay data using correct endpoint
      try {
        const barangayRes = await api.get(`/${residentData.barangay_id}/barangay`);
        let barangay = null;
        if (barangayRes.data && barangayRes.data.data) {
          barangay = barangayRes.data.data;
        } else if (barangayRes.data) {
          barangay = barangayRes.data;
        }
        setBarangayData(barangay);
        
        // Fetch municipality data using barangay's municipality_id
        let municipalityId = null;
        if (barangay && (barangay.municipality_id || barangay.municipalityId)) {
          municipalityId = barangay.municipality_id || barangay.municipalityId;
        }
        if (municipalityId) {
          try {
            const muniRes = await api.get(`/municipality/${municipalityId}`);
            let muni = null;
            if (muniRes.data && muniRes.data.data) {
              muni = muniRes.data.data;
            } else if (muniRes.data) {
              muni = muniRes.data;
            }
            setMunicipalityData(muni);
          } catch (error) {
            console.error("Error fetching municipality:", error);
            setMunicipalityData(null);
          }
        } else {
          setMunicipalityData(null);
        }
      } catch (err) {
        console.error("Error fetching barangay data:", err);
      }
      
      // Fetch punong barangay from officials list
      setPunongBarangayLoading(true);
      try {
        const officialsRes = await api.get(`/list/${residentData.barangay_id}/official`);
        let pb = null;
        if (officialsRes.data && officialsRes.data.data) {
          // Try exact match first
          pb = officialsRes.data.data.find(
            (official) =>
              official.position === "Barangay Captain (Punong Barangay)"
          );

          // If not found, try partial match
          if (!pb) {
            pb = officialsRes.data.data.find(
              (official) =>
                official.position &&
                official.position.toLowerCase().includes("punong barangay")
            );
          }
        }
        setPunongBarangay(pb);
      } catch (err) {
        console.error("Error fetching punong barangay:", err);
        setPunongBarangay(null);
      } finally {
        setPunongBarangayLoading(false);
      }
      
      // Generate QR code
      const encryptedId = encryptId(residentData.resident_id);
      const qr = await QRCode.toDataURL(encryptedId, {
        width: 120,
        margin: 1,
      });
      setQrCodeUrl(qr);
      
      // Now open the dialog after all data is loaded
      setIsResidentViewDialogOpen(true);
      
    } catch (err) {
      console.error("Error fetching resident info:", err);
      setViewResidentError("Failed to fetch resident info.");
    } finally {
      setViewResidentLoading(false);
      console.log("👤 After resident click - household prop:", household);
      console.log("👤 After resident click - open state:", open);
    }
  };

  const getElectricityColor = (electricity) => {
    return electricity === "Yes" ? "default" : "secondary";
  };

  const fetchPets = async () => {
    if (!household?.household_id) return;

    setPetsLoading(true);
    try {
      const response = await api.get(
        `/household/${household.household_id}/pets`
      );
      setPets(response.data.data || []);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to fetch pets:", error);
}
      setPets([]);
    } finally {
      setPetsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "pets") {
      fetchPets();
    }
  }, [activeTab, household?.household_id]);

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => {
        // Prevent main dialog from closing if resident modal is open
        if (open === false && isResidentViewDialogOpen) {
          return;
        }
        
        onOpenChange(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader
            className={
              hideActions ? "" : "flex flex-row items-center justify-between pr-4"
            }
          >
            <DialogTitle>Household Information</DialogTitle>
            <DialogDescription>
              View detailed information about the household and its families
            </DialogDescription>
            {!hideActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditDetails?.(household)}>
                    <Settings className="h-4 w-4 mr-2" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditImages?.(household)}>
                    <Image className="h-4 w-4 mr-2" /> Edit Images
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditFamilies?.(household)}>
                    <Users className="h-4 w-4 mr-2" /> Edit Families
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditLocation?.(household)}>
                    <MapPin className="h-4 w-4 mr-2" /> Edit Location
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => onDelete?.(household)}
                  >
                    <Trash className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></span>
            </div>
          ) : !household ? (
            <div className="text-center text-muted-foreground py-8">
              No household data available
            </div>
          ) : (
            <div className="space-y-6">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                {/* Mobile Select Dropdown */}
                <div className="sm:hidden mb-4">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a tab" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">Overview</SelectItem>
                      <SelectItem value="details">Details</SelectItem>
                      <SelectItem value="families">Families</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="images">Images</SelectItem>
                      <SelectItem value="pets">Pets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Desktop Tabs */}
                <TabsList className="hidden sm:flex gap-2 mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="families">Families</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="images">Images</TabsTrigger>
                  <TabsTrigger value="pets">Pets</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="space-y-6">
                    {/* Header with main info and household image */}
                    <div className="flex items-start gap-6 mb-6">
                      {/* Household Image */}
                      <div className="flex-shrink-0">
                        {(() => {
                          // Parse household_image_path to get the first image
                          let images = [];
                          if (household.household_image_path) {
                            if (typeof household.household_image_path === "string") {
                              try {
                                images = JSON.parse(household.household_image_path);
                              } catch (error) {
                                images = [];
                              }
                            } else if (Array.isArray(household.household_image_path)) {
                              images = household.household_image_path;
                            }
                          }
                          const firstImage = images && images.length > 0 ? images[0] : null;

                          return firstImage ? (
                            <div 
                              className="w-32 h-32 rounded-lg overflow-hidden border-4 border-primary bg-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 relative group"
                              onClick={() => household && setSelectedImage(firstImage)}
                            >
                              <img
                                src={resolveHouseholdImageUrl(firstImage)}
                                alt={`${household.house_head || 'Household'} - Household Image`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                                <Home className="h-8 w-8" />
                              </div>
                              {/* Overlay with maximize icon on hover */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Maximize2 className="h-8 w-8 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-32 h-32 rounded-lg border-4 border-muted bg-muted/20 flex items-center justify-center shadow-lg">
                              <div className="text-center">
                                <Home className="h-16 w-16 text-muted-foreground/50 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">No photo</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Household Info */}
                      <div className="flex-1">
                        <div className="text-2xl font-bold mb-2">
                          {household.house_head || "No House Head"}
                        </div>
                        <div className="text-muted-foreground text-sm flex items-center gap-2 mb-1">
                          <Building className="h-4 w-4 text-primary" />
                          {[household.house_number, household.street].filter(Boolean).join(', ') || (
                            <span className="italic text-xs">No address</span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-sm flex items-center gap-2 mb-3">
                          <MapPin className="h-4 w-4 text-primary" />
                          {household.barangay_name || "No barangay"}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={getElectricityColor(household.electricity)}>
                            {formatLabel(household.electricity) || "No electricity info"}
                          </Badge>
                          {household.families && household.families.length > 0 && (
                            <Badge variant="outline">
                              {household.families.length} Family{household.families.length > 1 ? "ies" : ""}
                            </Badge>
                          )}
                          {household.total_monthly_income && (
                            <Badge variant="secondary">
                              ₱{parseFloat(household.total_monthly_income || 0).toLocaleString()}/mo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick stats grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="!pb-1">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            House Head
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          <div className="text-lg font-semibold">
                            {formatLabel(household.house_head) ||
                              "Not specified"}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            Electricity
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          <Badge
                            variant={getElectricityColor(household.electricity)}
                          >
                            {formatLabel(household.electricity) ||
                              "Not specified"}
                          </Badge>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="!pb-1">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Family Groups
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          <div className="text-lg font-semibold">
                            {household.families ? household.families.length : 0}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="!pb-1">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            Total Monthly Income
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          <div className="text-lg font-semibold text-green-600">
                            ₱
                            {parseFloat(
                              household.total_monthly_income || 0
                            ).toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details">
                  <div className="space-y-4">
                    {/* Compact header with household picture */}
                    <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                      <div className="flex-shrink-0">
                        {(() => {
                          // Parse household_image_path to get the first image
                          let images = [];
                          if (household.household_image_path) {
                            if (typeof household.household_image_path === "string") {
                              try {
                                images = JSON.parse(household.household_image_path);
                              } catch (error) {
                                images = [];
                              }
                            } else if (Array.isArray(household.household_image_path)) {
                              images = household.household_image_path;
                            }
                          }
                          const firstImage = images && images.length > 0 ? images[0] : null;

                          return firstImage ? (
                            <div 
                              className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                              onClick={() => household && setSelectedImage(firstImage)}
                            >
                              <img
                                src={resolveHouseholdImageUrl(firstImage)}
                                alt={`${household.house_head || 'Household'} - Household Image`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                                <Home className="h-6 w-6" />
                              </div>
                              {/* Overlay with maximize icon on hover */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Maximize2 className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                              <Home className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {household.house_head || "Household"}
                        </h3>
                        <p className="text-sm text-muted-foreground">Household Details</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-primary" />
                            Basic Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 !pt-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-semibold">House Head:</span>
                            <span className="ml-1">
                              {formatLabel(household.house_head) || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="font-semibold">House Number:</span>
                            <span className="ml-1">
                              {household.house_number || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Street:</span>
                            <span className="ml-1">
                              {household.street || "-"}
                            </span>
                          </div>
                          {/* purok_name removed — puroks table dropped in v2 */}
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Barangay:</span>
                            <span className="ml-1">
                              {household.barangay_name || "-"}
                            </span>
                          </div>
                          {household.area && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Area:</span>
                              <span className="ml-1">{household.area} sqm</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Housing Details */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Housing Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 !pt-0">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Housing Type:</span>
                            <span className="ml-1">
                              {formatLabel(household.housing_type) || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="font-semibold">
                              Structure Type:
                            </span>
                            <span className="ml-1">
                              {formatLabel(household.structure_type) || "-"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Utilities */}
                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary" />
                            Utilities
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              <span className="font-semibold">
                                Electricity:
                              </span>
                              <Badge
                                variant={getElectricityColor(
                                  household.electricity
                                )}
                                className="ml-1"
                              >
                                {formatLabel(household.electricity) || "-"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-primary" />
                              <span className="font-semibold">
                                Water Source:
                              </span>
                              <span className="ml-1">
                                {household.water_source || "-"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-primary" />
                              <span className="font-semibold">
                                Toilet Facility:
                              </span>
                              <span className="ml-1">
                                {household.toilet_facility || "-"}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Families Tab */}
                <TabsContent value="families">
                  <div className="space-y-4">
                    {/* Compact header with household picture */}
                    <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                      <div className="flex-shrink-0">
                        {(() => {
                          // Parse household_image_path to get the first image
                          let images = [];
                          if (household.household_image_path) {
                            if (typeof household.household_image_path === "string") {
                              try {
                                images = JSON.parse(household.household_image_path);
                              } catch (error) {
                                images = [];
                              }
                            } else if (Array.isArray(household.household_image_path)) {
                              images = household.household_image_path;
                            }
                          }
                          const firstImage = images && images.length > 0 ? images[0] : null;

                          return firstImage ? (
                            <div 
                              className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                              onClick={() => household && setSelectedImage(firstImage)}
                            >
                              <img
                                src={resolveHouseholdImageUrl(firstImage)}
                                alt={`${household.house_head || 'Household'} - Household Image`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                                <Home className="h-6 w-6" />
                              </div>
                              {/* Overlay with maximize icon on hover */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Maximize2 className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                              <Home className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {household.house_head || "Household"}
                        </h3>
                        <p className="text-sm text-muted-foreground">Family Groups</p>
                      </div>
                    </div>

                    {household.families &&
                    Array.isArray(household.families) &&
                    household.families.length > 0 ? (
                      <div className="space-y-4">
                        {household.families.map((family, index) => (
                          <Card key={family.family_id}>
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Users className="h-5 w-5 text-primary" />
                                  {family.family_group}
                                </div>
                                <Badge variant="outline">
                                  Family {index + 1}
                                </Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 !pt-0">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">
                                  Family Head
                                </Label>
                                <p className="text-lg font-medium">
                                  {family.family_head || "N/A"}
                                </p>
                              </div>

                              {family.members && family.members.length > 0 && (
                                <div>
                                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                                    Family Members ({family.members.length})
                                  </Label>
                                  <div className="space-y-2">
                                    {family.members.map(
                                      (member, memberIndex) => (
                                        <div
                                          key={member.fm_id}
                                          className="flex items-center justify-between p-2 bg-muted/30 rounded border cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all duration-200"
                                          onClick={(event) => handleResidentClick(member, event)}
                                        >
                                          <div>
                                            <p className="font-medium">
                                              {member.fm_member}
                                            </p>
                                            {member.fm_relationship_to_fm_head && (
                                              <p className="text-sm text-muted-foreground">
                                                {
                                                  member.fm_relationship_to_fm_head
                                                }
                                              </p>
                                            )}
                                          </div>
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            Member {memberIndex + 1}
                                          </Badge>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No family groups found</p>
                        <p className="text-sm">
                          {household.families
                            ? "Click 'Edit Families' to add family members"
                            : "Family data not available"}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Location Tab */}
                <TabsContent value="location">
                  <div className="space-y-4">
                    {/* Compact header with household picture */}
                    <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                      <div className="flex-shrink-0">
                        {(() => {
                          // Parse household_image_path to get the first image
                          let images = [];
                          if (household.household_image_path) {
                            if (typeof household.household_image_path === "string") {
                              try {
                                images = JSON.parse(household.household_image_path);
                              } catch (error) {
                                images = [];
                              }
                            } else if (Array.isArray(household.household_image_path)) {
                              images = household.household_image_path;
                            }
                          }
                          const firstImage = images && images.length > 0 ? images[0] : null;

                          return firstImage ? (
                            <div 
                              className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                              onClick={() => household && setSelectedImage(firstImage)}
                            >
                              <img
                                src={resolveHouseholdImageUrl(firstImage)}
                                alt={`${household.house_head || 'Household'} - Household Image`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                                <Home className="h-6 w-6" />
                              </div>
                              {/* Overlay with maximize icon on hover */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Maximize2 className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                              <Home className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {household.house_head || "Household"}
                        </h3>
                        <p className="text-sm text-muted-foreground">Location Information</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Location Info */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Address Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 !pt-0">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="font-semibold">House Number:</span>
                            <span className="ml-1">
                              {household.house_number || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Street:</span>
                            <span className="ml-1">
                              {household.street || "-"}
                            </span>
                          </div>
                          {/* purok_name removed — puroks table dropped in v2 */}
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Barangay:</span>
                            <span className="ml-1">
                              {household.barangay_name || "-"}
                            </span>
                          </div>
                          {household.area && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Area:</span>
                              <span className="ml-1">{household.area} sqm</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Map Display */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Map Location
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          {household.geom ? (
                            <div className="h-64 rounded-lg overflow-hidden border">
                              <BarangayBoundaryMap
                                center={
                                  typeof household.geom === "string"
                                    ? (() => {
                                        try {
                                          const geoJson = JSON.parse(
                                            household.geom
                                          );
                                          if (
                                            geoJson.type === "Point" &&
                                            geoJson.coordinates
                                          ) {
                                            const [lng, lat] =
                                              geoJson.coordinates;
                                            return [lat, lng];
                                          }
                                        } catch (e) {
                                          const match =
                                            household.geom.match(
                                              /POINT\(([^)]+)\)/
                                            );
                                          if (match) {
                                            const [lng, lat] = match[1]
                                              .split(" ")
                                              .map(Number);
                                            return [lat, lng];
                                          }
                                        }
                                        return [11.6081, 125.4311]; // Default fallback coordinates
                                      })()
                                    : household.geom.lat && household.geom.lng
                                    ? [
                                        Number(household.geom.lat),
                                        Number(household.geom.lng),
                                      ]
                                    : [11.6081, 125.4311]
                                }
                                markers={
                                  household.geom
                                    ? [
                                        {
                                          position:
                                            typeof household.geom === "string"
                                              ? (() => {
                                                  try {
                                                    const geoJson = JSON.parse(
                                                      household.geom
                                                    );
                                                    if (
                                                      geoJson.type ===
                                                        "Point" &&
                                                      geoJson.coordinates
                                                    ) {
                                                      const [lng, lat] =
                                                        geoJson.coordinates;
                                                      return [lat, lng];
                                                    }
                                                  } catch (e) {
                                                    const match =
                                                      household.geom.match(
                                                        /POINT\(([^)]+)\)/
                                                      );
                                                    if (match) {
                                                      const [lng, lat] =
                                                        match[1]
                                                          .split(" ")
                                                          .map(Number);
                                                      return [lat, lng];
                                                    }
                                                  }
                                                  return null;
                                                })()
                                              : household.geom.lat &&
                                                household.geom.lng
                                              ? [
                                                  Number(household.geom.lat),
                                                  Number(household.geom.lng),
                                                ]
                                              : null,
                                          title: `${
                                            household.house_head || "Household"
                                          } - ${household.house_number || ""} ${
                                            household.street || ""
                                          }`,
                                        },
                                      ]
                                    : []
                                }
                                readOnly={true}
                              />
                            </div>
                          ) : (
                            <div className="h-64 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-muted-foreground">
                              <div className="text-center">
                                <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No location data available</p>
                                <p className="text-sm">
                                  Click 'Edit Location' to set the household
                                  location
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">
                        Household Images
                      </h3>
                    </div>

                    {(() => {
                      // Parse household_image_path if it's a string, or use as is if it's already an array
                      let images = [];
                      if (household.household_image_path) {
                        if (
                          typeof household.household_image_path === "string"
                        ) {
                          try {
                            images = JSON.parse(household.household_image_path);
                          } catch (error) {
                            console.warn(
                              "Failed to parse household_image_path:",
                              error
                            );
                            images = [];
                          }
                        } else if (
                          Array.isArray(household.household_image_path)
                        ) {
                          images = household.household_image_path;
                        }
                      }

                      return images && images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {images.map((image, index) => (
                            <div key={index} className="relative group">
                              <div 
                                className="w-full h-32 rounded-lg overflow-hidden border-2 border-primary/20 bg-white cursor-pointer hover:border-primary transition-all duration-200 relative"
                                onClick={() => setSelectedImage(image)}
                              >
                                <img
                                  src={resolveHouseholdImageUrl(image)}
                                  alt={`Household image ${index + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                                  <Home className="h-8 w-8" />
                                </div>
                                {/* Overlay with maximize icon on hover */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-lg">
                                  <Maximize2 className="h-6 w-6 text-white" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No images available</p>
                          <p className="text-sm">
                            {household.household_image_path
                              ? "Click 'Edit Images' to add household photos"
                              : "Image data not available"}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </TabsContent>

                {/* Pets Tab */}
                <TabsContent value="pets">
                  <div className="space-y-4">
                    <PetList pets={pets} loading={petsLoading} />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Image Modal */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {household ? `${household.house_head || 'Household'} - Household Image` : 'Household Image'}
            </DialogTitle>
            <DialogDescription>
              View the household image in full size. Click outside or press the close button to exit.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            {/* Maximized Image */}
            {selectedImage ? (
              <div className="w-full max-h-[90vh] flex items-center justify-center bg-black">
                <img
                  src={resolveHouseholdImageUrl(selectedImage)}
                  alt={`Household image - ${household?.house_head || 'Unknown household'}`}
                  className="max-w-full max-h-[90vh] object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-64 flex items-center justify-center text-white bg-black" style={{ display: 'none' }}>
                  <div className="text-center">
                    <Image className="h-16 w-16 mx-auto mb-2" />
                    <p>Image could not be loaded</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Image className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No image available</p>
                </div>
              </div>
            )}
            
            {/* Image Info Footer */}
            {household && selectedImage && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
                <p className="text-lg font-semibold">
                  {household.house_head ? `${household.house_head}'s Household` : 'Household Image'}
                </p>
                <p className="text-sm text-white/80">
                   {household.house_number ? `House #${household.house_number}` : ''} 
                   {household.street ? ` - ${household.street}` : ''}
                   {/* purok_name removed — puroks table dropped in v2 */}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Family Management Dialog */}
      <FamilyManagementDialog
        household={household}
        open={isFamilyDialogOpen}
        onOpenChange={setIsFamilyDialogOpen}
        onSuccess={() => {
          // Refresh household data or trigger callback
          if (onEdit) {
            // This will trigger a refresh when the dialog closes
            onEdit();
          }
        }}
      />
      
      {/* Resident View Dialog */}
      <ResidentViewDialog
        householdInfo={householdInfo}
        open={isResidentViewDialogOpen}
        onOpenChange={(open) => {
          console.log("👤 Resident modal onOpenChange:", open);
          if (!open) {
            console.log("👤 Closing resident modal, setting isResidentViewDialogOpen to false");
            console.log("👤 Current household data before close:", household);
            setIsResidentViewDialogOpen(false);
            setSelectedResident(null);
            setViewResidentError("");
            setResidentModalTab("info"); // Reset resident modal tab
            // Don't change activeTab here - keep the current tab
            // Force re-render of the household modal
            console.log("👤 Current activeTab before toggle:", activeTab);
            const originalTab = activeTab || "overview"; // Remember the original tab, fallback to overview
            setActiveTab("families");
            setTimeout(() => {
              setActiveTab(originalTab); // Return to the original tab
              console.log("👤 Reset activeTab to original tab:", originalTab);
            }, 50);
            // Don't clear householdInfo, barangayData, municipalityData, etc.
            // as these are only used for the resident modal and shouldn't affect the main household modal
          }
        }}
        viewResident={selectedResident}
        viewResidentLoading={viewResidentLoading}
        viewResidentError={viewResidentError}
        activeTab={residentModalTab}
        setActiveTab={setResidentModalTab}
        idTabLoading={idTabLoading}
        idTabError={idTabError}
        formatLabel={formatLabel}
        formatDateLong={formatDateLong}
        getAge={getAge}
        getStatusColor={getStatusColor}
        classificationOptions={classificationOptions}
        getDetailLabel={getDetailLabel}
        role="barangay"
        sexOptions={sexOptions}
        civilStatusOptions={civilStatusOptions}
        employmentStatusOptions={employmentStatusOptions}
        educationAttainmentOptions={educationAttainmentOptions}
        residentStatusOptions={residentStatusOptions}
        indigenousPersonOptions={indigenousPersonOptions}
        onResidentUpdated={() => {}}
        onEditInfo={() => {}}
        onEditClassifications={() => {}}
        onEditImage={() => {}}
        onEditHouseholds={() => {}}
        barangayData={barangayData}
        municipalityData={municipalityData}
        qrCodeUrl={qrCodeUrl}
        punongBarangay={punongBarangay}
        punongBarangayLoading={punongBarangayLoading}
        handlePrint={() => {}}
        handleDownloadImage={() => {}}
        handleDownloadPDF={() => {}}
        printLoading={false}
        downloadImageLoading={false}
        downloadPDFLoading={false}
        onDelete={() => {}}
        hideActions={true}
      />
    </>
  );
};

export default HouseholdViewDialog;
