import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import RefreshControls from "@/components/common/RefreshControls";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Eye,
  Edit,
  Trash,
  PawPrint,
  User,
  MapPin,
  Building,
  Calendar,
  Palette,
  Info,
  MoreHorizontal,
  Settings,
  Image,
  Maximize2,
  QrCode,
  Download,
  Syringe,
  Copy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePets } from "@/features/pets/hooks/usePets";
import { useVaccines } from "@/features/pets/hooks/useVaccines";
import PetFilters from "@/features/pets/components/PetFilters";
import PetTable from "@/features/pets/components/PetTable";
import PetForm from "@/features/pets/components/PetForm";
import PetDetailsForm from "@/features/pets/components/PetDetailsForm";
import PetImageForm from "@/features/pets/components/PetImageForm";
import PetDeleteConfirmationDialog from "@/features/pets/components/PetDeleteConfirmationDialog";
import VaccineList from "@/features/pets/components/VaccineList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import QRCode from "qrcode";
import api from "@/utils/api";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

const PetsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  // Set up unified auto refresh for pets data
  const { registerRefreshCallback, handleCRUDOperation, triggerRefresh } = useUnifiedAutoRefresh({
    entityType: 'pet',
    successMessage: 'Pet operation completed successfully!',
    autoRefresh: true,
    refreshDelay: 100
  });
  const {
    pets,
    selectedPet,
    loading,
    searchTerm,
    filterSpecies,
    filterPurok,
    puroks,
    barangays,
    sortBy,
    sortOrder,
    page,
    perPage,
    pagination,
    setSearchTerm,
    setFilterSpecies,
    setFilterPurok,
    handleSort,
    setPage,
    setPerPage,
    setSelectedPet,
    fetchPet,
    createPet,
    updatePet,
    deletePet,
    refreshData,
  } = usePets();

  // Register refresh callback for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(refreshData);
    return () => {
      unregister();
    };
  }, [registerRefreshCallback, refreshData]);

  // Vaccine hook for selected pet
  const { getVaccineStats, getLatestVaccine, getDaysSinceVaccination } = useVaccines(selectedPet?.pet_id);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDetailsDialogOpen, setIsEditDetailsDialogOpen] = useState(false);
  const [isEditImageDialogOpen, setIsEditImageDialogOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [petToDelete, setPetToDelete] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://13.211.71.85";

  // Helper to get full image URL
  const getPetImageUrl = (picture_path) => {
    if (!picture_path) return "";
    // If already a full URL, return as is
    if (/^https?:\/\//.test(picture_path)) return picture_path;
    return `${SERVER_URL}/${picture_path.replace(/\\/g, "/")}`;
  };

  // Species options for filter
  const [species] = useState([
    "Dog",
    "Cat",
    "Bird",
    "Fish",
    "Rabbit",
    "Hamster",
    "Guinea Pig",
    "Ferret",
    "Reptile",
    "Other",
  ]);

  // Handlers
  const handleAddPet = async (formData) => {
    try {
      await handleCRUDOperation(
        async (data) => {
          return await createPet(data);
        },
        formData,
        'create'
      );
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to create pet:', error);
    }
  };

  const handleEditPet = async (formData) => {
    try {
      await handleCRUDOperation(
        async (data) => {
          return await updatePet(selectedPet.pet_id, data);
        },
        formData,
        'update'
      );
      setIsEditDialogOpen(false);
      setSelectedPet(null);
    } catch (error) {
      console.error('Failed to update pet:', error);
    }
  };

  const handleEditDetailsSubmit = async (formData) => {
    if (!selectedPet) return false;
    try {
      const success = await handleCRUDOperation(
        async (data) => {
          return await updatePet(selectedPet.pet_id, data);
        },
        formData,
        'update'
      );
      setIsEditDetailsDialogOpen(false);
      setSelectedPet(null);
      return success;
    } catch (error) {
      console.error('Failed to update pet details:', error);
      return false;
    }
  };

  const handleEditImageSubmit = async (formData) => {
    if (!selectedPet) return false;
    try {
      const success = await handleCRUDOperation(
        async (data) => {
          return await updatePet(selectedPet.pet_id, data);
        },
        formData,
        'update'
      );
      setIsEditImageDialogOpen(false);
      setSelectedPet(null);
      return success;
    } catch (error) {
      console.error('Failed to update pet image:', error);
      return false;
    }
  };

  const handleView = async (petId) => {
    const pet = await fetchPet(petId);
    if (pet) {
      setSelectedPet(pet);
      setIsViewDialogOpen(true);
    }
  };

  const handleEditDetails = (pet) => {
    setSelectedPet(pet);
    setIsEditDetailsDialogOpen(true);
    setIsViewDialogOpen(false);
  };

  const handleEditImage = (pet) => {
    setSelectedPet(pet);
    setIsEditImageDialogOpen(true);
    setIsViewDialogOpen(false);
  };

  const handleDeleteConfirm = (petId) => {
    const pet = pets.find((p) => p.pet_id === petId);
    setPetToDelete(pet);
    setIsDeleteDialogOpen(true);
    setIsViewDialogOpen(false); // Close the view dialog when opening delete confirmation
  };

  const handleDeleteExecute = async () => {
    if (!petToDelete) return;

    try {
      await handleCRUDOperation(
        async (data) => {
          return await deletePet(data.pet_id);
        },
        { pet_id: petToDelete.pet_id },
        'delete'
      );

      setIsDeleteDialogOpen(false);
      setPetToDelete(null);
    } catch (error) {
      console.error('Failed to delete pet:', error);
    }
  };

  // Pagination handlers
  const totalPages = pagination.totalPages;
  const total = pagination.totalRecords;

  const handlePrev = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return "-";
    const today = new Date();
    const birth = new Date(birthdate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      return age - 1;
    }
    return age;
  };

  const formatLabel = (text) => {
    if (!text) return "-";
    if (typeof text !== "string") {
      text = String(text);
    }
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const generatePetQRCode = async (pet) => {
    if (!pet) return;
    
    setIsGeneratingQR(true);
    try {
      // Create pet information data with UUID for secure public lookup
      const petData = {
        uuid: pet.uuid, // Primary identifier for public search
        pet_id: pet.pet_id, // Keep for backward compatibility (not used publicly)
        name: pet.pet_name,
        species: pet.species,
        breed: pet.breed,
        owner: pet.owner_name,
        address: pet.address,
        contact: pet.contact_number || pet.phone_number || pet.owner_contact || pet.contact || "N/A",
        picture_path: pet.picture_path,
        timestamp: new Date().toISOString(),
        type: "pet_info"
      };

      // Generate QR code with pet data (UUID-based for security)
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(petData), {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF"
        }
      });
      
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error generating QR code:", error);
}
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `pet-qr-${selectedPet?.pet_name || 'unknown'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Register refresh callback for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(refreshData);
    return unregister;
  }, [registerRefreshCallback, refreshData]);

  // Auto-generate QR code when QR tab is selected
  useEffect(() => {
    if (activeTab === "qrcode" && selectedPet && !qrCodeDataUrl) {
      generatePetQRCode(selectedPet);
    }
  }, [activeTab, selectedPet]);

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Pet Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage pet information and records
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <RefreshControls 
            variant="outline"
            size="sm"
          />
          {/* Add Pet Dialog */}
          {user.target_type === "barangay" && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" className="gap-2 text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  Add Pet
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Pet</DialogTitle>
                  <DialogDescription>
                    Fill in the required information to add a new pet
                  </DialogDescription>
                </DialogHeader>
                <PetForm
                  mode="create"
                  onSubmit={handleAddPet}
                  onCancel={() => setIsAddDialogOpen(false)}
                  loading={loading}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <PetFilters
        searchInput={searchTerm}
        setSearchInput={setSearchTerm}
        filterSpecies={filterSpecies}
        setFilterSpecies={setFilterSpecies}
        filterPurok={filterPurok}
        setFilterPurok={setFilterPurok}
        puroks={puroks}
        barangays={barangays}
        role={user?.target_type}
        setPage={setPage}
        species={species}
      />

      {/* Table */}
      <PetTable
        pets={pets}
        loading={loading}
        onView={handleView}
        onEdit={(petId) => {
          const pet = pets.find((p) => p.pet_id === petId);
          setSelectedPet(pet);
          setIsEditDialogOpen(true);
        }}
        onDelete={handleDeleteConfirm}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        page={page}
        totalPages={totalPages}
        perPage={perPage}
        total={total}
        handlePrev={handlePrev}
        handleNext={handleNext}
        setPerPage={setPerPage}
      />

      {/* Edit Details Dialog */}
      <Dialog
        open={isEditDetailsDialogOpen}
        onOpenChange={setIsEditDetailsDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pet Details</DialogTitle>
            <DialogDescription>
              Update pet information and details
            </DialogDescription>
          </DialogHeader>
          {selectedPet && (
            <PetDetailsForm
              pet={selectedPet}
              onSubmit={handleEditDetailsSubmit}
              onCancel={() => {
                setIsEditDetailsDialogOpen(false);
                setSelectedPet(null);
              }}
              loading={loading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Image Dialog */}
      <Dialog
        open={isEditImageDialogOpen}
        onOpenChange={setIsEditImageDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pet Picture</DialogTitle>
            <DialogDescription>Update pet photo</DialogDescription>
          </DialogHeader>
          {selectedPet && (
            <PetImageForm
              pet={selectedPet}
              onSubmit={handleEditImageSubmit}
              onCancel={() => {
                setIsEditImageDialogOpen(false);
                setSelectedPet(null);
              }}
              loading={loading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Pet Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader
            className={
              user?.target_type === "municipality" ? "" : "flex flex-row items-center justify-between pr-4"
            }
          >
            <div>
              <DialogTitle>Pet Information</DialogTitle>
              <DialogDescription>
                View detailed pet information
              </DialogDescription>
            </div>
            {user?.target_type !== "municipality" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleEditDetails(selectedPet)}
                  >
                    <Settings className="h-4 w-4 mr-2" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditImage(selectedPet)}>
                    <Image className="h-4 w-4 mr-2" /> Edit Picture
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleDeleteConfirm(selectedPet.pet_id)}
                  >
                    <Trash className="h-4 w-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </DialogHeader>
          {selectedPet ? (
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
                      <SelectItem value="owner">Owner & Address</SelectItem>
                      <SelectItem value="vaccines">Vaccines</SelectItem>
                      <SelectItem value="qrcode">QR Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Desktop Tabs */}
                <TabsList className="hidden sm:flex gap-2 mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="owner">Owner & Address</TabsTrigger>
                  <TabsTrigger value="vaccines">Vaccines</TabsTrigger>
                  <TabsTrigger value="qrcode">QR Code</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <div className="space-y-6">
                    {/* Header with main info and pet picture */}
                    <div className="flex items-start gap-6 mb-6">
                      {/* Pet Picture */}
                      <div className="flex-shrink-0">
                        {selectedPet.picture_path ? (
                          <div 
                            className="w-32 h-32 rounded-lg overflow-hidden border-4 border-primary bg-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 relative group"
                            onClick={() => selectedPet && setImageModalOpen(true)}
                          >
                            <img
                              src={getPetImageUrl(selectedPet.picture_path)}
                              alt={selectedPet.pet_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                              <PawPrint className="h-8 w-8" />
                            </div>
                            {/* Overlay with maximize icon on hover */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <Maximize2 className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-lg border-4 border-muted bg-muted/20 flex items-center justify-center shadow-lg">
                            <div className="text-center">
                              <PawPrint className="h-16 w-16 text-muted-foreground/50 mx-auto mb-2" />
                              <p className="text-xs text-muted-foreground">No photo</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Pet Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-2xl font-bold">
                            {selectedPet.pet_name}
                          </div>
                          {selectedPet.uuid && (
                            <>
                              <code className="text-xs bg-muted/50 px-2 py-1 rounded border font-mono text-muted-foreground">
                                {selectedPet.uuid}
                              </code>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 hover:bg-primary/10"
                                title="Copy UUID"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const uuidText = selectedPet.uuid;
                                  
                                  // Try modern Clipboard API first
                                  if (navigator.clipboard && navigator.clipboard.writeText) {
                                    try {
                                      await navigator.clipboard.writeText(uuidText);
                                      toast({
                                        title: "Copied!",
                                        description: "Pet UUID copied to clipboard",
                                      });
                                      return;
                                    } catch (err) {
                                      console.error("Clipboard API failed:", err);
                                      // Fall through to fallback method
                                    }
                                  }
                                  
                                  // Fallback: HTTP-compatible copy method
                                  const input = document.createElement("input");
                                  input.value = uuidText;
                                  input.style.position = "fixed";
                                  input.style.opacity = "0";
                                  input.style.left = "-9999px"; // Move off-screen to avoid interference
                                  document.body.appendChild(input);
                                  
                                  // Select and copy
                                  input.select();
                                  input.setSelectionRange(0, 99999); // For mobile devices
                                  
                                  let success = false;
                                  try {
                                    success = document.execCommand('copy');
                                  } catch (err) {
                                    console.error("execCommand failed:", err);
                                  }
                                  
                                  // Clean up
                                  document.body.removeChild(input);
                                  
                                  // Show feedback
                                  if (success) {
                                    toast({
                                      title: "Copied!",
                                      description: "Pet UUID copied to clipboard",
                                    });
                                  } else {
                                    toast({
                                      title: "Copy failed",
                                      description: "Please manually select and copy the UUID",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                        <div className="text-muted-foreground text-sm flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-primary" />
                          {selectedPet.owner_name || (
                            <span className="italic text-xs">No owner</span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-sm flex items-center gap-2 mb-3">
                          <MapPin className="h-4 w-4 text-primary" />
                          {selectedPet.address || (
                            <span className="italic text-xs">No address</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="capitalize">
                            {selectedPet.species}
                          </Badge>
                          <Badge variant="secondary" className="capitalize">
                            {selectedPet.sex}
                          </Badge>
                          <Badge variant="outline">
                            {calculateAge(selectedPet.birthdate)} yrs old
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Quick stats grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="!pb-1">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <PawPrint className="h-4 w-4 text-primary" />
                            Species
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          <div className="text-lg font-semibold capitalize">
                            {selectedPet.species}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="!pb-1">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            Age
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          <div className="text-lg font-semibold">
                            {calculateAge(selectedPet.birthdate)} years
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="!pb-1">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Palette className="h-4 w-4 text-primary" />
                            Color
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          <div className="text-lg font-semibold capitalize">
                            {selectedPet.color}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="!pb-1">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            Owner
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="!pt-0">
                          <div className="text-lg font-semibold">
                            {selectedPet.owner_name ||
                              `ID: ${selectedPet.owner_id}`}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Vaccine Summary */}
                    <div className="mt-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Syringe className="h-5 w-5 text-primary" />
                            Vaccine Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 !pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">
                                {getVaccineStats().total}
                              </div>
                              <div className="text-sm text-muted-foreground">Total Vaccines</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {getVaccineStats().recent}
                              </div>
                              <div className="text-sm text-muted-foreground">Recent (≤30 days)</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-600">
                                {getVaccineStats().overdue}
                              </div>
                              <div className="text-sm text-muted-foreground">Overdue (&gt;1 year)</div>
                            </div>
                          </div>
                          {getLatestVaccine() && (
                            <div className="pt-4 border-t">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">Latest Vaccine</div>
                                  <div className="text-sm text-muted-foreground">
                                    {getLatestVaccine().vaccine_name}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">
                                    {new Date(getLatestVaccine().vaccination_date).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {getDaysSinceVaccination(getLatestVaccine().vaccination_date)} days ago
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => setActiveTab("vaccines")}
                            >
                              View All Vaccines
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details">
                  <div className="space-y-4">
                    {/* Compact header with pet picture */}
                    <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                      <div className="flex-shrink-0">
                        {selectedPet.picture_path ? (
                          <div 
                            className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                            onClick={() => selectedPet && setImageModalOpen(true)}
                          >
                            <img
                              src={getPetImageUrl(selectedPet.picture_path)}
                              alt={selectedPet.pet_name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                              <PawPrint className="h-6 w-6" />
                            </div>
                            {/* Overlay with maximize icon on hover */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <Maximize2 className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                            <PawPrint className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {selectedPet.pet_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">Pet Details</p>
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
                            <PawPrint className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Pet Name:</span>
                            <span className="ml-1">{selectedPet.pet_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PawPrint className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Species:</span>
                            <span className="ml-1 capitalize">
                              {selectedPet.species}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <PawPrint className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Breed:</span>
                            <span className="ml-1 capitalize">
                              {selectedPet.breed}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Birthdate:</span>
                            <span className="ml-1">
                              {selectedPet.birthdate
                                ? new Date(
                                    selectedPet.birthdate
                                  ).toLocaleDateString()
                                : "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Age:</span>
                            <span className="ml-1">
                              {calculateAge(selectedPet.birthdate)} years
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Physical Details */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
                            Physical Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 !pt-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Sex:</span>
                            <span className="ml-1 capitalize">
                              {selectedPet.sex}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Color:</span>
                            <span className="ml-1 capitalize">
                              {selectedPet.color}
                            </span>
                          </div>
                          {selectedPet.description && (
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-primary mt-1" />
                              <div>
                                <span className="font-semibold">
                                  Description:
                                </span>
                                <p className="ml-1 text-sm text-muted-foreground mt-1">
                                  {selectedPet.description}
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* Owner & Address Tab */}
                <TabsContent value="owner">
                  <div className="space-y-4">
                    {/* Compact header with pet picture */}
                    <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                      <div className="flex-shrink-0">
                        {selectedPet.picture_path ? (
                          <div 
                            className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                            onClick={() => selectedPet && setImageModalOpen(true)}
                          >
                            <img
                              src={getPetImageUrl(selectedPet.picture_path)}
                              alt={selectedPet.pet_name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                              <PawPrint className="h-6 w-6" />
                            </div>
                            {/* Overlay with maximize icon on hover */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <Maximize2 className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                            <PawPrint className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {selectedPet.pet_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">Owner & Address Information</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Owner Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Owner Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 !pt-0">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Owner Name:</span>
                            <span className="ml-1">
                              {selectedPet.owner_name ||
                                `ID: ${selectedPet.owner_id}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Owner ID:</span>
                            <span className="ml-1">{selectedPet.owner_id}</span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Address Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Address Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 !pt-0">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="font-semibold">House Number:</span>
                            <span className="ml-1">
                              {selectedPet.house_number || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Street:</span>
                            <span className="ml-1">
                              {selectedPet.street || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Purok:</span>
                            <span className="ml-1">
                              {selectedPet.purok_name || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Barangay:</span>
                            <span className="ml-1">
                              {selectedPet.barangay_name || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="font-semibold">Full Address:</span>
                            <span className="ml-1">
                              {selectedPet.address || "No address available"}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                                 </TabsContent>

                                 {/* Vaccines Tab */}
                <TabsContent value="vaccines">
                  <div className="space-y-4">
                    {/* Compact header with pet picture */}
                    <div className="flex items-center gap-4 !mb-0 p-4 bg-muted/20 rounded-lg">
                      <div className="flex-shrink-0">
                        {selectedPet.picture_path ? (
                          <div 
                            className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                            onClick={() => selectedPet && setImageModalOpen(true)}
                          >
                            <img
                              src={getPetImageUrl(selectedPet.picture_path)}
                              alt={selectedPet.pet_name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                              <PawPrint className="h-6 w-6" />
                            </div>
                            {/* Overlay with maximize icon on hover */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <Maximize2 className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                            <PawPrint className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {selectedPet.pet_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">Vaccine Records</p>
                      </div>
                    </div>

                    <VaccineList 
                      petId={selectedPet.pet_id} 
                      petName={selectedPet.pet_name} 
                      showAddButtons={user?.target_type !== "municipality"}
                    />
                  </div>
                </TabsContent>

                {/* QR Code Tab */}
                <TabsContent value="qrcode">
                   <div className="space-y-4">
                     {/* Compact header with pet picture */}
                     <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                       <div className="flex-shrink-0">
                         {selectedPet.picture_path ? (
                           <div 
                             className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                             onClick={() => selectedPet && setImageModalOpen(true)}
                           >
                             <img
                               src={getPetImageUrl(selectedPet.picture_path)}
                               alt={selectedPet.pet_name}
                               className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                               onError={(e) => {
                                 e.target.style.display = 'none';
                                 e.target.nextSibling.style.display = 'flex';
                               }}
                             />
                             <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                               <PawPrint className="h-6 w-6" />
                             </div>
                             {/* Overlay with maximize icon on hover */}
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                               <Maximize2 className="h-4 w-4 text-white" />
                             </div>
                           </div>
                         ) : (
                           <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                             <PawPrint className="h-8 w-8 text-muted-foreground/50" />
                           </div>
                         )}
                       </div>
                       <div className="flex-1">
                         <h3 className="text-lg font-semibold">
                           {selectedPet.pet_name}
                         </h3>
                         <p className="text-sm text-muted-foreground">Pet QR Code for Collar</p>
                       </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* QR Code Display */}
                       <Card>
                         <CardHeader>
                           <CardTitle className="flex items-center gap-2">
                             <QrCode className="h-5 w-5 text-primary" />
                             Pet QR Code
                           </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                           <div className="flex flex-col items-center space-y-4">
                             {qrCodeDataUrl ? (
                               <div className="text-center">
                                 <img
                                   src={qrCodeDataUrl}
                                   alt={`QR Code for ${selectedPet.pet_name}`}
                                   className="w-64 h-64 mx-auto border-2 border-gray-200 rounded-lg shadow-sm"
                                 />
                                 <p className="text-sm text-muted-foreground mt-2">
                                   Scan this QR code to view pet information
                                 </p>
                               </div>
                             ) : (
                               <div className="text-center py-8">
                                 <QrCode className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                                 <p className="text-muted-foreground mb-4">
                                   Generate a QR code for {selectedPet.pet_name}'s collar
                                 </p>
                                 <Button
                                   onClick={() => generatePetQRCode(selectedPet)}
                                   disabled={isGeneratingQR}
                                   className="gap-2"
                                 >
                                   {isGeneratingQR ? (
                                     <>
                                       <LoadingSpinner 
                                         message="Generating..." 
                                         variant="default"
                                         size="sm"
                                       />
                                     </>
                                   ) : (
                                     <>
                                       <QrCode className="h-4 w-4" />
                                       Generate QR Code
                                     </>
                                   )}
                                 </Button>
                               </div>
                             )}
                           </div>
                         </CardContent>
                       </Card>

                       {/* QR Code Information */}
                       <Card>
                         <CardHeader>
                           <CardTitle className="flex items-center gap-2">
                             <Info className="h-5 w-5 text-primary" />
                             QR Code Information
                           </CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                           <div className="space-y-3">
                             <div>
                               <h4 className="font-semibold text-sm mb-2">What's included in the QR code:</h4>
                               <ul className="text-sm text-muted-foreground space-y-1">
                                 <li>• <strong>Pet UUID</strong> (secure identifier)</li>
                                 <li>• Pet name and species</li>
                                 <li>• Breed information</li>
                                 <li>• Owner information</li>
                                 <li>• Contact details</li>
                                 <li>• Address</li>
                                 <li>• Generation timestamp</li>
                               </ul>
                             </div>
                             
                             <div className="pt-4 border-t">
                               <h4 className="font-semibold text-sm mb-2">How to use:</h4>
                               <ol className="text-sm text-muted-foreground space-y-1">
                                 <li>1. Generate the QR code</li>
                                 <li>2. Download the image</li>
                                 <li>3. Print and attach to pet's collar</li>
                                 <li>4. Anyone can scan to view pet info</li>
                               </ol>
                             </div>

                             {qrCodeDataUrl && (
                               <div className="pt-4 border-t">
                                 <Button
                                   onClick={downloadQRCode}
                                   variant="outline"
                                   className="w-full gap-2"
                                 >
                                   <Download className="h-4 w-4" />
                                   Download QR Code
                                 </Button>
                                 <p className="text-xs text-muted-foreground mt-2 text-center">
                                   Download as PNG image for printing
                                 </p>
                               </div>
                             )}
                           </div>
                         </CardContent>
                       </Card>
                     </div>
                   </div>
                 </TabsContent>
               </Tabs>

            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <PetDeleteConfirmationDialog
        pet={petToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteExecute}
        loading={loading}
      />

      {/* Image Modal */}
      <Dialog open={imageModalOpen && !!selectedPet} onOpenChange={setImageModalOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedPet ? `${selectedPet.pet_name} - Pet Picture` : 'Pet Picture'}
            </DialogTitle>
            <DialogDescription>
              View the pet's picture in full size. Click outside or press the close button to exit.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            {/* Maximized Image */}
            {selectedPet?.picture_path ? (
              <div className="w-full max-h-[90vh] flex items-center justify-center bg-black">
                <img
                  src={getPetImageUrl(selectedPet.picture_path)}
                  alt={`${selectedPet.pet_name || 'Pet'} - Full size image`}
                  className="max-w-full max-h-[90vh] object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-64 flex items-center justify-center text-white bg-black" style={{ display: 'none' }}>
                  <div className="text-center">
                    <PawPrint className="h-16 w-16 mx-auto mb-2" />
                    <p>Image could not be loaded</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <PawPrint className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No image available</p>
                </div>
              </div>
            )}
            
            {/* Image Info Footer */}
            {selectedPet && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
                <p className="text-lg font-semibold">
                  {selectedPet.pet_name || 'Unknown Pet'}
                </p>
                <p className="text-sm text-white/80">
                  {selectedPet.species ? `${formatLabel(selectedPet.species)}` : ''}
                  {selectedPet.species && selectedPet.owner_name ? ' • ' : ''}
                  {selectedPet.owner_name ? `Owner: ${selectedPet.owner_name}` : ''}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PetsPage;
