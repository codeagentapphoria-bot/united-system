import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import RefreshControls from "@/components/common/RefreshControls";
import { useCrudRefresh } from "@/hooks/useCrudRefresh";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Plus,
  MapPin,
  Users,
  Home,
  TrendingUp,
  BarChart3,
  Filter,
  Heart,
  PawPrint,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import useAuth from "@/hooks/useAuth";
import api from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { handleError, handleErrorSilently } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import AddPurokDialog from "@/features/barangay/puroks/components/AddPurokDialog";
import EditPurokDialog from "@/features/barangay/puroks/components/EditPurokDialog";
import DeleteConfirmationDialog from "@/features/barangay/puroks/components/DeleteConfirmationDialog";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const PuroksPage = () => {
  const { user } = useAuth();
  const { handleCrudSuccess, handleCrudError } = useCrudRefresh({
    autoRefresh: false, // Disabled to prevent double refresh - data is refreshed by individual CRUD operations
    clearCache: true,
    refreshDelay: 1500
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPurok, setSelectedPurok] = useState(null);
  const [purokToEdit, setPurokToEdit] = useState(null);
  const [purokToDelete, setPurokToDelete] = useState(null);
  const [puroks, setPuroks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purokStats, setPurokStats] = useState({});
  const [openDistribution, setOpenDistribution] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const [filterStatus, setFilterStatus] = useState("all"); // "all", "active", "inactive"
  const [sortBy, setSortBy] = useState("name"); // "name", "households", "residents", "pets"
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch puroks data
  const fetchPuroks = async () => {
    if (!user?.target_id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/list/${user.target_id}/purok`);
      const puroksData = response.data.data || [];
      logger.debug("Puroks data:", puroksData);
      setPuroks(puroksData);

      // Fetch statistics for each purok
      const statsPromises = puroksData.map(async (purok) => {
        try {
          const [householdStats, populationStats, familyStats, petStats] =
            await Promise.all([
              api.get("/statistics/total-households", {
                params: { purokId: purok.purok_id },
              }),
              api.get("/statistics/total-population", {
                params: { purokId: purok.purok_id },
              }),
              api.get("/statistics/total-families", {
                params: { purokId: purok.purok_id },
              }),
              api.get("/statistics/total-registered-pets", {
                params: { purokId: purok.purok_id },
              }),
            ]);

          return {
            purokId: purok.purok_id,
            households: safeParseInt(
              householdStats.data.data?.total_households,
              0
            ),
            residents: safeParseInt(
              populationStats.data.data?.total_population,
              0
            ),
            families: safeParseInt(familyStats.data.data?.total_families, 0),
            pets: safeParseInt(petStats.data.data?.total_pets, 0),
            addedThisMonth: safeParseInt(
              householdStats.data.data?.added_this_month,
              0
            ),
          };
        } catch (err) {
          handleErrorSilently(
            `Error fetching stats for purok ${purok.purok_id}:`,
            err
          );
          return {
            purokId: purok.purok_id,
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
        statsMap[stat.purokId] = stat;
      });
      setPurokStats(statsMap);
    } catch (err) {
      handleError("Error fetching puroks:", err);
      setError("Failed to fetch purok data");
      setPuroks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPuroks();
  }, [user?.target_id]);

  // Enhanced filtering and sorting
  const filteredAndSortedPuroks = puroks
    .filter((purok) => {
      const matchesSearch = 
        purok.purok_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        purok.purok_leader?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "active" && purok.status !== "inactive") ||
        (filterStatus === "inactive" && purok.status === "inactive");
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.purok_name?.toLowerCase() || "";
          bValue = b.purok_name?.toLowerCase() || "";
          break;
        case "households":
          aValue = purokStats[a.purok_id]?.households || 0;
          bValue = purokStats[b.purok_id]?.households || 0;
          break;
        case "residents":
          aValue = purokStats[a.purok_id]?.residents || 0;
          bValue = purokStats[b.purok_id]?.residents || 0;
          break;
        case "pets":
          aValue = purokStats[a.purok_id]?.pets || 0;
          bValue = purokStats[b.purok_id]?.pets || 0;
          break;
        default:
          aValue = a.purok_name?.toLowerCase() || "";
          bValue = b.purok_name?.toLowerCase() || "";
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

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

  const totalHouseholds = Object.values(purokStats).reduce(
    (sum, stat) => sum + safeParseInt(stat.households, 0),
    0
  );
  const totalResidents = Object.values(purokStats).reduce(
    (sum, stat) => sum + safeParseInt(stat.residents, 0),
    0
  );
  const totalAddedThisMonth = Object.values(purokStats).reduce(
    (sum, stat) => sum + safeParseInt(stat.addedThisMonth, 0),
    0
  );
  const totalPets = Object.values(purokStats).reduce(
    (sum, stat) => sum + safeParseInt(stat.pets, 0),
    0
  );

  const handleViewPurok = (purok) => {
    setSelectedPurok(purok);
    setIsViewDialogOpen(true);
  };

  const handleEditPurok = (purok) => {
    setPurokToEdit(purok);
    setIsEditDialogOpen(true);
  };

  const handleDeletePurok = (purok) => {
    setPurokToDelete(purok);
    setIsDeleteDialogOpen(true);
  };

  const handleAddSuccess = async (newPurok) => {
    setPuroks((prev) => [...prev, newPurok]);
    fetchPuroks();
    
    // Handle successful creation with auto-refresh
    await handleCrudSuccess('create', {
      message: `Purok ${newPurok.purok_name} has been created`
    });
  };

  const handleEditSuccess = async (updatedPurok) => {
    setPuroks((prev) =>
      prev.map((purok) =>
        purok.purok_id === updatedPurok.id
          ? { ...purok, ...updatedPurok }
          : purok
      )
    );
    fetchPuroks();
    
    // Handle successful update with auto-refresh
    await handleCrudSuccess('update', {
      message: `Purok ${updatedPurok.purok_name || 'information'} has been updated`
    });
  };

  const handleDeleteSuccess = async () => {
    fetchPuroks();
    
    // Handle successful deletion with auto-refresh
    await handleCrudSuccess('delete', {
      message: `Purok has been deleted successfully`
    });
  };

  const handleAccordionToggle = () => {
    setOpenDistribution((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner 
            message="Loading purok data..." 
            variant="default"
            size="lg"
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-red-600 mb-4 text-lg">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </div>
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
              Purok Overview
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              View purok subdivisions and their statistics
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <RefreshControls 
              variant="outline"
              size="sm"
            />
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Add Purok</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
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
                placeholder="Search puroks..."
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
                {filteredAndSortedPuroks.length} Purok{filteredAndSortedPuroks.length !== 1 ? "s" : ""}
              </span>
              <span className="text-gray-500 text-xs sm:text-sm">
                {filterStatus !== "all" && `(${filterStatus})`}
              </span>
              {loading && (
                <span className="text-xs sm:text-sm text-gray-500">
                  (Loading stats...)
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm">
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
                  {filteredAndSortedPuroks.slice(0, 5).map((purok) => {
                    const stats = purokStats[purok.purok_id] || {};
                    const residents = stats.residents || 0;
                    const percentage = totalResidents > 0 ? ((residents / totalResidents) * 100).toFixed(1) : 0;
                    return (
                      <div key={purok.purok_id} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium text-gray-900 truncate">
                            {purok.purok_name}
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
                  {filteredAndSortedPuroks.slice(0, 5).map((purok) => {
                    const stats = purokStats[purok.purok_id] || {};
                    const households = stats.households || 0;
                    const percentage = totalHouseholds > 0 ? ((households / totalHouseholds) * 100).toFixed(1) : 0;
                    return (
                      <div key={purok.purok_id} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium text-gray-900 truncate">
                            {purok.purok_name}
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
                  {filteredAndSortedPuroks.slice(0, 5).map((purok) => {
                    const stats = purokStats[purok.purok_id] || {};
                    const addedThisMonth = stats.addedThisMonth || 0;
                    const percentage = totalAddedThisMonth > 0 ? ((addedThisMonth / totalAddedThisMonth) * 100).toFixed(1) : 0;
                    return (
                      <div key={purok.purok_id} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium text-gray-900 truncate">
                            {purok.purok_name}
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
                  {filteredAndSortedPuroks.slice(0, 5).map((purok) => {
                    const stats = purokStats[purok.purok_id] || {};
                    const pets = stats.pets || 0;
                    const percentage = totalPets > 0 ? ((pets / totalPets) * 100).toFixed(1) : 0;
                    return (
                      <div key={purok.purok_id} className="space-y-1">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="font-medium text-gray-900 truncate">
                            {purok.purok_name}
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

        {/* Purok List - Grid or Table View */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedPuroks.map((purok) => (
              <Card key={purok.purok_id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm sm:text-base truncate">
                      {purok.purok_name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {purok.purok_leader && (
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Leader:</span> {purok.purok_leader}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <div className="font-semibold text-blue-700">
                        {purokStats[purok.purok_id]?.households || 0}
                      </div>
                      <div className="text-blue-600">Households</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="font-semibold text-green-700">
                        {purokStats[purok.purok_id]?.residents || 0}
                      </div>
                      <div className="text-green-600">Residents</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPurok(purok)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPurok(purok)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePurok(purok)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Purok List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm">Leader</TableHead>
                    <TableHead className="text-xs sm:text-sm">Households</TableHead>
                    <TableHead className="text-xs sm:text-sm">Residents</TableHead>
                    <TableHead className="text-xs sm:text-sm">Pets</TableHead>
                    <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPuroks.map((purok) => (
                    <TableRow key={purok.purok_id}>
                      <TableCell className="text-xs sm:text-sm font-medium">
                        {purok.purok_name}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {purok.purok_leader || "-"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {purokStats[purok.purok_id]?.households || 0}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {purokStats[purok.purok_id]?.residents || 0}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {purokStats[purok.purok_id]?.pets || 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPurok(purok)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPurok(purok)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePurok(purok)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* View Purok Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Purok Details</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Detailed information about {selectedPurok?.purok_name}
              </DialogDescription>
            </DialogHeader>
            {selectedPurok && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Purok Name
                    </Label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {selectedPurok.purok_name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Purok Leader
                    </Label>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {selectedPurok.purok_leader || "Not assigned"}
                    </p>
                  </div>
                </div>
                {selectedPurok.description && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Description
                    </Label>
                    <p className="text-gray-600 mt-1">
                      {selectedPurok.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Home className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-700">
                          {purokStats[selectedPurok.purok_id]?.households || 0}
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
                          {purokStats[selectedPurok.purok_id]?.residents || 0}
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
                          {purokStats[selectedPurok.purok_id]?.families || 0}
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
                          {purokStats[selectedPurok.purok_id]?.pets || 0}
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

        {/* Add Purok Dialog */}
        <AddPurokDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={handleAddSuccess}
          barangayId={user?.target_id}
        />

        {/* Edit Purok Dialog */}
        <EditPurokDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={handleEditSuccess}
          purok={purokToEdit}
          barangayId={user?.target_id}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onSuccess={handleDeleteSuccess}
          purok={purokToDelete}
        />
      </div>
    </>
  );
};

export default PuroksPage;
