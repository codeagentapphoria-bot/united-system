import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RefreshControls from "@/components/common/RefreshControls";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { inventoryService } from "@/services/inventoryService";

// Import inventory components
import {
  InventoryTable,
  InventoryForm,
  InventoryViewDialog,
  DeleteConfirmationDialog,
  InventoryFilters,
} from "@/features/inventory";

const InventoryPage = () => {
  const { user } = useAuth();
  // Set up unified auto refresh for inventory data
  const { registerRefreshCallback, handleCRUDOperation, triggerRefresh } = useUnifiedAutoRefresh({
    entityType: 'inventory',
    successMessage: 'Inventory operation completed successfully!',
    autoRefresh: true,
    refreshDelay: 100
  });
  
  // State management
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Selected items
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [inventoryToDelete, setInventoryToDelete] = useState(null);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Loading states
  const [formLoading, setFormLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch inventory data
  const fetchInventories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        barangayId: user?.target_id,
        search: searchTerm,
        itemType: itemTypeFilter === "all" ? "" : itemTypeFilter,
        page,
        perPage,
      };

      const response = await inventoryService.getInventoryList(params);
      setInventories(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotal(response.pagination?.totalRecords || 0);
    } catch (error) {
      setError(error.message || "Failed to fetch inventory items");
      toast({
        title: "Error",
        description: error.message || "Failed to fetch inventory items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.target_id, searchTerm, itemTypeFilter, page, perPage]);

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchInventories();
  }, [fetchInventories]);

  // Register refresh callback for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(fetchInventories);
    return unregister;
  }, [registerRefreshCallback, fetchInventories]);

  // Handlers
  const handleAddInventory = async (formData) => {
    try {
      setFormLoading(true);
      formData.append('barangayId', user?.target_id);
      
      await handleCRUDOperation(
        async (data) => {
          return await inventoryService.createInventory(data);
        },
        formData,
        'create'
      );

      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to create inventory item:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditInventory = async (formData) => {
    if (!selectedInventory) return;
    
    try {
      setFormLoading(true);
      formData.append('barangayId', user?.target_id);
      
      await handleCRUDOperation(
        async (data) => {
          return await inventoryService.updateInventory(selectedInventory.inventory_id, data);
        },
        formData,
        'update'
      );

      setIsEditDialogOpen(false);
      setSelectedInventory(null);
    } catch (error) {
      console.error('Failed to update inventory item:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const handleView = async (inventory) => {
    try {
      const response = await inventoryService.getInventoryInfo(inventory.inventory_id);
      setSelectedInventory(response.data);
      setIsViewDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch inventory details",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (inventory) => {
    setSelectedInventory(inventory);
    setIsEditDialogOpen(true);
  };

  const handleDeleteConfirm = (inventory) => {
    setInventoryToDelete(inventory);
    setIsDeleteDialogOpen(true);
    // Close the view dialog if it's open
    setIsViewDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!inventoryToDelete) return;
    
    try {
      setDeleteLoading(true);
      await handleCRUDOperation(
        async (data) => {
          return await inventoryService.deleteInventory(data.inventory_id);
        },
        { inventory_id: inventoryToDelete.inventory_id },
        'delete'
      );

      setIsDeleteDialogOpen(false);
      setInventoryToDelete(null);
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setItemTypeFilter("all");
    setPage(1);
  };



  // Pagination handlers
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Inventory Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage barangay supplies, equipment, and assets
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <RefreshControls variant="outline" size="sm" />
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      <InventoryFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        itemTypeFilter={itemTypeFilter}
        setItemTypeFilter={setItemTypeFilter}
      />

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <InventoryTable
            inventories={inventories}
            loading={loading}
            error={error}
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



      {/* Add Inventory Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Inventory Item
            </DialogTitle>
            <DialogDescription>
              Add a new item to the barangay inventory
            </DialogDescription>
          </DialogHeader>
          <InventoryForm
            onSubmit={handleAddInventory}
            onCancel={() => setIsAddDialogOpen(false)}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Inventory Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Edit Inventory Item
            </DialogTitle>
            <DialogDescription>
              Update the inventory item information
            </DialogDescription>
          </DialogHeader>
          {selectedInventory && (
            <InventoryForm
              inventory={selectedInventory}
              onSubmit={handleEditInventory}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedInventory(null);
              }}
              loading={formLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Inventory Dialog */}
      <InventoryViewDialog
        inventory={selectedInventory}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        onEdit={(inventory) => {
          setIsViewDialogOpen(false);
          setSelectedInventory(inventory);
          setIsEditDialogOpen(true);
        }}
        onDelete={handleDeleteConfirm}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        inventory={inventoryToDelete}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
};

export default InventoryPage;
