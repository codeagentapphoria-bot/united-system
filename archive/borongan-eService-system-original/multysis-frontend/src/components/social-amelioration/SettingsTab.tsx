// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { FiDownload, FiEdit, FiPlus, FiSearch, FiSettings, FiTrash2, FiUserCheck, FiUserX } from 'react-icons/fi';
import { logger } from '@/utils/logger';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Custom Components
import {
  ActivateDisabilityTypeModal,
  AddDisabilityTypeModal,
  DeleteDisabilityTypeModal,
  EditDisabilityTypeModal,
} from '@/components/modals/disability-types';
import {
  ActivateGradeLevelModal,
  AddGradeLevelModal,
  DeleteGradeLevelModal,
  EditGradeLevelModal,
} from '@/components/modals/grade-levels';
import {
  ActivatePensionTypeModal,
  AddPensionTypeModal,
  DeletePensionTypeModal,
  EditPensionTypeModal,
} from '@/components/modals/pension-types';
import {
  ActivateSoloParentCategoryModal,
  AddSoloParentCategoryModal,
  DeleteSoloParentCategoryModal,
  EditSoloParentCategoryModal,
} from '@/components/modals/solo-parent-categories';

// Hooks
import { useDisabilityTypes, type CreateDisabilityTypeInput, type UpdateDisabilityTypeInput } from '@/hooks/social-amelioration/useDisabilityTypes';
import { useGradeLevels, type CreateGradeLevelInput, type UpdateGradeLevelInput } from '@/hooks/social-amelioration/useGradeLevels';
import { usePensionTypes, type CreatePensionTypeInput, type UpdatePensionTypeInput } from '@/hooks/social-amelioration/usePensionTypes';
import { useSoloParentCategories, type CreateSoloParentCategoryInput, type UpdateSoloParentCategoryInput } from '@/hooks/social-amelioration/useSoloParentCategories';
import { useDebounce } from '@/hooks/useDebounce';

// Utils
import { cn } from '@/lib/utils';

