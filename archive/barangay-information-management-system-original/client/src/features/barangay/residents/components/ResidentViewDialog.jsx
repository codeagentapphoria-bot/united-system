import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Mail,
  User,
  Info,
  BadgeCheck,
  Calendar,
  Phone,
  Briefcase,
  Home,
  MapPin,
  Pencil,
  Users,
  Edit,
  MoreHorizontal,
  Settings,
  Zap,
  Maximize2,
  X,
} from "lucide-react";
import ResidentIDCard from "./ResidentIDCard";
import ResidentInfoForm from "./ResidentInfoForm";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  civilStatusOptions,
  employmentStatusOptions,
  educationAttainmentOptions,
  sexOptions,
  residentStatusOptions,
  indigenousPersonOptions,
} from "../constant/options";
import { zodResolver } from "@hookform/resolvers/zod";
import { residentSchema } from "@/utils/residentSchema";
import { useHouseholds } from "@/features/household/hooks/useHouseholds";
import PetList from "@/features/pets/components/PetList";
import api from "@/utils/api";

const ResidentViewDialog = ({
  householdInfo,
  open,
  onOpenChange,
  viewResident,
  viewResidentLoading,
  viewResidentError,
  activeTab,
  setActiveTab,
  idTabLoading,
  idTabError,
  barangayData,
  municipalityData,
  qrCodeUrl,
  punongBarangay,
  punongBarangayLoading,
  handlePrint,
  handleDownloadImage,
  handleDownloadPDF,
  printLoading,
  downloadImageLoading,
  downloadPDFLoading,
  formatLabel,
  formatDateLong,
  getAge,
  getStatusColor,
  classificationOptions,
  getDetailLabel,
  role,
  puroks,
  onResidentUpdated,
  sexOptions,
  civilStatusOptions,
  employmentStatusOptions,
  educationAttainmentOptions,
  residentStatusOptions,
  indigenousPersonOptions,
  onEditInfo,
  onEditClassifications,
  onEditImage,
  onEditHouseholds,
  onDelete,
  hideActions = false,
}) => {
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const fetchPets = async () => {
    if (!viewResident?.resident_id) return;

    setPetsLoading(true);
    try {
      const response = await api.get(`/owner/${viewResident.resident_id}/pets`);
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
  }, [activeTab, viewResident?.resident_id]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader
            className={
              hideActions ? "" : "flex flex-row items-center justify-between pr-4"
            }
          >
            <DialogTitle>Resident Information</DialogTitle>
            <DialogDescription>
              View detailed information about the resident
            </DialogDescription>
            {!hideActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" /> Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditInfo?.(viewResident)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit Info
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onEditClassifications?.(viewResident)}
                  >
                    <BadgeCheck className="h-4 w-4 mr-2" /> Edit Classifications
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditImage?.(viewResident)}>
                    <User className="h-4 w-4 mr-2" /> Edit Image
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete?.(viewResident)}
                  >
                    <Users className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </DialogHeader>
          {viewResidentLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></span>
            </div>
          ) : viewResidentError ? (
            <div className="text-center text-destructive py-8">
              {viewResidentError}
            </div>
          ) : (
            viewResident && (
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
                        <SelectValue placeholder="Select tab" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Resident Info</SelectItem>
                        <SelectItem value="classifications">Classifications</SelectItem>
                        <SelectItem value="households">Households</SelectItem>
                        <SelectItem value="residentid">Resident ID</SelectItem>
                        <SelectItem value="pets">Pets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Desktop Tabs */}
                  <div className="hidden sm:block">
                    <TabsList className="flex flex-wrap gap-1 sm:gap-2 mb-4">
                      <TabsTrigger value="info" className="text-xs sm:text-sm">Resident Info</TabsTrigger>
                      <TabsTrigger value="classifications" className="text-xs sm:text-sm">
                        Classifications
                      </TabsTrigger>
                      <TabsTrigger value="households" className="text-xs sm:text-sm">Households</TabsTrigger>
                      <TabsTrigger value="residentid" className="text-xs sm:text-sm">Resident ID</TabsTrigger>
                      <TabsTrigger value="pets" className="text-xs sm:text-sm">Pets</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="info">
                    <div className="space-y-6">
                      {/* Header with main info and resident picture */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6">
                        {/* Resident Picture */}
                        <div className="flex-shrink-0">
                          {viewResident.picture_path ? (
                            <div
                              className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-4 border-primary bg-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 relative group"
                              onClick={() => viewResident && setImageModalOpen(true)}
                            >
                              <img
                                src={`${import.meta.env.VITE_SERVER_URL || "localhost:5000"}/${viewResident.picture_path.replace(/\\/g, "/")}`}
                                alt={`${formatLabel(viewResident.first_name)} ${formatLabel(viewResident.last_name)}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                                <User className="h-8 w-8" />
                              </div>
                              {/* Overlay with maximize icon on hover */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Maximize2 className="h-8 w-8 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border-4 border-muted bg-muted/20 flex items-center justify-center shadow-lg">
                              <div className="text-center">
                                <User className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">No photo</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Resident Info */}
                        <div className="flex-1 text-center sm:text-left">
                          <div className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">
                            {`${formatLabel(viewResident.first_name)} ${viewResident.middle_name
                              ? formatLabel(viewResident.middle_name)
                              : ""
                              } ${formatLabel(viewResident.last_name)}${viewResident.suffix ? ` ${viewResident.suffix}` : ""
                              }`}
                          </div>
                          <div className="text-muted-foreground text-sm flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-primary" />
                            {viewResident.email || (
                              <span className="italic text-xs">No email</span>
                            )}
                          </div>
                          <div className="text-muted-foreground text-sm flex items-center gap-2 mb-3">
                            <Phone className="h-4 w-4 text-primary" />
                            {viewResident.contact_number || (
                              <span className="italic text-xs">No contact</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant={getStatusColor(viewResident.resident_status)}
                            >
                              {formatLabel(viewResident.resident_status)}
                            </Badge>
                            <Badge variant="outline">
                              {getAge(viewResident.birthdate)} yrs old
                            </Badge>
                            <Badge variant="secondary">
                              ID: {viewResident.resident_id}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Quick stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        <Card>
                          <CardHeader className="!pb-1">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <User className="h-4 w-4 text-primary" />
                              Sex
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="!pt-0">
                            <div className="text-lg font-semibold">
                              {formatLabel(viewResident.sex) || "Not specified"}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="!pb-1">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <BadgeCheck className="h-4 w-4 text-primary" />
                              Civil Status
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="!pt-0">
                            <div className="text-lg font-semibold">
                              {formatLabel(viewResident.civil_status) ||
                                "Not specified"}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="!pb-1">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-primary" />
                              Occupation
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="!pt-0">
                            <div className="text-lg font-semibold">
                              {formatLabel(viewResident.occupation) ||
                                "Not specified"}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="!pb-1">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              Monthly Income
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="!pt-0">
                            <div className="text-lg font-semibold">
                              {viewResident.monthly_income ? (
                                `₱${parseFloat(viewResident.monthly_income).toLocaleString()}/mo`
                              ) : (
                                "Not specified"
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Detailed Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Info className="h-5 w-5 text-primary" />
                              Personal Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 !pt-0">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Birthdate:</span>
                              <span className="ml-1">
                                {formatDateLong(viewResident.birthdate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Birthplace:</span>
                              <span className="ml-1 capitalize">
                                {formatLabel(viewResident.birthplace) || "-"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Info className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Education:</span>
                              <span className="ml-1 capitalize">
                                {formatLabel(viewResident.education_attainment) ||
                                  "-"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Info className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Employment:</span>
                              <span className="ml-1 capitalize">
                                {formatLabel(viewResident.employment_status) ||
                                  "-"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Monthly Income:</span>
                              <span className="ml-1">
                                {viewResident.monthly_income ? (
                                  `₱${parseFloat(viewResident.monthly_income).toLocaleString()}/mo`
                                ) : (
                                  "-"
                                )}
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Home className="h-5 w-5 text-primary" />
                              Contact Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 !pt-0">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Contact:</span>
                              <span className="ml-1">
                                {viewResident.contact_number || "-"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Email:</span>
                              <span className="ml-1">
                                {viewResident.email || "-"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-semibold">Address:</span>
                              <span className="ml-1">
                                {[
                                  viewResident.house_number,
                                  viewResident.street,
                                  viewResident.purok_name,
                                  viewResident.barangay_name,
                                  viewResident.municipality_name,
                                ]
                                  .filter(Boolean)
                                  .map(formatLabel)
                                  .join(", ") || "-"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="classifications">
                    <div className="space-y-4">
                      {/* Compact header with resident picture */}
                      <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                        <div className="flex-shrink-0">
                          {viewResident.picture_path ? (
                            <div
                              className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                              onClick={() => viewResident && setImageModalOpen(true)}
                            >
                              <img
                                src={`${import.meta.env.VITE_SERVER_URL || "localhost:5000"}/${viewResident.picture_path.replace(/\\/g, "/")}`}
                                alt={`${formatLabel(viewResident.first_name)} ${formatLabel(viewResident.last_name)}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                                <User className="h-6 w-6" />
                              </div>
                              {/* Overlay with maximize icon on hover */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Maximize2 className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                              <User className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">
                            {`${formatLabel(viewResident.first_name)} ${formatLabel(viewResident.last_name)}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">Classifications</p>
                        </div>
                      </div>

                      {Array.isArray(viewResident.classifications) &&
                        viewResident.classifications.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewResident.classifications.map((c, idx) => {
                            let detailsArr = [];
                            if (
                              typeof c.classification_details === "string" &&
                              c.classification_details !== "[]"
                            ) {
                              detailsArr = c.classification_details
                                .split("|")
                                .map((s) => s.trim());
                            } else if (
                              typeof c.classification_details === "object" &&
                              c.classification_details !== null &&
                              !Array.isArray(c.classification_details)
                            ) {
                              detailsArr = Object.entries(
                                c.classification_details
                              ).map(([k, v]) => ({ key: k, value: v }));
                            }
                            const opt = classificationOptions.find(
                              (o) =>
                                formatLabel(o.label) ===
                                formatLabel(c.classification_type) ||
                                formatLabel(o.key) ===
                                formatLabel(c.classification_type)
                            );
                            const detailLabels =
                              opt && opt.details
                                ? opt.details.map((d) => d.label)
                                : [];
                            return (
                              <Card key={idx}>
                                <CardHeader className="!pb-1">
                                  <CardTitle className="flex items-center gap-2">
                                    <BadgeCheck className="h-5 w-5 text-primary" />
                                    {formatLabel(c.classification_type)}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="!pt-0">
                                  {detailsArr.length > 0 ? (
                                    <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                                      {typeof c.classification_details ===
                                        "string" &&
                                        c.classification_details !== "[]"
                                        ? detailsArr.map((val, i) => (
                                          <li key={i}>
                                            <span className="font-semibold">
                                              {detailLabels[i] ||
                                                `Detail ${i + 1}`}
                                              :
                                            </span>{" "}
                                            {formatLabel(val)}
                                          </li>
                                        ))
                                        : detailsArr.map(({ key, value }, i) => (
                                          <li key={key}>
                                            <span className="font-semibold">
                                              {getDetailLabel(
                                                c.classification_type,
                                                key
                                              )}
                                              :
                                            </span>{" "}
                                            {formatLabel(String(value))}
                                          </li>
                                        ))}
                                    </ul>
                                  ) : (
                                    <div className="text-xs text-muted-foreground italic">
                                      No details
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BadgeCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No classifications found</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="households">
                    <div className="space-y-4">
                      {/* Compact header with resident picture */}
                      <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                        <div className="flex-shrink-0">
                          {viewResident.picture_path ? (
                            <div
                              className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                              onClick={() => viewResident && setImageModalOpen(true)}
                            >
                              <img
                                src={`${import.meta.env.VITE_SERVER_URL || "localhost:5000"}/${viewResident.picture_path.replace(/\\/g, "/")}`}
                                alt={`${formatLabel(viewResident.first_name)} ${formatLabel(viewResident.last_name)}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                                <User className="h-6 w-6" />
                              </div>
                              {/* Overlay with maximize icon on hover */}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                <Maximize2 className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                              <User className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">
                            {`${formatLabel(viewResident.first_name)} ${formatLabel(viewResident.last_name)}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">Household Information</p>
                        </div>
                      </div>

                      {householdInfo ? (
                        <>
                          {/* Household Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  <span className="font-semibold">
                                    House Head:
                                  </span>
                                  <span className="ml-1">
                                    {formatLabel(householdInfo.house_head) || "-"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">
                                    House Number:
                                  </span>
                                  <span className="ml-1">
                                    {householdInfo.house_number || "-"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">Street:</span>
                                  <span className="ml-1">
                                    {householdInfo.street || "-"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">Purok:</span>
                                  <span className="ml-1">
                                    {householdInfo.purok_name || "-"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">Barangay:</span>
                                  <span className="ml-1">
                                    {householdInfo.barangay_name || "-"}
                                  </span>
                                </div>
                                {householdInfo.area && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <span className="font-semibold">Area:</span>
                                    <span className="ml-1">
                                      {householdInfo.area} sqm
                                    </span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Settings className="h-5 w-5 text-primary" />
                                  Housing Details
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3 !pt-0">
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">
                                    Housing Type:
                                  </span>
                                  <span className="ml-1">
                                    {formatLabel(householdInfo.housing_type) ||
                                      "-"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-primary" />
                                  <span className="font-semibold">
                                    Structure Type:
                                  </span>
                                  <span className="ml-1">
                                    {formatLabel(householdInfo.structure_type) ||
                                      "-"}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>

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
                                      variant={
                                        householdInfo.electricity === "Yes"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="ml-1"
                                    >
                                      {formatLabel(householdInfo.electricity) ||
                                        "-"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-primary" />
                                    <span className="font-semibold">
                                      Water Source:
                                    </span>
                                    <span className="ml-1">
                                      {householdInfo.water_source || "-"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Home className="h-4 w-4 text-primary" />
                                    <span className="font-semibold">
                                      Toilet Facility:
                                    </span>
                                    <span className="ml-1">
                                      {householdInfo.toilet_facility || "-"}
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Family Groups */}
                          <div className="space-y-4 mt-6">
                            <h4 className="text-md font-semibold flex items-center gap-2">
                              <Users className="h-5 w-5 text-primary" /> Family
                              Groups
                            </h4>
                            {householdInfo.families &&
                              householdInfo.families.length > 0 ? (
                              <div className="space-y-4">
                                {householdInfo.families.map((family, index) => (
                                  <Card key={family.family_id || index}>
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
                                      {family.members &&
                                        family.members.length > 0 && (
                                          <div>
                                            <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                                              Family Members (
                                              {family.members.length})
                                            </Label>
                                            <div className="space-y-2">
                                              {family.members.map(
                                                (member, memberIndex) => (
                                                  <div
                                                    key={
                                                      member.fm_id || memberIndex
                                                    }
                                                    className="flex items-center justify-between p-2 bg-muted/30 rounded border"
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
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No household data yet</p>
                          <p className="text-sm">
                            This resident is not associated with any household
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="residentid">
                    <ResidentIDCard
                      idTabLoading={idTabLoading}
                      idTabError={idTabError}
                      barangayData={barangayData}
                      municipalityData={municipalityData}
                      qrCodeUrl={qrCodeUrl}
                      punongBarangay={punongBarangay}
                      punongBarangayLoading={punongBarangayLoading}
                      viewResident={viewResident}
                      handlePrint={handlePrint}
                      handleDownloadImage={handleDownloadImage}
                      handleDownloadPDF={handleDownloadPDF}
                      printLoading={printLoading}
                      downloadImageLoading={downloadImageLoading}
                      downloadPDFLoading={downloadPDFLoading}
                      formatLabel={formatLabel}
                      formatDateLong={formatDateLong}
                      getAge={getAge}
                      householdInfo={householdInfo}
                    />
                  </TabsContent>

                  {/* Pets Tab */}
                  <TabsContent value="pets">
                    <div className="space-y-4">
                      <PetList pets={pets} loading={petsLoading} />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={imageModalOpen && !!viewResident} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden [&>button:last-child]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {viewResident ? `${formatLabel(viewResident.first_name || '')} ${formatLabel(viewResident.last_name || '')} - Profile Picture` : 'Resident Profile Picture'}
            </DialogTitle>
            <DialogDescription>
              View the resident's profile picture in full size. Click outside or press the close button to exit.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
              onClick={() => setImageModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Maximized Image */}
            {viewResident?.picture_path ? (
              <div className="w-full max-h-[90vh] flex items-center justify-center bg-black">
                <img
                  src={`${import.meta.env.VITE_SERVER_URL || "http://13.211.71.85"}/${viewResident.picture_path.replace(/\\/g, "/")}`}
                  alt={`${formatLabel(viewResident?.first_name || '')} ${formatLabel(viewResident?.last_name || '')}`}
                  className="max-w-full max-h-[90vh] object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-64 flex items-center justify-center text-white bg-black" style={{ display: 'none' }}>
                  <div className="text-center">
                    <User className="h-16 w-16 mx-auto mb-2" />
                    <p>Image could not be loaded</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <User className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No image available</p>
                </div>
              </div>
            )}

            {/* Image Info Footer */}
            {viewResident && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
                <p className="text-lg font-semibold">
                  {`${formatLabel(viewResident.first_name || '')} ${viewResident.middle_name ? formatLabel(viewResident.middle_name) : ""
                    } ${formatLabel(viewResident.last_name || '')}${viewResident.suffix ? ` ${viewResident.suffix}` : ""
                    }`}
                </p>
                <p className="text-sm text-white/80">Resident ID: {viewResident.resident_id || 'N/A'}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ResidentViewDialog;
