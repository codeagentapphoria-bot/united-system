// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { FiDownload, FiEdit, FiPlus, FiSearch, FiSettings, FiTrash2, FiUserCheck, FiUserX } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

// Custom Components
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    ActivateGovernmentProgramModal,
    AddGovernmentProgramModal,
    DeleteGovernmentProgramModal,
    EditGovernmentProgramModal,
} from '@/components/modals/government-programs';

// Hooks
import { useGovernmentPrograms, type CreateGovernmentProgramInput, type UpdateGovernmentProgramInput } from '@/hooks/social-amelioration/useGovernmentPrograms';
import { useDebounce } from '@/hooks/useDebounce';

// Utils
import { adminMenuItems } from '@/config/admin-menu';
import { cn } from '@/lib/utils';

export const AdminGovernmentPrograms: React.FC = () => {
  const {
    governmentPrograms,
    selectedGovernmentProgram,
    setSelectedGovernmentProgram,
    isLoading,
    error,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    createGovernmentProgram,
    updateGovernmentProgram,
    deleteGovernmentProgram,
    activateGovernmentProgram,
    deactivateGovernmentProgram,
  } = useGovernmentPrograms();

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
    const headers = ['Program Name', 'Description', 'Type', 'Status', 'Created Date'];
    const rows = governmentPrograms.map(program => [
      program.name,
      program.description || 'N/A',
      program.type,
      program.isActive ? 'Active' : 'Inactive',
      new Date(program.createdAt).toLocaleDateString()
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
    a.download = `government-programs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateGovernmentProgram = async (data: CreateGovernmentProgramInput) => {
    try {
      setIsActionLoading(true);
      await createGovernmentProgram(data);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create government program:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateGovernmentProgram = async (id: string, data: UpdateGovernmentProgramInput) => {
    try {
      setIsActionLoading(true);
      await updateGovernmentProgram(id, data);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update government program:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteGovernmentProgram = async () => {
    if (selectedGovernmentProgram) {
      try {
        setIsActionLoading(true);
        await deleteGovernmentProgram(selectedGovernmentProgram.id);
        setIsDeleteModalOpen(false);
      } catch (error) {
        console.error('Failed to delete government program:', error);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleToggleActive = async () => {
    if (!selectedGovernmentProgram) return;
    try {
      setIsActionLoading(true);
      if (selectedGovernmentProgram.isActive) {
        await deactivateGovernmentProgram(selectedGovernmentProgram.id);
      } else {
        await activateGovernmentProgram(selectedGovernmentProgram.id);
      }
      setIsActivateModalOpen(false);
    } catch (error) {
      console.error('Failed to toggle government program status:', error);
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SENIOR_CITIZEN: 'Senior Citizen',
      PWD: 'PWD',
      STUDENT: 'Student',
      SOLO_PARENT: 'Solo Parent',
      ALL: 'All Beneficiaries',
    };
    return labels[type] || type;
  };

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">Government Programs</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage government assistance programs for all beneficiary types
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
              Add Government Program
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
          {/* Left: Government Programs List */}
          <Card className="lg:col-span-1 overflow-visible">
            <CardHeader>
              <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
                <FiSettings size={20} />
                Programs List
              </CardTitle>
              
              {/* Search */}
              <div className="relative mt-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiSearch size={18} />
                </div>
                <Input
                  placeholder="Search programs..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-2 mt-3">
                {/* Type Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={typeFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setTypeFilter('all')}
                      className={typeFilter === 'all' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={typeFilter === 'SENIOR_CITIZEN' ? 'default' : 'outline'}
                      onClick={() => setTypeFilter('SENIOR_CITIZEN')}
                      className={typeFilter === 'SENIOR_CITIZEN' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                    >
                      Senior Citizen
                    </Button>
                    <Button
                      size="sm"
                      variant={typeFilter === 'PWD' ? 'default' : 'outline'}
                      onClick={() => setTypeFilter('PWD')}
                      className={typeFilter === 'PWD' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                    >
                      PWD
                    </Button>
                    <Button
                      size="sm"
                      variant={typeFilter === 'STUDENT' ? 'default' : 'outline'}
                      onClick={() => setTypeFilter('STUDENT')}
                      className={typeFilter === 'STUDENT' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                    >
                      Student
                    </Button>
                    <Button
                      size="sm"
                      variant={typeFilter === 'SOLO_PARENT' ? 'default' : 'outline'}
                      onClick={() => setTypeFilter('SOLO_PARENT')}
                      className={typeFilter === 'SOLO_PARENT' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                    >
                      Solo Parent
                    </Button>
                    <Button
                      size="sm"
                      variant={typeFilter === 'ALL' ? 'default' : 'outline'}
                      onClick={() => setTypeFilter('ALL')}
                      className={typeFilter === 'ALL' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                    >
                      All Types
                    </Button>
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Status</label>
                  <div className="flex gap-2">
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
                </div>
              </div>
              
              {/* Total count */}
              <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
                <span>Total: {governmentPrograms.length} programs</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex flex-col">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading programs...
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                  {governmentPrograms.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No programs found.
                    </div>
                  ) : (
                    governmentPrograms.map((program) => (
                      <div key={program.id} className="relative">
                        <Card
                          className={cn(
                            'cursor-pointer transition-all hover:shadow-md',
                            selectedGovernmentProgram?.id === program.id
                              ? 'border-primary-600 bg-primary-50'
                              : 'hover:border-primary-300'
                          )}
                          onClick={() => setSelectedGovernmentProgram(program)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-heading-700">{program.name}</h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {program.description || 'No description'}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                    {getTypeLabel(program.type)}
                                  </span>
                                  {getStatusBadge(program.isActive)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Pointing Arrow - Only on large screens */}
                        {selectedGovernmentProgram?.id === program.id && (
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

          {/* Right: Selected Program Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-heading-700 text-lg">Program Details</CardTitle>
                {selectedGovernmentProgram && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditModalOpen(true)}
                      className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                    >
                      <FiEdit size={14} className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedGovernmentProgram.isActive ? 'outline' : 'default'}
                      onClick={() => setIsActivateModalOpen(true)}
                      disabled={isActionLoading}
                      className={selectedGovernmentProgram.isActive ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {selectedGovernmentProgram.isActive ? (
                        <>
                          <FiUserX size={14} className="mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <FiUserCheck size={14} className="mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsDeleteModalOpen(true)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <FiTrash2 size={14} className="mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              {selectedGovernmentProgram ? (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Program Name</label>
                        <div className="min-h-[40px] flex items-center">
                          <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedGovernmentProgram.name}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                        <div className="min-h-[40px] flex items-center">
                          <Badge className="bg-primary-100 text-primary-700 px-3 py-1">
                            {getTypeLabel(selectedGovernmentProgram.type)}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                        <div className="min-h-[40px] flex items-center">
                          {getStatusBadge(selectedGovernmentProgram.isActive)}
                        </div>
                      </div>
                      {selectedGovernmentProgram.description && (
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                          <div className="min-h-[40px] flex items-center">
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedGovernmentProgram.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Metadata */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Metadata</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created Date</label>
                        <div className="min-h-[40px] flex items-center">
                          <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                            {new Date(selectedGovernmentProgram.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</label>
                        <div className="min-h-[40px] flex items-center">
                          <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                            {new Date(selectedGovernmentProgram.updatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiSettings className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Select a program to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddGovernmentProgramModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateGovernmentProgram}
        isLoading={isActionLoading}
      />
      
      <EditGovernmentProgramModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateGovernmentProgram}
        governmentProgram={selectedGovernmentProgram}
        isLoading={isActionLoading}
      />

      <DeleteGovernmentProgramModal 
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteGovernmentProgram}
        programName={selectedGovernmentProgram?.name || ''}
        isLoading={isActionLoading}
      />

      <ActivateGovernmentProgramModal
        open={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        onConfirm={handleToggleActive}
        programName={selectedGovernmentProgram?.name || ''}
        isActivating={!selectedGovernmentProgram?.isActive}
        isLoading={isActionLoading}
      />
    </DashboardLayout>
  );
};