// Pension Type Management Component
const PensionTypeManagement: React.FC = () => {
  const {
    pensionTypes,
    selectedPensionType,
    setSelectedPensionType,
    isLoading,
    error,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createPensionType,
    updatePensionType,
    deletePensionType,
    activatePensionType,
    deactivatePensionType,
  } = usePensionTypes();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Update the actual search query when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  const handleDownload = () => {
    // Create CSV content
    const headers = ['Pension Type Name', 'Description', 'Status', 'Created Date'];
    const rows = pensionTypes.map(pensionType => [
      pensionType.name,
      pensionType.description || 'N/A',
      pensionType.isActive ? 'Active' : 'Inactive',
      new Date(pensionType.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pension-types-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreatePensionType = async (data: CreatePensionTypeInput) => {
    try {
      setIsActionLoading(true);
      await createPensionType(data);
      setIsAddModalOpen(false);
    } catch (error) {
      logger.error('Failed to create pension type:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdatePensionType = async (id: string, data: UpdatePensionTypeInput) => {
    try {
      setIsActionLoading(true);
      await updatePensionType(id, data);
      setIsEditModalOpen(false);
    } catch (error) {
      logger.error('Failed to update pension type:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeletePensionType = async () => {
    if (selectedPensionType) {
      try {
        setIsActionLoading(true);
        await deletePensionType(selectedPensionType.id);
        setIsDeleteModalOpen(false);
      } catch (error) {
        logger.error('Failed to delete pension type:', error);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleToggleActive = async () => {
    if (!selectedPensionType) return;
    try {
      setIsActionLoading(true);
      if (selectedPensionType.isActive) {
        await deactivatePensionType(selectedPensionType.id);
      } else {
        await activatePensionType(selectedPensionType.id);
      }
      setIsActivateModalOpen(false);
    } catch (error) {
      logger.error('Failed to toggle pension type status:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-red-100 text-red-700',
    };

    return (
      <Badge className={variants[isActive ? 'active' : 'inactive']}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-heading-700">Pension Type Management</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage pension types for senior citizens
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
            onClick={handleDownload}
          >
            <div className="mr-2"><FiDownload size={16} /></div>
            Download List
          </Button>
          <Button 
            className="bg-primary-600 hover:bg-primary-700"
            onClick={() => setIsAddModalOpen(true)}
          >
            <div className="mr-2"><FiPlus size={16} /></div>
            Add Pension Type
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content: List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Pension Types List */}
        <Card className="lg:col-span-1 overflow-visible">
          <CardHeader>
            <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
              <FiSettings size={20} />
              Pension Types List
            </CardTitle>
            
            {/* Search */}
            <div className="relative mt-4">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiSearch size={18} />
              </div>
              <Input
                placeholder="Search pension types..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('inactive')}
                className={statusFilter === 'inactive' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                Inactive
              </Button>
            </div>
            
            {/* Total count */}
            <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
              <span>Total: {pensionTypes.length} pension types</span>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading pension types...
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                {pensionTypes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No pension types found.
                  </div>
                ) : (
                  pensionTypes.map((pensionType) => (
                    <div key={pensionType.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedPensionType?.id === pensionType.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
                        onClick={() => setSelectedPensionType(pensionType)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-heading-700">{pensionType.name}</h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {pensionType.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(pensionType.isActive)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Pointing Arrow - Only on large screens */}
                      {selectedPensionType?.id === pensionType.id && (
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Selected Pension Type Information */}
        <Card className="lg:col-span-2">
          <CardContent className="max-h-[700px] overflow-y-auto !p-6">
            {selectedPensionType && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-heading-700">Pension Type Details</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedPensionType.isActive ? 'outline' : 'default'}
                      onClick={() => setIsActivateModalOpen(true)}
                      disabled={isActionLoading}
                      className={selectedPensionType.isActive ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {selectedPensionType.isActive ? (
                        <>
                          <div className="mr-1"><FiUserX size={14} /></div>
                          Deactivate
                        </>
                      ) : (
                        <>
                          <div className="mr-1"><FiUserCheck size={14} /></div>
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary-600 hover:bg-primary-700"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <div className="mr-1"><FiEdit size={14} /></div>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      <div className="mr-1"><FiTrash2 size={14} /></div>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Pension Type Name</label>
                        <p className="text-sm text-heading-700">{selectedPensionType.name}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <div>{getStatusBadge(selectedPensionType.isActive)}</div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-sm text-heading-700">{selectedPensionType.description || 'No description provided'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Created Date</label>
                        <p className="text-sm text-heading-700">{new Date(selectedPensionType.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Last Updated</label>
                        <p className="text-sm text-heading-700">{new Date(selectedPensionType.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!selectedPensionType && !isLoading && (
              <div className="text-center py-12 text-gray-500">
                Select a pension type to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AddPensionTypeModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreatePensionType}
        isLoading={isActionLoading}
      />
      
      <EditPensionTypeModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdatePensionType}
        pensionType={selectedPensionType}
        isLoading={isActionLoading}
      />

      <DeletePensionTypeModal 
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeletePensionType}
        pensionTypeName={selectedPensionType?.name || ''}
        isLoading={isActionLoading}
      />

      <ActivatePensionTypeModal
        open={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        onConfirm={handleToggleActive}
        pensionTypeName={selectedPensionType?.name || ''}
        isActivating={!selectedPensionType?.isActive}
        isLoading={isActionLoading}
      />
    </div>
  );
};

// Disability Type Management Component
const DisabilityTypeManagement: React.FC = () => {
  const {
    disabilityTypes,
    selectedDisabilityType,
    setSelectedDisabilityType,
    isLoading,
    error,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createDisabilityType,
    updateDisabilityType,
    deleteDisabilityType,
    activateDisabilityType,
    deactivateDisabilityType,
  } = useDisabilityTypes();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Update the actual search query when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleDownload = () => {
    // Create CSV content
    const headers = ['Disability Type Name', 'Description', 'Status', 'Created Date'];
    const rows = disabilityTypes.map(disabilityType => [
      disabilityType.name,
      disabilityType.description || 'N/A',
      disabilityType.isActive ? 'Active' : 'Inactive',
      new Date(disabilityType.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disability-types-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateDisabilityType = async (data: CreateDisabilityTypeInput) => {
    try {
      setIsActionLoading(true);
      await createDisabilityType(data);
      setIsAddModalOpen(false);
    } catch (error) {
      logger.error('Failed to create disability type:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateDisabilityType = async (id: string, data: UpdateDisabilityTypeInput) => {
    try {
      setIsActionLoading(true);
      await updateDisabilityType(id, data);
      setIsEditModalOpen(false);
    } catch (error) {
      logger.error('Failed to update disability type:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteDisabilityType = async () => {
    if (selectedDisabilityType) {
      try {
        setIsActionLoading(true);
        await deleteDisabilityType(selectedDisabilityType.id);
        setIsDeleteModalOpen(false);
      } catch (error) {
        logger.error('Failed to delete disability type:', error);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleToggleActive = async () => {
    if (!selectedDisabilityType) return;
    try {
      setIsActionLoading(true);
      if (selectedDisabilityType.isActive) {
        await deactivateDisabilityType(selectedDisabilityType.id);
      } else {
        await activateDisabilityType(selectedDisabilityType.id);
      }
      setIsActivateModalOpen(false);
    } catch (error) {
      logger.error('Failed to toggle disability type status:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-red-100 text-red-700',
  };

  return (
      <Badge className={variants[isActive ? 'active' : 'inactive']}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-heading-700">Disability Type Management</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage disability types for PWD
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
            onClick={handleDownload}
          >
            <div className="mr-2"><FiDownload size={16} /></div>
            Download List
          </Button>
          <Button 
            className="bg-primary-600 hover:bg-primary-700"
            onClick={() => setIsAddModalOpen(true)}
          >
            <div className="mr-2"><FiPlus size={16} /></div>
            Add Disability Type
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content: List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Disability Types List */}
        <Card className="lg:col-span-1 overflow-visible">
        <CardHeader>
            <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
              <FiSettings size={20} />
              Disability Types List
          </CardTitle>
            
            {/* Search */}
            <div className="relative mt-4">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiSearch size={18} />
              </div>
              <Input
                placeholder="Search disability types..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('inactive')}
                className={statusFilter === 'inactive' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                Inactive
              </Button>
            </div>
            
            {/* Total count */}
            <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
              <span>Total: {disabilityTypes.length} disability types</span>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading disability types...
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                {disabilityTypes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No disability types found.
                  </div>
                ) : (
                  disabilityTypes.map((disabilityType) => (
                    <div key={disabilityType.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedDisabilityType?.id === disabilityType.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
                        onClick={() => setSelectedDisabilityType(disabilityType)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-heading-700">{disabilityType.name}</h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {disabilityType.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(disabilityType.isActive)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Pointing Arrow - Only on large screens */}
                      {selectedDisabilityType?.id === disabilityType.id && (
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Selected Disability Type Information */}
        <Card className="lg:col-span-2">
          <CardContent className="max-h-[700px] overflow-y-auto !p-6">
            {selectedDisabilityType && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-heading-700">Disability Type Details</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedDisabilityType.isActive ? 'outline' : 'default'}
                      onClick={() => setIsActivateModalOpen(true)}
                      disabled={isActionLoading}
                      className={selectedDisabilityType.isActive ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {selectedDisabilityType.isActive ? (
                        <>
                          <div className="mr-1"><FiUserX size={14} /></div>
                          Deactivate
                        </>
                      ) : (
                        <>
                          <div className="mr-1"><FiUserCheck size={14} /></div>
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary-600 hover:bg-primary-700"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <div className="mr-1"><FiEdit size={14} /></div>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      <div className="mr-1"><FiTrash2 size={14} /></div>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Disability Type Name</label>
                        <p className="text-sm text-heading-700">{selectedDisabilityType.name}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <div>{getStatusBadge(selectedDisabilityType.isActive)}</div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-sm text-heading-700">{selectedDisabilityType.description || 'No description provided'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Created Date</label>
                        <p className="text-sm text-heading-700">{new Date(selectedDisabilityType.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Last Updated</label>
                        <p className="text-sm text-heading-700">{new Date(selectedDisabilityType.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!selectedDisabilityType && !isLoading && (
              <div className="text-center py-12 text-gray-500">
                Select a disability type to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AddDisabilityTypeModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateDisabilityType}
        isLoading={isActionLoading}
      />
      
      <EditDisabilityTypeModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateDisabilityType}
        disabilityType={selectedDisabilityType}
        isLoading={isActionLoading}
      />

      <DeleteDisabilityTypeModal 
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteDisabilityType}
        disabilityTypeName={selectedDisabilityType?.name || ''}
        isLoading={isActionLoading}
      />

      <ActivateDisabilityTypeModal
        open={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        onConfirm={handleToggleActive}
        disabilityTypeName={selectedDisabilityType?.name || ''}
        isActivating={!selectedDisabilityType?.isActive}
        isLoading={isActionLoading}
      />
    </div>
  );
};

// Grade Level Management Component
const GradeLevelManagement: React.FC = () => {
  const {
    gradeLevels,
    selectedGradeLevel,
    setSelectedGradeLevel,
    isLoading,
    error,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createGradeLevel,
    updateGradeLevel,
    deleteGradeLevel,
    activateGradeLevel,
    deactivateGradeLevel,
  } = useGradeLevels();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Update the actual search query when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  const handleDownload = () => {
    // Create CSV content
    const headers = ['Grade Level Name', 'Description', 'Status', 'Created Date'];
    const rows = gradeLevels.map(gradeLevel => [
      gradeLevel.name,
      gradeLevel.description || 'N/A',
      gradeLevel.isActive ? 'Active' : 'Inactive',
      new Date(gradeLevel.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grade-levels-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateGradeLevel = async (data: CreateGradeLevelInput) => {
    try {
      setIsActionLoading(true);
      await createGradeLevel(data);
      setIsAddModalOpen(false);
    } catch (error) {
      logger.error('Failed to create grade level:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateGradeLevel = async (id: string, data: UpdateGradeLevelInput) => {
    try {
      setIsActionLoading(true);
      await updateGradeLevel(id, data);
      setIsEditModalOpen(false);
    } catch (error) {
      logger.error('Failed to update grade level:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteGradeLevel = async () => {
    if (selectedGradeLevel) {
      try {
        setIsActionLoading(true);
        await deleteGradeLevel(selectedGradeLevel.id);
        setIsDeleteModalOpen(false);
      } catch (error) {
        logger.error('Failed to delete grade level:', error);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleToggleActive = async () => {
    if (!selectedGradeLevel) return;
    try {
      setIsActionLoading(true);
      if (selectedGradeLevel.isActive) {
        await deactivateGradeLevel(selectedGradeLevel.id);
      } else {
        await activateGradeLevel(selectedGradeLevel.id);
      }
      setIsActivateModalOpen(false);
    } catch (error) {
      logger.error('Failed to toggle grade level status:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-red-100 text-red-700',
    };

    return (
      <Badge className={variants[isActive ? 'active' : 'inactive']}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
          <h3 className="text-xl font-semibold text-heading-700">Grade Level Management</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage grade levels for students
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
            onClick={handleDownload}
          >
            <div className="mr-2"><FiDownload size={16} /></div>
            Download List
          </Button>
          <Button 
            className="bg-primary-600 hover:bg-primary-700"
            onClick={() => setIsAddModalOpen(true)}
          >
            <div className="mr-2"><FiPlus size={16} /></div>
            Add Grade Level
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content: List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Grade Levels List */}
        <Card className="lg:col-span-1 overflow-visible">
          <CardHeader>
            <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
              <FiSettings size={20} />
              Grade Levels List
            </CardTitle>
            
            {/* Search */}
            <div className="relative mt-4">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiSearch size={18} />
              </div>
                <Input
                placeholder="Search grade levels..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-10 h-10"
                />
              </div>

            {/* Status Filter */}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('inactive')}
                className={statusFilter === 'inactive' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                Inactive
              </Button>
            </div>
            
            {/* Total count */}
            <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
              <span>Total: {gradeLevels.length} grade levels</span>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading grade levels...
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                {gradeLevels.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No grade levels found.
                  </div>
                ) : (
                  gradeLevels.map((gradeLevel) => (
                    <div key={gradeLevel.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedGradeLevel?.id === gradeLevel.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
                        onClick={() => setSelectedGradeLevel(gradeLevel)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-heading-700">{gradeLevel.name}</h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {gradeLevel.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(gradeLevel.isActive)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Pointing Arrow - Only on large screens */}
                      {selectedGradeLevel?.id === gradeLevel.id && (
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Selected Grade Level Information */}
        <Card className="lg:col-span-2">
          <CardContent className="max-h-[700px] overflow-y-auto !p-6">
            {selectedGradeLevel && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-heading-700">Grade Level Details</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedGradeLevel.isActive ? 'outline' : 'default'}
                      onClick={() => setIsActivateModalOpen(true)}
                      disabled={isActionLoading}
                      className={selectedGradeLevel.isActive ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {selectedGradeLevel.isActive ? (
                        <>
                          <div className="mr-1"><FiUserX size={14} /></div>
                          Deactivate
                        </>
                      ) : (
                        <>
                          <div className="mr-1"><FiUserCheck size={14} /></div>
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary-600 hover:bg-primary-700"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <div className="mr-1"><FiEdit size={14} /></div>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      <div className="mr-1"><FiTrash2 size={14} /></div>
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Grade Level Name</label>
                        <p className="text-sm text-heading-700">{selectedGradeLevel.name}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <div>{getStatusBadge(selectedGradeLevel.isActive)}</div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-sm text-heading-700">{selectedGradeLevel.description || 'No description provided'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Created Date</label>
                        <p className="text-sm text-heading-700">{new Date(selectedGradeLevel.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Last Updated</label>
                        <p className="text-sm text-heading-700">{new Date(selectedGradeLevel.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!selectedGradeLevel && !isLoading && (
              <div className="text-center py-12 text-gray-500">
                Select a grade level to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AddGradeLevelModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateGradeLevel}
        isLoading={isActionLoading}
      />
      
      <EditGradeLevelModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateGradeLevel}
        gradeLevel={selectedGradeLevel}
        isLoading={isActionLoading}
      />

      <DeleteGradeLevelModal 
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteGradeLevel}
        gradeLevelName={selectedGradeLevel?.name || ''}
        isLoading={isActionLoading}
      />

      <ActivateGradeLevelModal
        open={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        onConfirm={handleToggleActive}
        gradeLevelName={selectedGradeLevel?.name || ''}
        isActivating={!selectedGradeLevel?.isActive}
        isLoading={isActionLoading}
      />
    </div>
  );
};

// Solo Parent Category Management Component
const SoloParentCategoryManagement: React.FC = () => {
  const {
    soloParentCategories,
    selectedSoloParentCategory,
    setSelectedSoloParentCategory,
    isLoading,
    error,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createSoloParentCategory,
    updateSoloParentCategory,
    deleteSoloParentCategory,
    activateSoloParentCategory,
    deactivateSoloParentCategory,
  } = useSoloParentCategories();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Update the actual search query when debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedSearchQuery);
  }, [debouncedSearchQuery, setSearchQuery]);

  const handleDownload = () => {
    // Create CSV content
    const headers = ['Category Name', 'Description', 'Status', 'Created Date'];
    const rows = soloParentCategories.map(category => [
      category.name,
      category.description || 'N/A',
      category.isActive ? 'Active' : 'Inactive',
      new Date(category.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solo-parent-categories-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateSoloParentCategory = async (data: CreateSoloParentCategoryInput) => {
    try {
      setIsActionLoading(true);
      await createSoloParentCategory(data);
      setIsAddModalOpen(false);
    } catch (error) {
      logger.error('Failed to create solo parent category:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateSoloParentCategory = async (id: string, data: UpdateSoloParentCategoryInput) => {
    try {
      setIsActionLoading(true);
      await updateSoloParentCategory(id, data);
      setIsEditModalOpen(false);
    } catch (error) {
      logger.error('Failed to update solo parent category:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteSoloParentCategory = async () => {
    if (selectedSoloParentCategory) {
      try {
        setIsActionLoading(true);
        await deleteSoloParentCategory(selectedSoloParentCategory.id);
        setIsDeleteModalOpen(false);
      } catch (error) {
        logger.error('Failed to delete solo parent category:', error);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleToggleActive = async () => {
    if (!selectedSoloParentCategory) return;
    try {
      setIsActionLoading(true);
      if (selectedSoloParentCategory.isActive) {
        await deactivateSoloParentCategory(selectedSoloParentCategory.id);
      } else {
        await activateSoloParentCategory(selectedSoloParentCategory.id);
      }
      setIsActivateModalOpen(false);
    } catch (error) {
      logger.error('Failed to toggle solo parent category status:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-red-100 text-red-700',
    };

    return (
      <Badge className={variants[isActive ? 'active' : 'inactive']}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold text-heading-700">Solo Parent Category Management</h3>
          <p className="text-sm text-gray-500 mt-1">
            Manage categories for solo parents
          </p>
        </div>
                <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
            onClick={handleDownload}
          >
            <div className="mr-2"><FiDownload size={16} /></div>
            Download List
          </Button>
          <Button 
            className="bg-primary-600 hover:bg-primary-700"
            onClick={() => setIsAddModalOpen(true)}
          >
            <div className="mr-2"><FiPlus size={16} /></div>
            Add Category
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Main Content: List + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Categories List */}
        <Card className="lg:col-span-1 overflow-visible">
          <CardHeader>
            <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
              <FiSettings size={20} />
              Categories List
            </CardTitle>
            
            {/* Search */}
            <div className="relative mt-4">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiSearch size={18} />
              </div>
                  <Input
                placeholder="Search categories..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('active')}
                className={statusFilter === 'active' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('inactive')}
                className={statusFilter === 'inactive' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
              >
                Inactive
                  </Button>
                </div>
            
            {/* Total count */}
            <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
              <span>Total: {soloParentCategories.length} categories</span>
            </div>
          </CardHeader>
          
          <CardContent className="flex flex-col">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading categories...
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                {soloParentCategories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No categories found.
                  </div>
                ) : (
                  soloParentCategories.map((category) => (
                    <div key={category.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedSoloParentCategory?.id === category.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
                        onClick={() => setSelectedSoloParentCategory(category)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-heading-700">{category.name}</h3>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {category.description || 'No description'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {getStatusBadge(category.isActive)}
                              </div>
              </div>
            </div>
          </CardContent>
        </Card>

                      {/* Pointing Arrow - Only on large screens */}
                      {selectedSoloParentCategory?.id === category.id && (
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Selected Category Information */}
        <Card className="lg:col-span-2">
          <CardContent className="max-h-[700px] overflow-y-auto !p-6">
            {selectedSoloParentCategory && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-heading-700">Category Details</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedSoloParentCategory.isActive ? 'outline' : 'default'}
                      onClick={() => setIsActivateModalOpen(true)}
                      disabled={isActionLoading}
                      className={selectedSoloParentCategory.isActive ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {selectedSoloParentCategory.isActive ? (
                        <>
                          <div className="mr-1"><FiUserX size={14} /></div>
                          Deactivate
                        </>
                      ) : (
                        <>
                          <div className="mr-1"><FiUserCheck size={14} /></div>
                          Activate
                        </>
                      )}
        </Button>
                    <Button
                      size="sm"
                      className="bg-primary-600 hover:bg-primary-700"
                      onClick={() => setIsEditModalOpen(true)}
                    >
                      <div className="mr-1"><FiEdit size={14} /></div>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setIsDeleteModalOpen(true)}
                    >
                      <div className="mr-1"><FiTrash2 size={14} /></div>
                      Delete
        </Button>
      </div>
                </div>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h4 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Basic Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Category Name</label>
                        <p className="text-sm text-heading-700">{selectedSoloParentCategory.name}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <div>{getStatusBadge(selectedSoloParentCategory.isActive)}</div>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-sm font-medium text-gray-600">Description</label>
                        <p className="text-sm text-heading-700">{selectedSoloParentCategory.description || 'No description provided'}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Created Date</label>
                        <p className="text-sm text-heading-700">{new Date(selectedSoloParentCategory.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-600">Last Updated</label>
                        <p className="text-sm text-heading-700">{new Date(selectedSoloParentCategory.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!selectedSoloParentCategory && !isLoading && (
              <div className="text-center py-12 text-gray-500">
                Select a category to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <AddSoloParentCategoryModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateSoloParentCategory}
        isLoading={isActionLoading}
      />
      
      <EditSoloParentCategoryModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateSoloParentCategory}
        soloParentCategory={selectedSoloParentCategory}
        isLoading={isActionLoading}
      />

      <DeleteSoloParentCategoryModal 
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteSoloParentCategory}
        categoryName={selectedSoloParentCategory?.name || ''}
        isLoading={isActionLoading}
      />

      <ActivateSoloParentCategoryModal
        open={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        onConfirm={handleToggleActive}
        categoryName={selectedSoloParentCategory?.name || ''}
        isActivating={!selectedSoloParentCategory?.isActive}
        isLoading={isActionLoading}
      />
    </div>
  );
};


export const SettingsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="senior-citizen" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="senior-citizen">Senior Citizen</TabsTrigger>
          <TabsTrigger value="pwd">PWD</TabsTrigger>
          <TabsTrigger value="student">Student</TabsTrigger>
          <TabsTrigger value="solo-parent">Solo Parent</TabsTrigger>
        </TabsList>
        
        <TabsContent value="senior-citizen" className="mt-6">
          <PensionTypeManagement />
        </TabsContent>
        
        <TabsContent value="pwd" className="mt-6">
          <DisabilityTypeManagement />
        </TabsContent>
        
        <TabsContent value="student" className="mt-6">
          <GradeLevelManagement />
        </TabsContent>
        
        <TabsContent value="solo-parent" className="mt-6">
          <SoloParentCategoryManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};
