import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import RefreshControls from "@/components/common/RefreshControls";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search, Archive } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { archivesService } from "@/services/archivesService";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArchivesTable,
  ArchivesForm,
  ArchivesFilters,
  ArchivesViewDialog,
  DeleteConfirmationDialog,
  ArchivesStats,
} from "@/features/archives";

const ArchivesPage = () => {
  const { user } = useAuth();
  // Set up unified auto refresh for archives data
  const { registerRefreshCallback, handleCRUDOperation, triggerRefresh } = useUnifiedAutoRefresh({
    entityType: 'archive',
    successMessage: 'Archive operation completed successfully!',
    autoRefresh: true,
    refreshDelay: 100
  });

  // State management
  const [archives, setArchives] = useState([]);
  const [allArchives, setAllArchives] = useState([]); // Store all archives for filter options
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    documentType: "",
  });

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [archiveToDelete, setArchiveToDelete] = useState(null);
  const [formLoading, setFormLoading] = useState(false);


  // Fetch archives data
  const fetchArchives = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, perPage, search: searchTerm, ...filters };
      const response = await archivesService.getArchivesList(params);
      setArchives(response.data || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      setError("Failed to fetch archives");
      setArchives([]);
      toast({
        title: "Error",
        description: "Failed to fetch archives",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all archives for filter options (without pagination/filters)
  const fetchAllArchivesForFilters = async () => {
    try {
      const response = await archivesService.getArchivesList({ perPage: 1000 }); // Get all archives
      setAllArchives(response.data || []);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to fetch all archives for filters:", err);
}
    }
  };

  useEffect(() => {
    fetchArchives();
  }, [page, perPage, filters, searchTerm]);

  // Fetch all archives for filter options on component mount
  useEffect(() => {
    fetchAllArchivesForFilters();
  }, []);

  // Register refresh callback for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(fetchArchives);
    return unregister;
  }, [registerRefreshCallback, fetchArchives]);



  // Handle search
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    setPage(1);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      documentType: "",
    });
    setSearchTerm("");
    setPage(1);
  }, [setSearchTerm]);

  // Get unique values for filters from all archives (not filtered results)
  const documentTypes = useMemo(() => {
    return [...new Set(allArchives.map(a => a.document_type).filter(Boolean))];
  }, [allArchives]);

  // CRUD handlers
  const handleView = (archive) => {
    setSelectedArchive(archive);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (archive) => {
    setSelectedArchive(archive);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (archive) => {
    setArchiveToDelete(archive);
    setIsDeleteDialogOpen(true);
    // Close the view dialog if it's open
    setIsViewDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!archiveToDelete) return;
    try {
      await handleCRUDOperation(
        async (data) => {
          return await archivesService.deleteArchive(data.archive_id);
        },
        { archive_id: archiveToDelete.archive_id },
        'delete'
      );
      
      setArchives(archives.filter(a => a.archive_id !== archiveToDelete.archive_id));
      setIsDeleteDialogOpen(false);
      setArchiveToDelete(null);
    } catch (err) {
      console.error('Failed to delete archive:', err);
    }
  };

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    try {
      if (isEditDialogOpen && selectedArchive) {
        await handleCRUDOperation(
          async (data) => {
            return await archivesService.updateArchive(selectedArchive.archive_id, data);
          },
          formData,
          'update'
        );
        setIsEditDialogOpen(false);
      } else {
        await handleCRUDOperation(
          async (data) => {
            return await archivesService.createArchive(data);
          },
          formData,
          'create'
        );
        setIsAddDialogOpen(false);
      }
      setSelectedArchive(null);
    } catch (err) {
      console.error('Failed to submit archive form:', err);
    } finally {
      setFormLoading(false);
    }
  };

  // Pagination
  const handlePrev = () => page > 1 && setPage(page - 1);
  const handleNext = () => page < totalPages && setPage(page + 1);

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Archives Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage and organize your barangay documents and records
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <RefreshControls 
            variant="outline"
            size="sm"
          />
          <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2 text-xs sm:text-sm w-full sm:w-auto">
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Add Archive</span>
          <span className="sm:hidden">Add</span>
        </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <ArchivesFilters
        searchTerm={searchTerm}
        setSearchTerm={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        documentTypes={documentTypes}
      />

      {/* Stats Cards */}
      <ArchivesStats archives={archives} />

      {/* Archives Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Archive className="h-4 w-4 sm:h-5 sm:w-5" />
            Archives ({total})
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, total)} of {total} archives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ArchivesTable
            archives={archives}
            loading={loading}
            onView={handleView}
            page={page}
            totalPages={totalPages}
            perPage={perPage}
            total={total}
            handlePrev={handlePrev}
            handleNext={handleNext}
            setPerPage={setPerPage}
          />


        </CardContent>
      </Card>

      {/* Dialogs */}
      <ArchivesForm
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        isEdit={false}
      />

      <ArchivesForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        archive={selectedArchive}
        isEdit={true}
      />

      <ArchivesViewDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        archive={selectedArchive}
        loading={false}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        loading={false}
        archive={archiveToDelete}
      />
    </div>
  );
};

export default ArchivesPage;
