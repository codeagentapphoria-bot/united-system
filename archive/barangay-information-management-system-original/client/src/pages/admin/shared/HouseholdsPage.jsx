import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import logger from "@/utils/logger";
import { useCacheManager } from "@/hooks/useCacheManager";
import CacheRefreshHandler from "@/components/common/CacheRefreshHandler";
import RefreshControls from "@/components/common/RefreshControls";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  Settings,
  MapPin,
  Users,
  RefreshCw,
  Activity,
  Image,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/api";

// Import reusable components
import HouseholdStats from "@/features/household/components/HouseholdStats";
import HouseholdTable from "@/features/household/components/HouseholdTable";
import HouseholdForm from "@/features/household/components/HouseholdForm";
import HouseholdDetailsForm from "@/features/household/components/HouseholdDetailsForm";
import HouseholdFamiliesForm from "@/features/household/components/HouseholdFamiliesForm";
import HouseholdLocationForm from "@/features/household/components/HouseholdLocationForm";
import HouseholdImagesForm from "@/features/household/components/HouseholdImagesForm";
import HouseholdViewDialog from "@/features/household/components/HouseholdViewDialog";
import HouseholdsFilters from "@/features/household/components/HouseholdsFilters";
import DeleteConfirmationDialog from "@/features/household/components/DeleteConfirmationDialog";

// Import custom hooks
import { useHouseholds } from "@/features/household/hooks/useHouseholds";
import { useHouseholdUpdates } from "@/features/household/hooks/useHouseholdUpdates";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";

