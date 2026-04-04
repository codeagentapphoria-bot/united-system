import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  Home,
  Users,
  BarChart3,
  Heart,
  PawPrint,
  User,
  Shield,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronUp,
  Crown,
  Network,
  Download,
  Maximize2,
  X,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import api from "@/utils/api";
import { barangaySchema } from "@/utils/barangaySchema";
import { sendSetupEmail } from "@/features/municipality/barangays/sendSetupEmail";
import { buildSetupLink } from "@/features/municipality/barangays/buildSetupLink";
import { mockBarangays } from "@/features/municipality/barangays/mockBarangays";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import RefreshControls from "@/components/common/RefreshControls";
import { useCrudRefresh } from "@/hooks/useCrudRefresh";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";

const BarangaysPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [barangays, setBarangays] = useState([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState("all");
  const [isBarangayLoaded, setIsBarangayLoaded] = useState(false);
  const [barangayStats, setBarangayStats] = useState({});
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [distributionType, setDistributionType] = useState("residents");
  const [openDistribution, setOpenDistribution] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const [filterStatus, setFilterStatus] = useState("all"); // "all", "active", "inactive"
  const [sortBy, setSortBy] = useState("name"); // "name", "households", "residents", "pets"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"

  // CRUD refresh functionality
  const { handleCrudSuccess, handleCrudError } = useCrudRefresh({
    autoRefresh: false, // Disabled to prevent double refresh - data is refreshed by individual CRUD operations
    clearCache: true,
    refreshDelay: 1500
  });

  // Auto-refresh for barangays operations
  const { handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'barangays',
    successMessage: 'Barangay operation completed successfully!',
    errorMessage: 'Failed to perform barangay operation',
    showToast: true,
    autoRefresh: true,
    refreshDelay: 100
  });

  // Barangay officials and org chart states
  const [barangayOfficials, setBarangayOfficials] = useState({});
  const [orgChartPaths, setOrgChartPaths] = useState({});
  const [officialsLoading, setOfficialsLoading] = useState({});
  const [orgChartLoading, setOrgChartLoading] = useState({});
  const [currentView, setCurrentView] = useState("list");
  const [orgChartModalOpen, setOrgChartModalOpen] = useState(false);
  const [selectedOrgChart, setSelectedOrgChart] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [barangayToDelete, setBarangayToDelete] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [adminUsers, setAdminUsers] = useState({});

  // Helper function to safely parse numbers and handle NaN
  const safeParseInt = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === "")
      return defaultValue;
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Helper function to safely parse floats and handle NaN
  const safeParseFloat = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === "")
      return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  // Add Barangay form state
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(barangaySchema),
    defaultValues: {
      barangayName: "",
      barangayCode: "",
      fullName: "",
      email: "",
    },
    mode: "onTouched",
  });

  // Reset form when dialog closes
  const handleDialogChange = (open) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setStep(1);
      form.reset();
      setIsSubmitting(false);
    }
  };

  // Step navigation logic
  const canGoNext =
    !!form.watch("barangayName") && !!form.watch("barangayCode");
  const canSubmit = !!form.watch("fullName") && !!form.watch("email");

  // Check for conflicts before submitting
  const checkForConflicts = async (barangayName, barangayCode, email) => {
    try {
      // Use the improved conflict endpoint that checks both barangay and email conflicts
      const params = new URLSearchParams();
      if (barangayName) params.append('barangayName', barangayName);
      if (barangayCode) params.append('barangayCode', barangayCode);
      if (email) params.append('email', email);
      
      const response = await api.get(`/barangay/0/conflicts?${params.toString()}`);
      
      return response.data.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error checking for conflicts:", error);
}
      return { hasConflicts: false, conflicts: [] };
    }
  };

  // Handle form submit
  const onSubmit = async (values) => {
    setIsSubmitting(true);
    
    try {
      // Check for conflicts before submitting
      const conflictCheck = await checkForConflicts(values.barangayName, values.barangayCode, values.email);
      
      if (conflictCheck.hasConflicts) {
        const conflictMessages = conflictCheck.conflicts.map(c => c.message).join(", ");
        toast({
          title: "Conflict Error",
          description: conflictMessages,
          variant: "destructive",
        });
        return;
      }
      
      // Create barangay only (no user yet)
      const payload = {
        barangayName: values.barangayName,
        barangayCode: values.barangayCode,
        contactNumber: "", // Will be filled by barangay admin later
        email: values.email,
        gisCode: null
      };
      
      const response = await handleCRUDOperation(
        async (data) => api.post("/barangay", data),
        payload
      );
      const barangayId = response.data.data.id;
      
      // Send setup email to the barangay admin
      const emailResult = await sendSetupEmail({ 
        ...values, 
        toast, 
        barangayId 
      });
      
      // Handle successful creation with auto-refresh
      if (emailResult.success) {
        await handleCrudSuccess('create', {
          message: `Barangay ${values.barangayName} has been created successfully and setup email sent!`
        });
      } else {
        // Barangay created but email failed
        await handleCrudSuccess('create', {
          message: `Barangay ${values.barangayName} created but email sending failed. You can resend the email later.`
        });
      }
      
      setIsAddDialogOpen(false);
      fetchBarangays(); // Refresh the list
    } catch (err) {
      if (err.response?.status === 409) {
        // Handle conflict errors
        const conflictData = err.response?.data?.data;
        if (conflictData && conflictData.conflicts) {
          const conflictMessages = conflictData.conflicts.map(c => c.message).join(", ");
          toast({
            title: "Conflict Error",
            description: conflictMessages,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Conflict Error",
            description: err.response?.data?.message || "A conflict occurred",
            variant: "destructive"
          });
        }
      } else {
        const errorMessage = err.response?.data?.message || "Failed to add barangay";
        toast({
          title: "Failed to add barangay",
          description: errorMessage,
          variant: "destructive"
        });
      }
      if (process.env.NODE_ENV === 'development') {
  console.error(err);
}
    } finally {
      setIsSubmitting(false);
    }
  };

  const [municipalityOptions, setMunicipalityOptions] = useState([]); // For filter dropdown

  const fetchBarangays = async () => {
    try {
      const response = await api.get("/public/list/barangay");
      const barangayData = response.data.data.data;
      setBarangays(barangayData);
      // Extract unique municipality_ids for filter dropdown
      const uniqueMunicipalities = [
        ...new Set(barangayData.map((b) => b.municipality_id)),
      ];
      setMunicipalityOptions(uniqueMunicipalities);
      setIsBarangayLoaded(true);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error(error);
}
    }
  };

  useEffect(() => {
    fetchBarangays();
    fetchAdminUsers();
  }, []);

  // Fetch admin users for each barangay
  const fetchAdminUsers = async () => {
    try {
      const response = await api.get("/user/admins");
      const adminUsersMap = {};
      // The API returns { message: "...", data: [...] }
      const adminUsers = response.data.data || [];
      adminUsers.forEach(admin => {
        if (admin.target_type === 'barangay' && admin.target_id) {
          adminUsersMap[admin.target_id] = admin;
        }
      });
      setAdminUsers(adminUsersMap);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching admin users:", error);
}
    }
  };

  // Fetch barangay officials and org charts
  const fetchBarangayOfficials = async (barangayId) => {
    if (barangayOfficials[barangayId]) return; // Already loaded

    setOfficialsLoading(prev => ({ ...prev, [barangayId]: true }));
    try {
      const response = await api.get(`/public/list/${barangayId}/official`);
      setBarangayOfficials(prev => ({
        ...prev,
        [barangayId]: response.data.data || []
      }));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error fetching officials for barangay ${barangayId}:`, error);
      }
      setBarangayOfficials(prev => ({ ...prev, [barangayId]: [] }));
    } finally {
      setOfficialsLoading(prev => ({ ...prev, [barangayId]: false }));
    }
  };

  const fetchBarangayOrgChart = async (barangayId) => {
    if (orgChartPaths[barangayId] !== undefined) return; // Already loaded

    setOrgChartLoading(prev => ({ ...prev, [barangayId]: true }));
    try {
      const response = await api.get(`/public/${barangayId}/barangay`);
      const barangay = response.data.data;
      if (barangay.organizational_chart_path) {
        const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://13.211.71.85";
        setOrgChartPaths(prev => ({
          ...prev,
          [barangayId]: `${SERVER_URL}/${barangay.organizational_chart_path}`
        }));
      } else {
        setOrgChartPaths(prev => ({ ...prev, [barangayId]: null }));
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Error fetching org chart for barangay ${barangayId}:`, error);
      }
      setOrgChartPaths(prev => ({ ...prev, [barangayId]: null }));
    } finally {
      setOrgChartLoading(prev => ({ ...prev, [barangayId]: false }));
    }
  };



  // Download organizational chart
  const downloadOrgChart = async (barangayId) => {
    const orgChartPath = orgChartPaths[barangayId];
    if (!orgChartPath) return;

    try {
      const response = await fetch(orgChartPath);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `organizational-chart-${barangayId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Organizational chart downloaded successfully",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Download failed:", error);
}
      toast({
        title: "Error",
        description: "Failed to download organizational chart",
        variant: "destructive",
      });
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase();
  };

  // Handle delete barangay
  const handleDeleteBarangay = (barangay) => {
    setBarangayToDelete(barangay);
    setIsDeleteDialogOpen(true);
    setDeleteConfirmation("");
  };

  const confirmDelete = async () => {
    if (!barangayToDelete) return;

    const expectedConfirmation = `delete ${barangayToDelete.barangay_name}`;
    if (deleteConfirmation.toLowerCase() !== expectedConfirmation.toLowerCase()) {
      toast({
        title: "Invalid confirmation",
        description: `Please type exactly: "${expectedConfirmation}"`,
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Call API to delete barangay and send backup email
      const response = await handleCRUDOperation(
        async () => api.delete(`/${barangayToDelete.id}/barangay`, {
          data: {
            sendBackupEmail: true,
            adminEmail: adminUsers[barangayToDelete.id]?.email // This is the admin user email
          }
        }),
        {}
      );

      // Handle successful deletion with auto-refresh
      await handleCrudSuccess('delete', {
        message: `Barangay ${barangayToDelete.barangay_name} has been deleted successfully. Backup data and Excel files have been sent to the barangay admin.`
      });

      // Remove from local state
      setBarangays(prev => prev.filter(b => b.id !== barangayToDelete.id));
      setIsDeleteDialogOpen(false);
      setBarangayToDelete(null);
      setDeleteConfirmation("");
    } catch (error) {
      handleCrudError(error, 'delete');
    } finally {
      setIsDeleting(false);
    }
  };



  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Enhanced filtering and sorting
  const filteredAndSortedBarangays = barangays
    .filter((barangay) => {
      const search = debouncedSearchTerm.toLowerCase();
      const matchesSearch =
        barangay.barangay_name?.toLowerCase().includes(search) ||
        barangay.barangay_code?.toLowerCase().includes(search) ||
        barangay.email?.toLowerCase().includes(search) ||
        (barangay.municipality_id + "").includes(search);

      const matchesStatus = filterStatus === "all" ||
        (filterStatus === "active" && barangay.status !== "inactive") ||
        (filterStatus === "inactive" && barangay.status === "inactive");

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.barangay_name?.toLowerCase() || "";
          bValue = b.barangay_name?.toLowerCase() || "";
          break;
        case "households":
          aValue = barangayStats[a.id]?.households || 0;
          bValue = barangayStats[b.id]?.households || 0;
          break;
        case "residents":
          aValue = barangayStats[a.id]?.residents || 0;
          bValue = barangayStats[b.id]?.residents || 0;
          break;
        case "pets":
          aValue = barangayStats[a.id]?.pets || 0;
          bValue = barangayStats[b.id]?.pets || 0;
          break;
        default:
          aValue = a.barangay_name?.toLowerCase() || "";
          bValue = b.barangay_name?.toLowerCase() || "";
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Fetch barangay stats after barangays are loaded
  useEffect(() => {
    const fetchStats = async () => {
      const statsPromises = barangays.map(async (barangay) => {
        try {
          const [householdStats, populationStats, familyStats, petStats] =
            await Promise.all([
              api.get("/statistics/total-households", {
                params: { barangayId: barangay.id },
              }),
              api.get("/statistics/total-population", {
                params: { barangayId: barangay.id },
              }),
              api.get("/statistics/total-families", {
                params: { barangayId: barangay.id },
              }),
              api.get("/statistics/total-registered-pets", {
                params: { barangayId: barangay.id },
              }),
            ]);
          return {
            barangayId: barangay.id,
            households: householdStats.data.data?.total_households || 0,
            residents:
              parseInt(populationStats.data.data?.total_population) || 0,
            families: familyStats.data.data?.total_families || 0,
            pets: petStats.data.data?.total_pets || 0,
            addedThisMonth: householdStats.data.data?.added_this_month || 0,
          };
        } catch (err) {
          return {
            barangayId: barangay.id,
            households: 0,
            residents: 0,
            families: 0,
            pets: 0,
            addedThisMonth: 0,
          };
        }
      });
      const statsResults = await Promise.all(statsPromises);
      const statsMap = {};
      statsResults.forEach((stat) => {
        statsMap[stat.barangayId] = stat;
      });
      setBarangayStats(statsMap);
    };
    if (barangays.length) fetchStats();
  }, [barangays]);

  // Aggregate stats
  const totalHouseholds = Object.values(barangayStats).reduce(
    (sum, stat) => sum + parseInt(stat.households || 0),
    0
  );
  const totalResidents = Object.values(barangayStats).reduce(
    (sum, stat) => sum + parseInt(stat.residents || 0),
    0
  );
  const totalFamilies = Object.values(barangayStats).reduce(
    (sum, stat) => sum + parseInt(stat.families || 0),
    0
  );
  const totalPets = Object.values(barangayStats).reduce(
    (sum, stat) => sum + parseInt(stat.pets || 0),
    0
  );
  const totalAddedThisMonth = Object.values(barangayStats).reduce(
    (sum, stat) => sum + parseInt(stat.addedThisMonth || 0),
    0
  );

  // Resident distribution for chart
  const getBarangayDistribution = () => {
    if (totalResidents === 0) return [];
    return filteredAndSortedBarangays
      .map((barangay) => {
        const stats = barangayStats[barangay.id] || { residents: 0 };
        const percentage =
          totalResidents > 0
            ? safeParseFloat(
              ((stats.residents / totalResidents) * 100).toFixed(1),
              0
            )
            : 0;
        return {
          name: barangay.barangay_name,
          residents: stats.residents,
          percentage: percentage,
        };
      })
      .sort((a, b) => b.residents - a.residents);
  };

  const handleAccordionToggle = () => {
    setOpenDistribution((prev) => !prev);
  };

  if (!isBarangayLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner
            message="Loading barangay data..."
            variant="default"
            size="lg"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              Barangays Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Manage and track all barangays
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <RefreshControls 
              variant="outline"
              size="sm"
            />
            <Dialog open={isAddDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Add Barangay</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw]">
              <DialogHeader>
                <DialogTitle>Add New Barangay</DialogTitle>
                <DialogDescription>
                  Enter the barangay's information below
                </DialogDescription>
              </DialogHeader>
              {/* Progress Bar */}
              <div className="mb-4">
                <Progress value={step === 1 ? 50 : 100} />
                <div className="flex justify-between text-xs mt-1">
                  <span
                    className={step === 1 ? "font-bold" : "text-muted-foreground"}
                  >
                    Barangay Info
                  </span>
                  <span
                    className={step === 2 ? "font-bold" : "text-muted-foreground"}
                  >
                    Account Info
                  </span>
                </div>
              </div>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  {step === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-4">
                      <FormField
                        control={form.control}
                        name="barangayName"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Barangay Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter barangay name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="barangayCode"
                        render={({ field }) => (
                          <FormItem className="col-span-2">
                            <FormLabel>Barangay Code</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter barangay code"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  {step === 2 && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-base">Account Info</span>
                      </div>
                      <div className="mb-4 px-3 py-2 rounded bg-muted text-muted-foreground text-sm">
                        After saving, an email will be sent to the provided
                        address with instructions to set the password for the
                        barangay admin user.
                        <br />
                        The email address will serve as the login for the barangay
                        admin user.
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-4">
                        <FormField
                          control={form.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Enter email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      className="mr-auto"
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    {step === 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        disabled={isSubmitting}
                      >
                        Back
                      </Button>
                    )}
                    {step === 1 && (
                      <Button
                        type="button"
                        variant="hero"
                        onClick={() => setStep(2)}
                        disabled={!canGoNext}
                      >
                        Next
                      </Button>
                    )}
                    {step === 2 && (
                      <Button
                        type="submit"
                        variant="hero"
                        disabled={!canSubmit || isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save Barangay"}
                      </Button>
                    )}

                  </div>
                </form>
              </Form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Enhanced Filters and Controls */}
        <div className="space-y-4">
          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search barangays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="households">Households</SelectItem>
                  <SelectItem value="residents">Residents</SelectItem>
                  <SelectItem value="pets">Pets</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="text-xs sm:text-sm"
              >
                {sortOrder === "asc" ? (
                  <SortAsc className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <SortDesc className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="text-xs sm:text-sm rounded-r-none"
                >
                  <Grid3X3 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="text-xs sm:text-sm rounded-l-none"
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2">
              <span className="inline-block bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold px-3 py-1 rounded-full">
                {filteredAndSortedBarangays.length} Barangay{filteredAndSortedBarangays.length !== 1 ? "s" : ""}
              </span>
              <span className="text-gray-500 text-xs sm:text-sm">
                {filterStatus !== "all" && `(${filterStatus})`}
              </span>
            </div>
            <div className="flex flex-row gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className="text-gray-600">
                Total Households:{" "}
                <span className="font-semibold">{totalHouseholds}</span>
              </span>
              <span className="text-gray-600">
                Total Residents:{" "}
                <span className="font-semibold">{totalResidents}</span>
              </span>
              <span className="text-gray-600">
                New This Month:{" "}
                <span className="font-semibold">{totalAddedThisMonth}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Compact Distribution Section */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Distribution Overview</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAccordionToggle}
            className="text-xs sm:text-sm"
          >
            {openDistribution ? (
              <>
                <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        </div>

        {openDistribution && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {/* Residents Distribution */}
            <Card className="bg-white shadow-sm border-0 h-fit hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2 text-base sm:text-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <span>Residents Distribution</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredAndSortedBarangays.slice(0, 5).map((barangay) => {
                    const stats = barangayStats[barangay.id] || {};
                    const residents = stats.residents || 0;
                    const percentage = totalResidents > 0 ? ((residents / totalResidents) * 100).toFixed(1) : 0;
                    return (
                      <div key={barangay.id} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium text-gray-900 truncate">
                            {barangay.barangay_name}
                          </span>
                          <span className="text-gray-600 ml-2">
                            {residents} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Households Distribution */}
            <Card className="bg-white shadow-sm border-0 h-fit hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2 text-base sm:text-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <span>Households Distribution</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredAndSortedBarangays.slice(0, 5).map((barangay) => {
                    const stats = barangayStats[barangay.id] || {};
                    const households = stats.households || 0;
                    const percentage = totalHouseholds > 0 ? ((households / totalHouseholds) * 100).toFixed(1) : 0;
                    return (
                      <div key={barangay.id} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium text-gray-900 truncate">
                            {barangay.barangay_name}
                          </span>
                          <span className="text-gray-600 ml-2">
                            {households} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* New This Month Distribution */}
            <Card className="bg-white shadow-sm border-0 h-fit hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2 text-base sm:text-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  <span>New This Month</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredAndSortedBarangays.slice(0, 5).map((barangay) => {
                    const stats = barangayStats[barangay.id] || {};
                    const addedThisMonth = stats.addedThisMonth || 0;
                    const percentage = totalAddedThisMonth > 0 ? ((addedThisMonth / totalAddedThisMonth) * 100).toFixed(1) : 0;
                    return (
                      <div key={barangay.id} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium text-gray-900 truncate">
                            {barangay.barangay_name}
                          </span>
                          <span className="text-gray-600 ml-2">
                            {addedThisMonth} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-orange-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Pets Distribution */}
            <Card className="bg-white shadow-sm border-0 h-fit hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2 text-base sm:text-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  <span>Pets Distribution</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredAndSortedBarangays.slice(0, 5).map((barangay) => {
                    const stats = barangayStats[barangay.id] || {};
                    const pets = stats.pets || 0;
                    const percentage = totalPets > 0 ? ((pets / totalPets) * 100).toFixed(1) : 0;
                    return (
                      <div key={barangay.id} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium text-gray-900 truncate">
                            {barangay.barangay_name}
                          </span>
                          <span className="text-gray-600 ml-2">
                            {pets} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Barangay List with tabs for officials and org chart */}
        <Tabs value={currentView} onValueChange={setCurrentView} className="space-y-6">
          {/* Mobile: Dropdown Select */}
          <div className="sm:hidden">
            <Select value={currentView} onValueChange={setCurrentView}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select tab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Barangay List
                  </div>
                </SelectItem>
                <SelectItem value="officials">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Officials
                  </div>
                </SelectItem>
                <SelectItem value="orgChart">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    Organization Charts
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Original Tabs */}
          <TabsList className="hidden sm:grid w-full grid-cols-3">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Barangay List
            </TabsTrigger>
            <TabsTrigger value="officials" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Officials
            </TabsTrigger>
            <TabsTrigger value="orgChart" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Organization Charts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Interactive tip for clickable list */}
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#2196F3]/10 text-[#2196F3]">
                <Eye className="h-4 w-4" />
              </span>
              <span className="text-xs sm:text-sm text-gray-600 font-medium">
                Tap or click any barangay card to explore its details.
              </span>
            </div>
            {/* Barangay List - Grid or Table View */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAndSortedBarangays.map((barangay) => (
                  <Card key={barangay.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <div onClick={() => {
                      setSelectedBarangay(barangay);
                      setIsViewDialogOpen(true);
                    }}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm sm:text-base truncate">
                            {barangay.barangay_name}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 !pt-0">
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Code:</span> {barangay.barangay_code}
                        </div>
                        {adminUsers[barangay.id]?.email && (
                          <div className="text-xs text-gray-500">
                            <span className="font-medium">Admin:</span> {adminUsers[barangay.id].email}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className="font-semibold text-blue-700">
                              {barangayStats[barangay.id]?.households || 0}
                            </div>
                            <div className="text-blue-600">Households</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="font-semibold text-green-700">
                              {barangayStats[barangay.id]?.residents || 0}
                            </div>
                            <div className="text-green-600">Residents</div>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Barangay List</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm">Code</TableHead>
                        <TableHead className="text-xs sm:text-sm">Admin</TableHead>
                        <TableHead className="text-xs sm:text-sm">Households</TableHead>
                        <TableHead className="text-xs sm:text-sm">Residents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedBarangays.map((barangay) => (
                        <TableRow className="cursor-pointer" key={barangay.id} onClick={() => {
                          setSelectedBarangay(barangay);
                          setIsViewDialogOpen(true);
                        }}>
                          <TableCell className="text-xs sm:text-sm font-medium">
                            {barangay.barangay_name}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {barangay.barangay_code}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {barangay.email || "-"}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {barangayStats[barangay.id]?.households || 0}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {barangayStats[barangay.id]?.residents || 0}
                          </TableCell>

                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="officials" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredAndSortedBarangays.map((barangay) => (
                <Card key={barangay.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="truncate">{barangay.barangay_name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchBarangayOfficials(barangay.id)}
                        disabled={officialsLoading[barangay.id]}
                        className="text-xs sm:text-sm"
                      >
                        {officialsLoading[barangay.id] ? "Loading..." : "Load Officials"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {officialsLoading[barangay.id] ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Loading officials...</p>
                      </div>
                    ) : barangayOfficials[barangay.id] ? (
                      <div className="space-y-3">
                        {barangayOfficials[barangay.id].length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No officials found
                          </p>
                        ) : (
                          barangayOfficials[barangay.id].slice(0, 5).map((official) => (
                            <div key={official.official_id} className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={official.picture_path} />
                                <AvatarFallback>
                                  {getInitials(official.first_name, official.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {official.first_name} {official.last_name}
                                  {official.suffix && ` ${official.suffix}`}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {official.position}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                        {barangayOfficials[barangay.id]?.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{barangayOfficials[barangay.id].length - 5} more officials
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Click "Load Officials" to view barangay officials
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orgChart" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredAndSortedBarangays.map((barangay) => (
                <Card key={barangay.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="truncate">{barangay.barangay_name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchBarangayOrgChart(barangay.id)}
                        disabled={orgChartLoading[barangay.id]}
                        className="text-xs sm:text-sm"
                      >
                        {orgChartLoading[barangay.id] ? "Loading..." : "Load Chart"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orgChartLoading[barangay.id] ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="text-sm text-muted-foreground mt-2">Loading chart...</p>
                      </div>
                    ) : orgChartPaths[barangay.id] ? (
                      <div className="space-y-3">
                        <div className="relative group">
                          <img
                            src={orgChartPaths[barangay.id]}
                            alt={`${barangay.barangay_name} Organization Chart`}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setSelectedOrgChart({
                                path: orgChartPaths[barangay.id],
                                name: barangay.barangay_name
                              });
                              setOrgChartModalOpen(true);
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setSelectedOrgChart({
                                  path: orgChartPaths[barangay.id],
                                  name: barangay.barangay_name
                                });
                                setOrgChartModalOpen(true);
                              }}
                            >
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadOrgChart(barangay.id)}
                            className="flex-1"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ) : orgChartPaths[barangay.id] === null ? (
                      <div className="text-center py-4">
                        <Network className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No organization chart available
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Click "Load Chart" to view organization chart
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>



        {/* View Barangay Dialog with all stats and Delete button */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pr-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">Barangay Details</DialogTitle>
                  <DialogDescription>
                    Detailed information about {selectedBarangay?.barangay_name}
                  </DialogDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleDeleteBarangay(selectedBarangay);
                  }}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </DialogHeader>
            {selectedBarangay && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Barangay Name
                    </span>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {selectedBarangay.barangay_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Barangay Code
                    </span>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {selectedBarangay.barangay_code}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Contact
                    </span>
                    <p className="text-gray-600 mt-1">
                      {selectedBarangay.contact_number || "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Barangay Email
                    </span>
                    <p className="text-gray-600 mt-1">
                      {selectedBarangay.email || "No barangay email set"}
                    </p>
                  </div>
                </div>

                {/* Admin Information Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Admin Information</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <User className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-700">
                          Admin Login Email
                        </span>
                        <p className="text-gray-900 font-medium mt-1">
                          {adminUsers[selectedBarangay.id]?.email || "No admin assigned"}
                        </p>
                      </div>
                      {selectedBarangay.email && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedBarangay.email);
                            toast({
                              title: "Email copied",
                              description: "Admin login email copied to clipboard",
                            });
                          }}
                        >
                          Copy
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <p className="font-medium mb-1">Note:</p>
                      <p>• The admin email serves as the login username for barangay administrators</p>
                      <p>• Password setup is done via email invitation when the barangay is created</p>
                      <p>• Contact the municipality admin if login access is needed</p>
                    </div>
                  </div>
                </div>
                {/* Stats cards in dialog */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Home className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-700">
                          {barangayStats[selectedBarangay.id]?.households || 0}
                        </div>
                        <div className="text-sm text-green-600 font-medium">
                          Households
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-purple-700">
                          {barangayStats[selectedBarangay.id]?.residents || 0}
                        </div>
                        <div className="text-sm text-purple-600 font-medium">
                          Residents
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Heart className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-orange-700">
                          {barangayStats[selectedBarangay.id]?.families || 0}
                        </div>
                        <div className="text-sm text-orange-600 font-medium">
                          Families
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-pink-50 border-pink-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <PawPrint className="h-8 w-8 text-pink-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-pink-700">
                          {barangayStats[selectedBarangay.id]?.pets || 0}
                        </div>
                        <div className="text-sm text-pink-600 font-medium">
                          Pets
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Organization Chart Image Modal */}
        <Dialog open={orgChartModalOpen} onOpenChange={setOrgChartModalOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden bg-black">
            <DialogHeader className="sr-only">
              <DialogTitle>{selectedOrgChart?.name} - Organizational Chart</DialogTitle>
              <DialogDescription>
                View the organizational chart in full size. Click outside or press the close button to exit.
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
                onClick={() => setOrgChartModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Download Button */}
              {selectedOrgChart?.path && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-12 z-10 bg-black/50 text-white hover:bg-black/70 mr-2"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = selectedOrgChart.path;
                    link.download = `organizational-chart-${selectedOrgChart.name}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    toast({
                      title: "Success",
                      description: "Organizational chart downloaded successfully",
                    });
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}

              {/* Maximized Organization Chart */}
              {selectedOrgChart?.path ? (
                <div className="w-full max-h-[95vh] flex items-center justify-center bg-black">
                  <img
                    src={selectedOrgChart.path}
                    alt={`${selectedOrgChart.name} - Organizational Chart - Full Size`}
                    className="max-w-full max-h-[95vh] object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-full h-64 flex items-center justify-center text-white bg-black" style={{ display: 'none' }}>
                    <div className="text-center">
                      <Network className="h-16 w-16 mx-auto mb-2" />
                      <p>Image could not be loaded</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-64 flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <Network className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No organizational chart available</p>
                  </div>
                </div>
              )}

            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Barangay</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the barangay and all its data.
              </DialogDescription>
            </DialogHeader>

            {barangayToDelete && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-800">Security Confirmation Required</span>
                  </div>
                  <p className="text-sm text-red-700 mb-3">
                    To confirm deletion, please type exactly:
                  </p>
                  <div className="bg-white p-3 border border-red-300 rounded">
                    <code className="text-red-800 font-mono text-sm">
                      delete {barangayToDelete.barangay_name}
                    </code>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deleteConfirmation" className="text-sm font-medium">
                    Type the confirmation text:
                  </Label>
                  <Input
                    id="deleteConfirmation"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="Type the confirmation text..."
                    className="font-mono"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">What happens next:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Backup data will be sent to admin: <strong>{adminUsers[barangayToDelete.id]?.email || 'No admin email'}</strong></li>
                        <li>• Barangay admin will be notified via email</li>
                        <li>• All barangay data will be permanently deleted</li>
                        <li>• This action cannot be undone</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDeleteDialogOpen(false);
                      setBarangayToDelete(null);
                      setDeleteConfirmation("");
                    }}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDelete}
                    disabled={isDeleting || !deleteConfirmation}
                    className="flex-1"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      "Delete Barangay"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
};

export default BarangaysPage;
