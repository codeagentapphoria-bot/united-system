import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import RefreshControls from "@/components/common/RefreshControls";
import { useCrudRefresh } from "@/hooks/useCrudRefresh";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Crown,
  Users,
  Calendar,
  Phone,
  Mail,
  List,
  Network,
  Download,
  Settings,
  Maximize2,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import api from "@/utils/api";
import useAuth from "@/hooks/useAuth";
import OfficialsTable from "@/features/barangay/officials/components/OfficialsTable";
import OfficialsStats from "@/features/barangay/officials/components/OfficialsStats";
import AddOfficialDialog from "@/features/barangay/officials/components/AddOfficialDialog";
import OfficialsFilters from "@/features/barangay/officials/components/OfficialsFilters";
import ViewOfficialDialog from "@/features/barangay/officials/components/ViewOfficialDialog";
import EditOfficialDialog from "@/features/barangay/officials/components/EditOfficialDialog";
import DeleteConfirmationDialog from "@/features/barangay/officials/components/DeleteConfirmationDialog";
import LoadingSpinner from "@/components/common/LoadingSpinner";

const OfficialsPage = () => {
  const { user } = useAuth();
  const { handleCrudSuccess, handleCrudError } = useCrudRefresh({
    autoRefresh: false, // Disabled to prevent double refresh - data is refreshed by individual CRUD operations
    clearCache: true,
    refreshDelay: 1500
  });

  // Auto-refresh for officials operations
  const { handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'officials',
    successMessage: 'Official deleted successfully!',
    errorMessage: 'Failed to delete official',
    showToast: true,
    autoRefresh: true,
    refreshDelay: 100
  });
  const barangayId = user?.target_id;

  // State management
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filterPosition, setFilterPosition] = useState("all");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [officialToDelete, setOfficialToDelete] = useState(null);

  // Organizational chart state
  const [orgChartPath, setOrgChartPath] = useState(null);
  const [currentView, setCurrentView] = useState("list");
  const [orgChartLoading, setOrgChartLoading] = useState(false);
  const [orgChartModalOpen, setOrgChartModalOpen] = useState(false);

  // Fetch officials data
  const fetchOfficials = async () => {
    if (!barangayId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/list/${barangayId}/official`);
      setOfficials(res.data.data || []);
    } catch (err) {
      setError("Failed to fetch officials");
      setOfficials([]);
      toast({
        title: "Error",
        description: "Failed to fetch officials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficials();
  }, [barangayId]);

  // Fetch organizational chart
  const fetchOrgChart = async () => {
    if (!barangayId) return;

    setOrgChartLoading(true);
    try {
      const response = await api.get(`/${barangayId}/barangay`);
      const barangay = response.data.data;
      if (barangay.organizational_chart_path) {
        const SERVER_URL =
          import.meta.env.VITE_SERVER_URL || "http://13.211.71.85";
        setOrgChartPath(`${SERVER_URL}/${barangay.organizational_chart_path}`);
      } else {
        setOrgChartPath(null);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching organizational chart:", error);
}
      setOrgChartPath(null);
    } finally {
      setOrgChartLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgChart();
  }, [barangayId]);

  // Debounce search term
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle search input change
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  // Filter officials based on search and filters
  const filteredOfficials = useMemo(() => {
    return officials.filter((official) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        `${official.first_name} ${official.last_name}`
          .toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        official.position
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        official.committee
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase());

      const matchesPosition =
        filterPosition === "all" || official.position === filterPosition;

      return matchesSearch && matchesPosition;
    });
  }, [officials, debouncedSearchTerm, filterPosition]);

  // Get unique positions for filter
  const positions = useMemo(() => {
    return [...new Set(officials.map((o) => o.position).filter(Boolean))];
  }, [officials]);

  // Handle view official
  const handleView = (official) => {
    setSelectedOfficial(official);
    setIsViewDialogOpen(true);
  };

  // Handle edit official
  const handleEdit = (official) => {
    setSelectedOfficial(official);
    setIsEditDialogOpen(true);
  };

  // Handle delete official
  const handleDelete = (official) => {
    setOfficialToDelete(official);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!officialToDelete) return;

    try {
      await handleCRUDOperation(
        async () => api.delete(`/${officialToDelete.official_id}/official`),
        {}
      );
      
      // Handle successful deletion with auto-refresh
      await handleCrudSuccess('delete', {
        message: `Official ${officialToDelete.full_name || officialToDelete.official_id} has been deleted`
      });
      
      setOfficials(
        officials.filter((o) => o.official_id !== officialToDelete.official_id)
      );
      setIsDeleteDialogOpen(false);
      setOfficialToDelete(null);
    } catch (err) {
      handleCrudError(err, 'delete');
    }
  };

  // Handle add official success
  const handleAddSuccess = async () => {
    // Refresh the officials list instead of trying to add the new official
    fetchOfficials();
    setIsAddDialogOpen(false);
    
    // Handle successful creation with auto-refresh
    await handleCrudSuccess('create', {
      message: 'New official has been added successfully'
    });
  };

  // Handle edit official success
  const handleEditSuccess = async () => {
    // Refresh the officials list instead of trying to update the specific official
    fetchOfficials();
    setIsEditDialogOpen(false);
    setSelectedOfficial(null);
    
    // Handle successful update with auto-refresh
    await handleCrudSuccess('update', {
      message: `Official ${selectedOfficial?.full_name || 'information'} has been updated`
    });
  };

  // Download organizational chart
  const downloadOrgChart = async () => {
    if (!orgChartPath) return;
    
    try {
      const response = await fetch(orgChartPath);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "organizational-chart.png";
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

  // Refresh organizational chart when switching to that tab
  const handleTabChange = (value) => {
    setCurrentView(value);
    if (value === "orgChart") {
      fetchOrgChart(); // Refresh org chart when switching to that tab
    }
  };



  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
            {currentView === "list"
              ? "Barangay Officials"
              : "Organizational Chart"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {currentView === "list"
              ? "Manage and track barangay officials and their positions"
              : "Visual representation of the barangay's organizational structure"}
          </p>
        </div>
        {currentView === "list" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <RefreshControls 
              variant="outline"
              size="sm"
            />
            <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Add Official</span>
            <span className="sm:hidden">Add</span>
          </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <Tabs
        value={currentView}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <List className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Officials List</span>
            <span className="sm:hidden">List</span>
          </TabsTrigger>
          <TabsTrigger value="orgChart" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Network className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Organizational Chart</span>
            <span className="sm:hidden">Chart</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {/* Stats */}
          <OfficialsStats officials={officials} />

          {/* Filters */}
          <OfficialsFilters
            searchTerm={searchTerm}
            setSearchTerm={handleSearchChange}
            filterPosition={filterPosition}
            setFilterPosition={setFilterPosition}
            positions={positions}
            isSearching={isSearching}
          />

          {/* Officials Table */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Officials Directory</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Total officials: {filteredOfficials.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OfficialsTable
                officials={filteredOfficials}
                loading={loading}
                error={error}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orgChart" className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg sm:text-xl">Organizational Chart</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Visual representation of the barangay's organizational structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orgChartLoading ? (
                <LoadingSpinner 
                  message="Loading organizational chart..." 
                  variant="default"
                  size="default"
                />
              ) : orgChartPath ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-full max-w-4xl">
                    <div 
                      className="relative group cursor-pointer rounded-lg overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-200"
                      onClick={() => setOrgChartModalOpen(true)}
                    >
                      <img
                        src={orgChartPath}
                        alt="Organizational Chart"
                        className="w-full h-auto"
                        style={{ maxHeight: "70vh" }}
                      />
                      {/* Overlay with maximize icon on hover */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <Maximize2 className="h-12 w-12 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => setOrgChartModalOpen(true)}
                      className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">View Full Size</span>
                      <span className="sm:hidden">View</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadOrgChart}
                      className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Download</span>
                      <span className="sm:hidden">Download</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-3 sm:space-y-4">
                  <Network className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
                  <div className="text-center">
                    <h3 className="text-base sm:text-lg font-semibold text-muted-foreground">
                      No Organizational Chart Available
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Upload an organizational chart in the Settings page to
                      view it here.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Navigate to settings page
                      window.location.href = "/admin/barangay/settings";
                    }}
                    className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
                  >
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Go to Settings</span>
                    <span className="sm:hidden">Settings</span>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddOfficialDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleAddSuccess}
        barangayId={barangayId}
        existingOfficials={officials}
      />

      <ViewOfficialDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        official={selectedOfficial}
      />

      <EditOfficialDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        official={selectedOfficial}
        onSuccess={handleEditSuccess}
        barangayId={barangayId}
        existingOfficials={officials}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        official={officialToDelete}
        onConfirm={handleDeleteConfirm}
      />

      {/* Organization Chart Image Modal */}
      <Dialog open={orgChartModalOpen} onOpenChange={setOrgChartModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black">
          <div className="relative w-full h-full">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70 h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setOrgChartModalOpen(false)}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            
            {/* Maximized Organization Chart */}
            {orgChartPath ? (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={orgChartPath}
                  alt="Organizational Chart - Full Size"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-full flex items-center justify-center text-white" style={{ display: 'none' }}>
                  <div className="text-center">
                    <Network className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-2" />
                    <p className="text-sm sm:text-base">Image could not be loaded</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Network className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-2" />
                  <p className="text-sm sm:text-base text-white">No organizational chart available</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfficialsPage;