const HouseholdsPage = () => {
  const { user } = useAuth();
  const { clearAllCaches } = useCacheManager();
  // Set up unified auto refresh for households data
  const { registerRefreshCallback, handleCRUDOperation, triggerRefresh } = useUnifiedAutoRefresh({
    entityType: 'household',
    successMessage: 'Household operation completed successfully!',
    autoRefresh: true,
    refreshDelay: 100
  });

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [householdToDelete, setHouseholdToDelete] = useState(null);
  
  // Ref to track if any modal is open to prevent auto-refresh
  const isAnyModalOpen = useRef(false);

  // Separate edit dialogs for different groups
  const [editInfoDialogOpen, setEditInfoDialogOpen] = useState(false);
  const [editDetailsDialogOpen, setEditDetailsDialogOpen] = useState(false);
  const [editFamiliesDialogOpen, setEditFamiliesDialogOpen] = useState(false);
  const [editLocationDialogOpen, setEditLocationDialogOpen] = useState(false);
  const [editImagesDialogOpen, setEditImagesDialogOpen] = useState(false);

  // Puroks state for filters
  const [puroks, setPuroks] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Pagination state
  const [total, setTotal] = useState(0);

  // Update tracking
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [updateHistory, setUpdateHistory] = useState([]);

  // Export/Import states
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Custom hook for household management
  const {
    households,
    selectedHousehold,
    setSelectedHousehold,
    loading,
    searchTerm,
    filterPurok,
    filterHousingType,
    sortBy,
    sortOrder,
    page,
    perPage,
    pagination,
    setSearchTerm,
    setFilterPurok,
    setFilterHousingType,
    setSortBy,
    setSortOrder,
    setPage,
    setPerPage,
    handleSort,
    fetchHousehold,
    createHousehold,
    updateHousehold,
    deleteHousehold,
    bulkUpdateHouseholds,
    refreshData,
    registerUpdateCallback,
  } = useHouseholds();

  // Update ref when modal states change
  useEffect(() => {
    isAnyModalOpen.current = isViewDialogOpen || isEditDialogOpen || isDeleteDialogOpen;
  }, [isViewDialogOpen, isEditDialogOpen, isDeleteDialogOpen]);

  // Register refresh callback for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(() => {
      // Only refresh if no modals are open
      if (!isAnyModalOpen.current) {
        refreshData();
      }
    });
    return () => {
      unregister();
    };
  }, [registerRefreshCallback, refreshData]);

  // Enhanced update hook
  const {
    isUpdating: isEnhancedUpdating,
    updateProgress,
    lastUpdate: enhancedLastUpdate,
    createHousehold: enhancedCreateHousehold,
    updateHousehold: enhancedUpdateHousehold,
    deleteHousehold: enhancedDeleteHousehold,
    validateHouseholdData,
    transformHouseholdData,
    getUpdateStats,
    getLocalHistory,
    exportAuditLog,
  } = useHouseholdUpdates();

  // Update callback to track changes
  const handleUpdateCallback = useCallback(
    async (action, data) => {
      const timestamp = new Date().toISOString();
      setLastUpdateTime(timestamp);

      const updateRecord = {
        id: Date.now(),
        action,
        data,
        timestamp,
        user: user?.email || "Unknown",
      };

      setUpdateHistory((prev) => [updateRecord, ...prev.slice(0, 49)]); // Keep last 50 updates

      // Log update for debugging
              logger.debug(`Household ${action}:`, data);

      // Additional functionality based on action type
      switch (action) {
        case "create":
          // Trigger any post-creation logic
          break;
        case "update":
          // Trigger any post-update logic
          break;
        case "delete":
          // Trigger any post-deletion logic
          break;
        case "bulk_update":
          // Trigger any post-bulk-update logic
          break;
        default:
          break;
      }
    },
    [user]
  );

  // Register update callback
  useEffect(() => {
    const unregister = registerUpdateCallback(handleUpdateCallback);
    return unregister;
  }, [registerUpdateCallback, handleUpdateCallback]);

  // Register refresh callback for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(() => {
      // Only refresh if no modals are open
      if (!isAnyModalOpen.current) {
        refreshData();
      }
    });
    return unregister;
  }, [registerRefreshCallback, refreshData]);

  // Pagination controls
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // Fetch puroks for filters
  useEffect(() => {
    const fetchPuroks = async () => {
      try {
        const response = await api.get(`/list/${user.target_id}/purok`);
        setPuroks(response.data.data || []);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
  console.error("Failed to fetch puroks:", error);
}
      }
    };

    fetchPuroks();
  }, [user.target_id]);

  // Fetch barangays for filter
  useEffect(() => {
    api
      .get(`/list/barangay`)
      .then((res) => {
        setBarangays(res.data.data || []);
      })
      .catch(() => setBarangays([]));
  }, []);

  // Update total count when pagination changes
  useEffect(() => {
    if (pagination) {
      setTotal(pagination.totalRecords || 0);
    }
  }, [pagination]);

  // Enhanced add household handler with validation
  const handleAddHousehold = async (householdData) => {
    // Validate data before submission
    const validation = validateHouseholdData(householdData);
    if (!validation.isValid) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Validation failed:", validation.errors);
}
      return false;
    }

    // Transform data for API
    const transformedData = transformHouseholdData(householdData);

    const success = await enhancedCreateHousehold(transformedData);
    if (success) {
      setIsAddDialogOpen(false);
      // Auto refresh will be triggered by the backend cache invalidation
    }
    return success;
  };

  // Enhanced edit household handler with validation
  const handleEditHousehold = async (householdData) => {
    if (!selectedHousehold) return false;

    // Validate data before submission
    const validation = validateHouseholdData(householdData);
    if (!validation.isValid) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Validation failed:", validation.errors);
}
      return false;
    }

    // Transform data for API
    const transformedData = transformHouseholdData(householdData);

    const success = await enhancedUpdateHousehold(
      selectedHousehold.household_id,
      transformedData,
      selectedHousehold, // Pass the old data
      {
        optimistic: true,
        showToast: true,
        onProgress: (progress, message) => {
          logger.debug(`Update progress: ${progress}% - ${message}`);
        },
      }
    );
    if (success) {
      setIsEditDialogOpen(false);
      setSelectedHousehold(null);
      // Auto refresh will be triggered by the backend cache invalidation
    }
    return success;
  };

  // Enhanced edit specific groups handlers
  const handleEditInfo = async (household) => {
    const householdData = await fetchHousehold(household.household_id);
    if (householdData) {
      setSelectedHousehold(householdData);
      setEditInfoDialogOpen(true);
    }
  };

  const handleEditDetails = async (household) => {
    const householdData = await fetchHousehold(household.household_id);
    if (householdData) {
      setSelectedHousehold(householdData);
      setEditDetailsDialogOpen(true);
      setIsViewDialogOpen(false); // Close the view dialog when opening details
    }
  };

  const handleEditFamilies = async (household) => {
    if (process.env.NODE_ENV === 'development') {
  console.log("handleEditFamilies called with household:", household);
}
    const householdData = await fetchHousehold(household.household_id);
    if (process.env.NODE_ENV === 'development') {
  console.log("Fetched household data:", householdData);
}
    if (householdData) {
      setSelectedHousehold(householdData);
      setEditFamiliesDialogOpen(true);
      setIsViewDialogOpen(false); // Close the view dialog when opening families
    }
  };

  const handleEditLocation = async (household) => {
    const householdData = await fetchHousehold(household.household_id);
    if (householdData) {
      setSelectedHousehold(householdData);
      setEditLocationDialogOpen(true);
      setIsViewDialogOpen(false); // Close the view dialog when opening location
    }
  };

  const handleEditImages = async (household) => {
    const householdData = await fetchHousehold(household.household_id);
    if (householdData) {
      setSelectedHousehold(householdData);
      setEditImagesDialogOpen(true);
      setIsViewDialogOpen(false); // Close the view dialog when opening images
    }
  };

  // Enhanced view household handler
  const handleView = async (householdId) => {
    const household = await fetchHousehold(householdId);
    if (household) {
      setSelectedHousehold(household);
      setIsViewDialogOpen(true);
    }
  };

  // Enhanced edit from view dialog
  const handleEditFromView = () => {
    setIsViewDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  // Enhanced edit household handler
  const handleEdit = async (householdId) => {
    const household = await fetchHousehold(householdId);
    if (household) {
      setIsEditDialogOpen(true);
    }
  };

  // Enhanced delete confirmation handler
  const handleDeleteConfirm = (household) => {
    setHouseholdToDelete(household);
    setIsDeleteDialogOpen(true);
    setIsViewDialogOpen(false); // Close the view dialog when opening delete confirmation
  };

  // Enhanced delete execution handler
  const handleDeleteExecute = async () => {
    if (!householdToDelete) return;

    try {
      const success = await enhancedDeleteHousehold(
        householdToDelete.household_id
      );
      
      if (success) {
        await handleCRUDOperation(
          async (data) => {
            return success; // The delete operation was already completed above
          },
          { household_id: householdToDelete.household_id },
          'delete'
        );

        setIsDeleteDialogOpen(false);
        setHouseholdToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete household:', error);
    }
  };

  // Enhanced form submission handlers with validation
  const handleDetailsSubmit = async (data) => {
    if (!selectedHousehold) return false;

    // Transform data - use the house_head from the form data, not the original household
    const transformedData = transformHouseholdData(data);

    logger.debug(
      "Details update payload:",
      selectedHousehold.household_id,
      transformedData,
      selectedHousehold
    );
    const success = await enhancedUpdateHousehold(
      selectedHousehold.household_id,
      transformedData,
      selectedHousehold, // Pass the old data
      { optimistic: true, showToast: false }
    );
    if (success) {
      setEditDetailsDialogOpen(false);
      setSelectedHousehold(null);
      // Auto refresh will be triggered by the backend cache invalidation
    }
    return success;
  };

  const handleFamiliesSubmit = async (data) => {
    if (!selectedHousehold) return false;

    // Validate data
    const validation = validateHouseholdData(data);
    if (!validation.isValid) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Validation failed:", validation.errors);
}
      return false;
    }

    // Transform data - use the house_head from the form data
    const transformedData = transformHouseholdData(data);

    const success = await enhancedUpdateHousehold(
      selectedHousehold.household_id,
      transformedData,
      selectedHousehold, // Pass the old data
      { optimistic: true, showToast: false }
    );
    if (success) {
      setEditFamiliesDialogOpen(false);
      setSelectedHousehold(null);
      // Auto refresh will be triggered by the backend cache invalidation
    }
    return success;
  };

  const handleLocationSubmit = async (data) => {
    if (!selectedHousehold) return false;

    // Validate data
    const validation = validateHouseholdData(data);
    if (!validation.isValid) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Validation failed:", validation.errors);
}
      return false;
    }

    // Transform data - use the house_head from the form data
    const transformedData = transformHouseholdData(data);

    const success = await enhancedUpdateHousehold(
      selectedHousehold.household_id,
      transformedData,
      selectedHousehold, // Pass the old data
      { optimistic: true, showToast: false }
    );
    if (success) {
      setEditLocationDialogOpen(false);
      setSelectedHousehold(null);
      // Auto refresh will be triggered by the backend cache invalidation
    }
    return success;
  };

  const handleImagesSubmit = async (data) => {
    if (!selectedHousehold) return false;

    // Handle FormData differently - don't transform it
    let transformedData;
    if (data instanceof FormData) {
      // For FormData, pass it directly without transformation
      transformedData = data;
    } else {
      // For regular objects, transform as usual
      transformedData = transformHouseholdData(data);
    }

    const success = await enhancedUpdateHousehold(
      selectedHousehold.household_id,
      transformedData,
      selectedHousehold, // Pass the old data
      { optimistic: true, showToast: false }
    );
    if (success) {
      setEditImagesDialogOpen(false);
      setSelectedHousehold(null);
      // Auto refresh will be triggered by the backend cache invalidation
    }
    return success;
  };

  // Export households function
  const handleExportHouseholds = async () => {
    try {
      setExportLoading(true);

      // Prepare filter parameters
      const params = {
        ...(user.target_type === "barangay"
          ? {
              purokId:
                filterPurok === "all" ? undefined : filterPurok || undefined,
            }
          : {
              barangayId:
                filterPurok === "all" ? undefined : filterPurok || undefined,
            }),
        search: searchTerm || undefined,
      };

      // Determine the export URL based on user role
      let exportUrl;
      if (user.target_type === "municipality") {
        exportUrl = "/export/households";
      } else {
        exportUrl = `/export/${user.target_id}/households`;
      }

      const response = await api.get(exportUrl, {
        params,
        responseType: "blob",
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Set filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const prefix =
        user.target_type === "municipality"
          ? "municipality-households"
          : "households";
      link.setAttribute("download", `${prefix}-export-${timestamp}.xlsx`);

      // Trigger download
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Households data has been exported successfully.",
      });

      setIsExportDialogOpen(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Export error:", error);
}
      toast({
        title: "Export Failed",
        description: "Failed to export households data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Import households function
  const handleImportHouseholds = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to import.",
        variant: "destructive",
      });
      return;
    }

    try {
      setImportLoading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("barangayId", user.target_id);

      const response = await api.post(
        `/import/${user.target_id}/households`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast({
        title: "Import Successful",
        description: `${response.data.importedCount} households imported successfully.`,
      });

      setIsImportDialogOpen(false);
      setSelectedFile(null); // Reset selected file
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Import error:", error);
}
      toast({
        title: "Import Failed",
        description:
          error.response?.data?.message ||
          "Failed to import households data. Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Cache refresh handler for households page */}
      <CacheRefreshHandler page="households" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Household Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage household information and family groups
          </p>
          {lastUpdateTime && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastUpdateTime).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <RefreshControls 
            variant="outline"
            size="sm"
          />
          {/* Export Button */}
                      <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(true)}
              disabled={exportLoading}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              {exportLoading ? (
                <LoadingSpinner message="Exporting..." variant="default" size="sm" compact={true} />
              ) : (
                "Export"
              )}
            </Button>

          {/* Import Button */}
          {user.target_type === "barangay" && (
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              disabled={importLoading}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
              {importLoading ? (
                <LoadingSpinner message="Importing..." variant="default" size="sm" compact={true} />
              ) : (
                "Import"
              )}
            </Button>
          )}

          {/* Add Household Dialog */}
          {user.target_type === "barangay" && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" className="gap-2 text-xs sm:text-sm">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                  Add Household
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Household</DialogTitle>
                  <DialogDescription>
                    Fill in the required information to add a new household
                  </DialogDescription>
                </DialogHeader>
                <HouseholdForm
                  mode="add"
                  onSubmit={handleAddHousehold}
                  onCancel={() => setIsAddDialogOpen(false)}
                  loading={loading || isEnhancedUpdating}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Update Progress Indicator */}
      {isEnhancedUpdating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <LoadingSpinner 
              message={`Updating household data... ${updateProgress}%`}
              variant="default"
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <HouseholdsFilters
        searchInput={searchTerm}
        setSearchInput={setSearchTerm}
        filterPurok={filterPurok}
        setFilterPurok={setFilterPurok}
        filterHousingType={filterHousingType}
        setFilterHousingType={setFilterHousingType}
        puroks={puroks}
        barangays={barangays.data || []}
        setPage={setPage}
        role={user.target_type}
      />

      {/* Stats Cards */}
      <HouseholdStats
        households={households}
        filterPurok={filterPurok}
        filterHousingType={filterHousingType}
      />

      {/* Households Table */}
      <HouseholdTable
        households={households}
        loading={loading || isEnhancedUpdating}
        onView={handleView}
        onEdit={handleEdit}
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

      {/* View Household Dialog */}
      <HouseholdViewDialog
        household={selectedHousehold}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onEdit={handleEditFromView}
        onEditInfo={handleEditInfo}
        onEditDetails={handleEditDetails}
        onEditFamilies={handleEditFamilies}
        onEditLocation={handleEditLocation}
        onEditImages={handleEditImages}
        onDelete={handleDeleteConfirm}
        loading={loading || isEnhancedUpdating}
        hideActions={user?.target_type === "municipality"}
      />

      {/* Edit Household Dialogs */}

      {/* Edit Info Dialog */}
      <Dialog open={editInfoDialogOpen} onOpenChange={setEditInfoDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Household Information</DialogTitle>
            <DialogDescription>
              Update basic household information
            </DialogDescription>
          </DialogHeader>
          <HouseholdForm
            mode="edit"
            initialData={selectedHousehold}
            onSubmit={handleEditHousehold}
            onCancel={() => {
              setEditInfoDialogOpen(false);
              setSelectedHousehold(null);
            }}
            loading={loading || isEnhancedUpdating}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog
        open={editDetailsDialogOpen}
        onOpenChange={setEditDetailsDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Housing Details</DialogTitle>
            <DialogDescription>
              Update housing details and utilities
            </DialogDescription>
          </DialogHeader>
          {selectedHousehold ? (
            <HouseholdDetailsForm
              household={selectedHousehold}
              onSubmit={handleDetailsSubmit}
              onCancel={() => {
                setEditDetailsDialogOpen(false);
                setSelectedHousehold(null);
              }}
              loading={loading || isEnhancedUpdating}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Families Dialog */}
      <Dialog
        open={editFamiliesDialogOpen}
        onOpenChange={setEditFamiliesDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Family Groups</DialogTitle>
            <DialogDescription>
              Update family groups and members
            </DialogDescription>
          </DialogHeader>
          {selectedHousehold ? (
            <HouseholdFamiliesForm
              household={selectedHousehold}
              onSubmit={handleFamiliesSubmit}
              onCancel={() => {
                setEditFamiliesDialogOpen(false);
                setSelectedHousehold(null);
              }}
              loading={loading || isEnhancedUpdating}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog
        open={editLocationDialogOpen}
        onOpenChange={setEditLocationDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update location and map coordinates
            </DialogDescription>
          </DialogHeader>
          {selectedHousehold ? (
            <HouseholdLocationForm
              household={selectedHousehold}
              onSubmit={handleLocationSubmit}
              onCancel={() => {
                setEditLocationDialogOpen(false);
                setSelectedHousehold(null);
              }}
              loading={loading || isEnhancedUpdating}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Edit Images Dialog */}
      <Dialog
        open={editImagesDialogOpen}
        onOpenChange={setEditImagesDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Images</DialogTitle>
            <DialogDescription>
              Update household images and documents
            </DialogDescription>
          </DialogHeader>
          {selectedHousehold ? (
            <HouseholdImagesForm
              household={selectedHousehold}
              onSubmit={handleImagesSubmit}
              onCancel={() => {
                setEditImagesDialogOpen(false);
                setSelectedHousehold(null);
              }}
              loading={loading || isEnhancedUpdating}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Export Households Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-blue-600" />
              <span>Export Households</span>
            </DialogTitle>
            <DialogDescription>
              Download all households data in Excel format for backup or
              analysis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                📊 Data Included in Export
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Complete household information</p>
                <p>• Family groups and members</p>
                <p>• Location and coordinates</p>
                <p>• Housing details and utilities</p>
                <p>• Images and documents</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>File Format:</strong> Excel (.xlsx) with organized
                worksheets
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Filename:</strong> households-export-YYYY-MM-DD.xlsx
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(false)}
                disabled={exportLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportHouseholds}
                disabled={exportLoading}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                <span>
                  {exportLoading ? (
                    <LoadingSpinner message="Exporting..." variant="default" size="sm" compact={true} />
                  ) : (
                    "Export Households"
                  )}
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Households Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-green-600" />
              <span>Import Households</span>
            </DialogTitle>
            <DialogDescription>
              Import households data from an Excel file. Follow the step-by-step process below.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Indicator - Similar to AddHouseholdDialog */}
          <div className="mb-6">
            <Progress value={selectedFile ? 66 : 33} />
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 text-xs mt-1">
              <span className={!selectedFile ? "font-bold" : "text-muted-foreground"}>
                Step 1: Review Requirements
              </span>
              <span className={selectedFile && !importLoading ? "font-bold" : "text-muted-foreground"}>
                Step 2: Select File
              </span>
              <span className={importLoading ? "font-bold" : "text-muted-foreground"}>
                Step 3: Import Data
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Step 1: Import Guide */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <span>Import Requirements & Format</span>
              </div>
              
                             <div className="grid grid-cols-1 gap-4 lg:gap-6">
                 {/* Required Fields Section */}
                 <div className="space-y-3">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                     <h4 className="font-semibold text-red-700">Required Fields</h4>
                   </div>
                   <div className="space-y-2">
                     {[
                       { field: "house_head_name", label: "House Head Name", desc: "Full name of household head (must exist in residents - exact match required)" },
                       { field: "purok_name", label: "Purok Name", desc: "Purok name (must exist in puroks)" },
                       { field: "electricity", label: "Electricity Status", desc: "Electricity availability (Yes/No)" }
                     ].map((item) => (
                       <div key={item.field} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                         <code className="text-xs font-mono bg-red-100 px-1 py-0.5 rounded text-red-700 min-w-[120px]">
                           {item.field}
                         </code>
                         <div className="text-xs">
                           <div className="font-medium text-red-800">{item.label}</div>
                           <div className="text-red-600">{item.desc}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* Optional Fields Section */}
                 <div className="space-y-3">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                     <h4 className="font-semibold text-blue-700">Optional Fields</h4>
                   </div>
                   <div className="space-y-2">
                     {[
                       { field: "house_number", label: "House Number", desc: "Unique household number" },
                       { field: "street", label: "Street Address", desc: "Complete street address" },
                       { field: "housing_type", label: "Housing Type", desc: "Type of housing (Owned, Rented, Shared, Caretaker)" },
                       { field: "structure_type", label: "Structure Type", desc: "Building structure (Concrete, Wood, Bamboo, Mixed, Other)" },
                       { field: "water_source", label: "Water Source", desc: "Source of water" },
                       { field: "toilet_facility", label: "Toilet Facility", desc: "Type of toilet facility" },
                       { field: "latitude", label: "Latitude", desc: "GPS latitude coordinate" },
                       { field: "longitude", label: "Longitude", desc: "GPS longitude coordinate" },
                       { field: "area", label: "Area (sqm)", desc: "Area in square meters" },
                       { field: "family_members", label: "Family Members", desc: "Additional family members (names must match residents exactly)" }
                     ].map((item) => (
                       <div key={item.field} className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                         <code className="text-xs font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-700 min-w-[120px]">
                           {item.field}
                         </code>
                         <div className="text-xs">
                           <div className="font-medium text-blue-800">{item.label}</div>
                           <div className="text-blue-600">{item.desc}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>

                             {/* Valid Values Guide */}
               <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                 <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                   <div className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold">
                     !
                   </div>
                   Valid Values Guide
                 </h4>
                 <div className="grid grid-cols-1 gap-4 text-sm">
                   {[
                     { field: "electricity", values: ["Yes", "No"], note: "case-insensitive" },
                     { field: "housing_type", values: ["Owned", "Rented", "Shared", "Caretaker"], note: "exact values" },
                     { field: "structure_type", values: ["Concrete", "Wood", "Bamboo", "Mixed", "Other"], note: "exact values" },
                     { field: "water_source", values: ["Deep Well", "Water District", "Spring", "Rainwater"], note: "examples" },
                     { field: "toilet_facility", values: ["Flush", "Water Sealed", "Pit", "None"], note: "examples" },
                                           { field: "family_members", values: ["Juan Santos Dela Cruz:Spouse;Pedro S. Dela Cruz:Son;Ana Dela Cruz:Daughter"], note: "format example (exact names)" }
                   ].map((item) => (
                     <div key={item.field} className="space-y-1">
                       <div className="font-medium text-amber-800">
                         <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-700">{item.field}</code>:
                       </div>
                       <div className="text-amber-700 text-xs">
                         {item.values.join(", ")} <span className="text-amber-600">({item.note})</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

                             {/* File Requirements */}
               <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                 <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                   <div className="w-5 h-5 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold">
                     📄
                   </div>
                   File Requirements
                 </h4>
                 <ul className="text-sm text-gray-700 space-y-1">
                   <li>• Excel format (.xlsx) only</li>
                   <li>• First row must contain column headers</li>
                   <li>• Maximum 500 households per import</li>
                   <li>• <strong>Required:</strong> House head name, purok name, and electricity status</li>
                   <li>• House head must exist in residents table first</li>
                   <li>• Purok name must exist in the system</li>
                   <li>• Family members must exist in residents table first</li>
                   <li>• Use full names as they appear in the residents table</li>
                   <li>• Use purok names as they appear in the puroks table</li>
                   <li>• Coordinates (latitude/longitude) should be decimal format</li>
                 </ul>
               </div>

                               {/* Name Format Requirements */}
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <div className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                      👤
                    </div>
                    Name Format Requirements
                  </h4>
                  <div className="text-sm text-orange-800 space-y-2">
                    <p><strong>Important:</strong> Names must match exactly as they appear in the residents table.</p>
                    <div className="space-y-1">
                      <p className="font-medium">Accepted Formats:</p>
                      <ul className="ml-4 space-y-1 text-xs">
                        <li>• <strong>Complete Name:</strong> "Juan Santos Dela Cruz" (with full middle name)</li>
                        <li>• <strong>Middle Initial:</strong> "Juan S. Dela Cruz" (with middle initial)</li>
                        <li>• <strong>No Middle Name:</strong> "Juan Dela Cruz" (without middle name)</li>
                        <li>• <strong>With Suffix:</strong> "Juan Dela Cruz Jr." (with suffix)</li>
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">Examples:</p>
                      <ul className="ml-4 space-y-1 text-xs">
                        <li>• If resident is "Juan Santos Dela Cruz" → Use "Juan Santos Dela Cruz"</li>
                        <li>• If resident is "Juan S. Dela Cruz" → Use "Juan S. Dela Cruz"</li>
                        <li>• If resident is "Juan Dela Cruz" → Use "Juan Dela Cruz"</li>
                        <li>• <span className="text-red-600 font-medium">❌ Don't use "Juan Dela Cruz" if resident is "Juan S. Dela Cruz"</span></li>
                      </ul>
                    </div>
                    <div className="space-y-1 mt-3 p-2 bg-orange-100 rounded">
                      <p className="font-medium text-orange-900">💡 <strong>Tip:</strong> To check exact resident names:</p>
                      <ul className="ml-4 space-y-1 text-xs text-orange-800">
                        <li>• Go to Residents page and view the resident details</li>
                        <li>• Copy the exact name as shown in the resident profile</li>
                        <li>• Use that exact name in your import file</li>
                        <li>• The system will try multiple name format combinations automatically</li>
                      </ul>
                    </div>
                  </div>
                </div>
            </div>

            {/* Step 2: Download Template & File Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <span>Download Template & Select File</span>
              </div>

              {/* Download Template */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  Download our template to ensure your data is in the correct format.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                                         // Create and download template
                     const templateData = [
                       {
                         house_head_name: "Juan Santos Dela Cruz",
                         purok_name: "Purok 1",
                         electricity: "Yes",
                         house_number: "HH001",
                         street: "123 Main Street",
                         housing_type: "Owned",
                         structure_type: "Concrete",
                         water_source: "Deep Well",
                         toilet_facility: "Flush",
                         latitude: "14.5995",
                         longitude: "120.9842",
                         area: "80",
                         family_members:
                           "Maria Santos Dela Cruz:Spouse;Pedro S. Dela Cruz:Son;Ana Dela Cruz:Daughter",
                       },
                     ];

                    const workbook = XLSX.utils.book_new();
                    const sheet = XLSX.utils.json_to_sheet(templateData);
                    XLSX.utils.book_append_sheet(workbook, sheet, "Template");

                    XLSX.writeFile(workbook, "households-import-template.xlsx");
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-green-600" />
                  <Label htmlFor="import-file" className="text-base font-medium">Select Excel File</Label>
                </div>
                <Input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setSelectedFile(file);
                  }}
                  disabled={importLoading}
                  className="border-2 border-dashed border-green-200 hover:border-green-300 transition-colors"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Supported formats: .xlsx, .xls (Max size: 10MB)
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700 font-medium">
                      ✓ Selected: {selectedFile.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Import Action */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <span>Import Data</span>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setSelectedFile(null);
                  }}
                  disabled={importLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportHouseholds}
                  disabled={importLoading || !selectedFile}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {importLoading ? (
                    <>
                      <LoadingSpinner 
                        message="Importing..." 
                        variant="default"
                        size="sm"
                      />
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Households
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        type="household"
        data={householdToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteExecute}
        loading={loading || isEnhancedUpdating}
      />
    </div>
  );
};

export default HouseholdsPage;
