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

  const resolvePicture = (path) => {
    if (!path) return null;
    const normalized = path.replace(/\\/g, "/");
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
    const base = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
    return `${base}/${normalized}`;
  };

  const fetchPets = async () => {
    if (!viewResident?.id) return;

    setPetsLoading(true);
    try {
      const response = await api.get(`/owner/${viewResident.id}/pets`);
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
  }, [activeTab, viewResident?.id]);

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
              <div className="space-y-5">
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
                    <TabsList className="flex flex-wrap gap-1 mb-4">
                      <TabsTrigger value="info">Resident Info</TabsTrigger>
                      <TabsTrigger value="classifications">Classifications</TabsTrigger>
                      <TabsTrigger value="households">Households</TabsTrigger>
                      <TabsTrigger value="residentid">Resident ID</TabsTrigger>
                      <TabsTrigger value="pets">Pets</TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="info">
                    <div className="space-y-5">
                      {/* Header with main info and resident picture */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-5">
                        {/* Resident Picture */}
                        <div className="flex-shrink-0">
                          {viewResident.picture_path ? (
                            <div
                              className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 relative group"
                              onClick={() => viewResident && setImageModalOpen(true)}
                            >
                              <img
                                src={resolvePicture(viewResident.picture_path)}
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
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg border border-gray-200 bg-muted/20 flex items-center justify-center shadow-sm">
                              <div className="text-center">
                                <User className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">No photo</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Resident Info */}
                        <div className="flex-1 text-center sm:text-left">
                          <div className="text-xl font-bold text-gray-800 mb-1">
                            {`${formatLabel(viewResident.first_name)} ${viewResident.middle_name
                              ? formatLabel(viewResident.middle_name)
                              : ""
                              } ${formatLabel(viewResident.last_name)}${viewResident.suffix ? ` ${viewResident.suffix}` : ""
                              }`}
                          </div>
                          <div className="text-muted-foreground text-sm flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-primary shrink-0" />
                            {viewResident.email || (
                              <span className="italic text-xs">No email</span>
                            )}
                          </div>
                          <div className="text-muted-foreground text-sm flex items-center gap-2 mb-1">
                            <Phone className="h-4 w-4 text-primary shrink-0" />
                            {viewResident.contact_number || (
                              <span className="italic text-xs">No contact</span>
                            )}
                          </div>
                          <div className="text-muted-foreground text-sm flex items-center gap-2 mb-3">
                            <MapPin className="h-4 w-4 text-primary shrink-0" />
                            <span>
                              {[viewResident.house_number, viewResident.household_street, viewResident.barangay_name, viewResident.municipality_name].filter(Boolean).map(formatLabel).join(", ") || <span className="italic text-xs">No address</span>}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant={getStatusColor(viewResident.status)}
                            >
                              {formatLabel(viewResident.status)}
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

                      {/* All details in one card */}
                      <Card>
                        <CardContent className="pt-5">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Sex</p>
                              <p className="text-sm font-medium text-gray-800">{formatLabel(viewResident.sex) || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Civil Status</p>
                              <p className="text-sm font-medium text-gray-800">{formatLabel(viewResident.civil_status) || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Occupation</p>
                              <p className="text-sm font-medium text-gray-800">{formatLabel(viewResident.occupation) || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Monthly Income</p>
                              <p className="text-sm font-medium text-gray-800">
                                {viewResident.monthly_income ? `₱${parseFloat(viewResident.monthly_income).toLocaleString()}/mo` : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Birthdate</p>
                              <p className="text-sm font-medium text-gray-800">{formatDateLong(viewResident.birthdate) || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Birthplace</p>
                              <p className="text-sm font-medium text-gray-800 capitalize">
                                {[viewResident.birth_region, viewResident.birth_province, viewResident.birth_municipality].filter(Boolean).join(", ") || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Education</p>
                              <p className="text-sm font-medium text-gray-800 capitalize">{formatLabel(viewResident.education_attainment) || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Employment</p>
                              <p className="text-sm font-medium text-gray-800 capitalize">{formatLabel(viewResident.employment_status) || "—"}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  <TabsContent value="classifications">
                    <div className="space-y-4">
                      {/* Compact header with resident picture */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-shrink-0">
                          {viewResident.picture_path ? (
                            <div
                              className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 bg-white shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 relative group"
                              onClick={() => viewResident && setImageModalOpen(true)}
                            >
                              <img
                                src={resolvePicture(viewResident.picture_path)}
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
                            <div className="w-16 h-16 rounded-full border border-gray-200 bg-muted/20 flex items-center justify-center">
                              <User className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-800">
                              {`${formatLabel(viewResident.first_name)} ${formatLabel(viewResident.last_name)}`}
                            </h3>
                            <p className="text-sm text-muted-foreground">Classifications</p>
                          </div>
                          {!hideActions && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditClassifications && onEditClassifications(viewResident)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>

                      {Array.isArray(viewResident.classifications) &&
                        viewResident.classifications.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewResident.classifications.map((c, idx) => {
                            let detailsArr = [];
                            const cd = c.classification_details;
                            if (typeof cd === "string" && cd !== "[]" && cd !== "") {
                              // Pipe-separated string: "Land Owner | Rice"
                              detailsArr = cd.split("|").map((s) => s.trim()).filter(Boolean);
                            } else if (Array.isArray(cd) && cd.length > 0) {
                              // JSON array (legacy format): ["Land Owner", "Rice"]
                              detailsArr = cd.map(String).filter(Boolean);
                            } else if (
                              cd !== null &&
                              typeof cd === "object" &&
                              !Array.isArray(cd)
                            ) {
                              // Plain object: { status: "Land Owner", type: "Rice" }
                              detailsArr = Object.entries(cd).map(([k, v]) => ({ key: k, value: v }));
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
                                <CardHeader className="pb-1">
                                  <CardTitle className="flex items-center gap-2">
                                    <BadgeCheck className="h-5 w-5 text-primary" />
                                    {formatLabel(c.classification_type)}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                  {detailsArr.length > 0 ? (
                                    <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                                      {/* String / array formats: positional labels */}
                                      {!detailsArr[0]?.key
                                        ? detailsArr.map((val, i) => (
                                          <li key={`${idx}-${i}`}>
                                            <span className="font-semibold">
                                              {detailLabels[i] || `Detail ${i + 1}`}:
                                            </span>{" "}
                                            {formatLabel(String(val))}
                                          </li>
                                        ))
                                        /* Object format: key-value labels */
                                        : detailsArr.map(({ key, value }) => (
                                          <li key={`${idx}-${key}`}>
                                            <span className="font-semibold">
                                              {getDetailLabel(c.classification_type, key, classificationOptions)}:
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
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-shrink-0">
                          {viewResident.picture_path ? (
                            <div
                              className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 bg-white shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 relative group"
                              onClick={() => viewResident && setImageModalOpen(true)}
                            >
                              <img
                                src={resolvePicture(viewResident.picture_path)}
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
                            <div className="w-16 h-16 rounded-full border border-gray-200 bg-muted/20 flex items-center justify-center">
                              <User className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-800">
                            {`${formatLabel(viewResident.first_name)} ${formatLabel(viewResident.last_name)}`}
                          </h3>
                          <div className="text-muted-foreground text-sm flex items-center gap-2 mt-0.5">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            {viewResident.email || <span className="italic text-xs">No email</span>}
                          </div>
                          <div className="text-muted-foreground text-sm flex items-center gap-2 mt-0.5">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            {viewResident.contact_number || <span className="italic text-xs">No contact</span>}
                          </div>
                          <div className="text-muted-foreground text-sm flex items-center gap-2 mt-0.5">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>
                              {[viewResident.house_number, viewResident.household_street, viewResident.barangay_name, viewResident.municipality_name].filter(Boolean).map(formatLabel).join(", ") || <span className="italic text-xs">No address</span>}
                            </span>
                          </div>
                        </div>
                      </div>

                      {householdInfo ? (
                        <>
                          {/* Household details — single card */}
                          <Card>
                            <CardContent className="pt-5">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">House Head</p>
                                  <p className="text-sm font-medium text-gray-800">{formatLabel(householdInfo.house_head) || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">House Number</p>
                                  <p className="text-sm font-medium text-gray-800">{householdInfo.house_number || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Street</p>
                                  <p className="text-sm font-medium text-gray-800">{householdInfo.street || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Barangay</p>
                                  <p className="text-sm font-medium text-gray-800">{householdInfo.barangay_name || "—"}</p>
                                </div>
                                {householdInfo.area && (
                                  <div>
                                    <p className="text-xs text-muted-foreground">Area</p>
                                    <p className="text-sm font-medium text-gray-800">{householdInfo.area} sqm</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-muted-foreground">Housing Type</p>
                                  <p className="text-sm font-medium text-gray-800">{formatLabel(householdInfo.housing_type) || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Structure Type</p>
                                  <p className="text-sm font-medium text-gray-800">{formatLabel(householdInfo.structure_type) || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Electricity</p>
                                  <p className="text-sm font-medium text-gray-800">{formatLabel(householdInfo.electricity) || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Water Source</p>
                                  <p className="text-sm font-medium text-gray-800">{householdInfo.water_source || "—"}</p>
                                </div>
                                <div className="md:col-span-2">
                                  <p className="text-xs text-muted-foreground">Toilet Facility</p>
                                  <p className="text-sm font-medium text-gray-800">{householdInfo.toilet_facility || "—"}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Family Groups */}
                          {householdInfo.families && householdInfo.families.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-800">Family Groups</h4>
                              {householdInfo.families.map((family, index) => (
                                <Card key={family.family_id || index}>
                                  <CardContent className="pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-sm font-semibold text-gray-800">{family.family_group}</p>
                                      <Badge variant="outline" className="text-xs">Family {index + 1}</Badge>
                                    </div>
                                    <div className="mb-3">
                                      <p className="text-xs text-muted-foreground">Family Head</p>
                                      <p className="text-sm font-medium text-gray-800">{family.family_head || "—"}</p>
                                    </div>
                                    {family.members && family.members.length > 0 && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-2">Family Members ({family.members.length})</p>
                                        <div className="space-y-1.5">
                                          {family.members.map((member, memberIndex) => (
                                            <div
                                              key={member.fm_id || memberIndex}
                                              className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded text-sm"
                                            >
                                              <div>
                                                <p className="font-medium text-gray-800">{member.fm_member}</p>
                                                {member.fm_relationship_to_fm_head && (
                                                  <p className="text-xs text-muted-foreground">{member.fm_relationship_to_fm_head}</p>
                                                )}
                                              </div>
                                              <Badge variant="secondary" className="text-xs">Member {memberIndex + 1}</Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
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
                  src={resolvePicture(viewResident.picture_path)}
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
