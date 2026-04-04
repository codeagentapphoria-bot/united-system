import { ImagePlaceholder } from '@/components/common/ImagePlaceholder';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ActivateCitizenModal, AddCitizenModal, ApproveCitizenModal, EditCitizenModal, RejectCitizenModal, RemoveCitizenModal } from '@/components/modals/citizens';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import { adminMenuItems } from '@/config/admin-menu';
import { getRegionName } from '@/constants/regions';
import { useCitizens } from '@/hooks/citizens/useCitizens';
import { useToast } from '@/hooks/use-toast';
import { cn, formatDateWithoutTimezone, formatIdType } from '@/lib/utils';
import { citizenService } from '@/services/api/citizen.service';
import { logger } from '@/utils/logger';
import type { EditCitizenInput } from '@/validations/citizen.schema';
import React, { useEffect, useState } from 'react';
import { FiCalendar, FiCheck, FiEdit, FiPlus, FiSearch, FiUser, FiX } from 'react-icons/fi';

export const AdminCitizens: React.FC = () => {
  const {
    filteredCitizens,
    paginatedFilteredCitizens,
    selectedCitizen,
    setSelectedCitizen,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    // Pagination
    currentPage,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    isLoading,
    refreshCitizens,
  } = useCitizens();
  
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageModalType, setImageModalType] = useState<'profile' | 'identification' | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isRemoveLoading, setIsRemoveLoading] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  
  // State to track image load errors (for secure rendering without innerHTML)
  const [imageErrors, setImageErrors] = useState<{
    identification?: boolean;
    profile?: boolean;
    profileModal?: boolean;
    identificationModal?: boolean;
  }>({});

  // Helper to check if citizen is a beneficiary (using data from API)
  const isBeneficiary = (citizen: any): boolean => {
    return citizen?.isBeneficiary === true || (citizen?.beneficiaryInfo && citizen.beneficiaryInfo.length > 0);
  };

  // Helper to get beneficiary programs for a citizen (using data from API)
  // Deduplicates programs with type "ALL" that appear in multiple beneficiary types
  const getBeneficiaryPrograms = (citizen: any): Array<{ type: string; programs: Array<{ id: string; name: string }> }> => {
    if (!citizen?.beneficiaryInfo || citizen.beneficiaryInfo.length === 0) return [];

    // Track ALL type programs to avoid duplication
    const allTypeProgramIds = new Set<string>();
    const processedPrograms = new Map<string, { id: string; name: string; type: string }>();

    // First pass: collect all ALL type programs
    citizen.beneficiaryInfo.forEach((beneficiary: any) => {
      beneficiary.programIds.forEach((programId: string, index: number) => {
        const programType = beneficiary.programTypes?.[index] || '';
        if (programType === 'ALL') {
          allTypeProgramIds.add(programId);
        }
      });
    });

    // Second pass: build programs list, excluding ALL type programs from type-specific sections
    return citizen.beneficiaryInfo.map((beneficiary: any) => {
      const programs = beneficiary.programIds
        .map((programId: string, index: number) => {
          const programType = beneficiary.programTypes?.[index] || '';
          const programName = beneficiary.programNames[index] || 'Unknown Program';
          
          // Skip ALL type programs in type-specific sections (they'll be shown separately)
          if (programType === 'ALL') {
            return null;
          }
          
          // Track processed programs to avoid duplicates
          if (!processedPrograms.has(programId)) {
            processedPrograms.set(programId, { id: programId, name: programName, type: programType });
            return { id: programId, name: programName };
          }
          return null;
        })
        .filter((p: { id: string; name: string } | null): p is { id: string; name: string } => p !== null);

      return {
        type: beneficiary.type,
        programs,
      };
    }).filter((item: any) => item.programs.length > 0).concat(
      // Add ALL type programs as a separate section if any exist
      allTypeProgramIds.size > 0 ? [{
        type: 'ALL',
        programs: Array.from(allTypeProgramIds).map((programId: string) => {
          // Find the program name from any beneficiary info
          for (const beneficiary of citizen.beneficiaryInfo) {
            const index = beneficiary.programIds.indexOf(programId);
            if (index !== -1) {
              return {
                id: programId,
                name: beneficiary.programNames[index] || 'Unknown Program',
              };
            }
          }
          return { id: programId, name: 'Unknown Program' };
        }),
      }] : []
    );
  };

  // Reset page when filters change
  useEffect(() => {
    goToPage(1);
  }, [searchQuery, statusFilter, goToPage]);

  const handleAddCitizen = async (_data: any) => {
    // Citizen creation is handled in the modal's handleAddCitizen hook
    // This function is called after successful creation to refresh the list
    setIsAddModalOpen(false);
    refreshCitizens(); // Refresh citizens list without page reload
  };

  const handleEditCitizen = async (data: EditCitizenInput) => {
    if (!selectedCitizen) return;
    try {
      const updatedCitizen = await citizenService.updateCitizen(selectedCitizen.id, data);
      toast({
        title: 'Success',
        description: 'Citizen updated successfully',
      });
      setIsEditModalOpen(false);
      // Update selected citizen with the updated data
      setSelectedCitizen(updatedCitizen);
      refreshCitizens(); // Refresh citizens list without page reload
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to update citizen',
      });
    }
  };

  const handleApproveCitizen = async (remarks: string) => {
    if (!selectedCitizen) return;
    try {
      await citizenService.approveCitizen(selectedCitizen.id, remarks);
      toast({
        title: 'Success',
        description: 'Citizen approved successfully',
      });
      setIsApproveModalOpen(false);
      refreshCitizens(); // Refresh citizens list without page reload
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to approve citizen',
      });
    }
  };

  const handleRejectCitizen = async (remarks: string) => {
    if (!selectedCitizen) return;
    try {
      await citizenService.rejectCitizen(selectedCitizen.id, remarks);
      toast({
        title: 'Success',
        description: 'Citizen rejected successfully',
      });
      setIsRejectModalOpen(false);
      refreshCitizens(); // Refresh citizens list without page reload
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to reject citizen',
      });
    }
  };

  const handleRemoveCitizen = async (remarks: string) => {
    if (!selectedCitizen || isRemoveLoading) return;
    try {
      setIsRemoveLoading(true);
      await citizenService.removeCitizen(selectedCitizen.id, remarks);
      toast({
        title: 'Success',
        description: 'Citizen removed successfully',
      });
      setIsRemoveModalOpen(false);
      setSelectedCitizen(null); // Clear selected citizen
      refreshCitizens(); // Refresh citizens list without page reload
    } catch (error: any) {
      logger.error('Error removing citizen:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to remove citizen',
      });
      // Don't close modal on error so user can try again
    } finally {
      setIsRemoveLoading(false);
    }
  };

  const handleActivateCitizen = async () => {
    if (!selectedCitizen) return;
    try {
      await citizenService.activateCitizen(selectedCitizen.id);
      toast({
        title: 'Success',
        description: 'Citizen activated successfully',
      });
      setIsActivateModalOpen(false);
      refreshCitizens(); // Refresh citizens list without page reload
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to activate citizen',
      });
    }
  };

  const handleDeactivateCitizen = async () => {
    if (!selectedCitizen) return;
    try {
      await citizenService.deactivateCitizen(selectedCitizen.id);
      toast({
        title: 'Success',
        description: 'Citizen deactivated successfully',
      });
      setIsActivateModalOpen(false);
      refreshCitizens(); // Refresh citizens list without page reload
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to deactivate citizen',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-success-100 text-success-700',
      pending: 'bg-warning-100 text-warning-700',
      inactive: 'bg-neutral-200 text-neutral-700',
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className={cn("space-y-4") }>
        {/* Header */}
        <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4") }>
          <div>
            <h2 className={cn("text-2xl font-semibold text-heading-700") }>Citizens</h2>
            <p className={cn("text-sm text-gray-500 mt-1") }>
              Manage and view all registered citizens
            </p>
          </div>
          <Button 
            className={cn("bg-primary-600 hover:bg-primary-700") } 
            onClick={() => setIsAddModalOpen(true)}
          >
            <div className="mr-2"><FiPlus size={16} /></div>
            Add New Citizen
          </Button>
        </div>

        {/* Main Content: List + Details */}
        <div className={cn("grid grid-cols-1 xl:grid-cols-5 gap-4") }>
          {/* Left: Citizens List */}
          <Card className={cn("lg:col-span-2 overflow-visible min-w-fit") }>
            <CardHeader>
              <CardTitle className="text-heading-700 text-lg">Citizens List</CardTitle>
              
              {/* Search */}
              <div className={cn("relative mt-4") }>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiSearch size={18} />
                </div>
                <Input
                  placeholder="Search citizens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn("pl-10 h-10") }
                />
              </div>
              
              {/* Status Filter */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button
                  size="sm"
                  variant={statusFilter === undefined ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(undefined)}
                  className={cn(statusFilter !== undefined && "text-primary-600 hover:text-primary-700 hover:bg-primary-50")}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('PENDING')}
                  className={cn(statusFilter !== 'PENDING' && "text-primary-600 hover:text-primary-700 hover:bg-primary-50")}
                >
                  Pending
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={cn(statusFilter !== 'ACTIVE' && "text-primary-600 hover:text-primary-700 hover:bg-primary-50")}
                >
                  Active
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'INACTIVE' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={cn(statusFilter !== 'INACTIVE' && "text-primary-600 hover:text-primary-700 hover:bg-primary-50")}
                >
                  Inactive
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'REJECTED' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('REJECTED')}
                  className={cn(statusFilter !== 'REJECTED' && "text-primary-600 hover:text-primary-700 hover:bg-primary-50")}
                >
                  Rejected
                </Button>
              </div>

              {/* Total count */}
              <div className={cn("flex justify-between items-center mt-3 text-sm text-gray-600") }>
                <span>Total: {filteredCitizens.length} citizens</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex flex-col">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading citizens...
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                    {paginatedFilteredCitizens.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No citizens found.
                      </div>
                    ) : (
                      paginatedFilteredCitizens.map((citizen: any) => (
                        <div key={citizen.id} className="relative">
                          <Card
                            className={cn(
                              'cursor-pointer transition-all hover:shadow-md',
                              selectedCitizen?.id === citizen.id
                                ? 'border-primary-600 bg-primary-50'
                                : 'hover:border-primary-300'
                            )}
                            onClick={() => setSelectedCitizen(citizen)}
                          >
                            <CardContent className="p-4">
                              <div className="flex flex-col items-start justify-between gap-2">
                                <div className='flex gap-2'>
                              {isBeneficiary(citizen) && (
                                      <Badge className="bg-orange-100 text-orange-700 text-xs">
                                        Beneficiary
                                      </Badge>
                                    )}
                                 {getStatusBadge(citizen.status)}
                                 </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-heading-700">{citizen.name}</h3>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                                    <FiCalendar size={14} />
                                    {citizen.dateOfBirth
                                      ? formatDateWithoutTimezone(citizen.dateOfBirth, {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                        })
                                      : 'Not provided'}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Pointing Arrow - Only on large screens */}
                          {selectedCitizen?.id === citizen.id && (
                            <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                              <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Pagination - Always at bottom */}
                  {totalPages > 1 && (
                    <div className="mt-4 pt-4 border-t flex-shrink-0">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={goToPage}
                        onNext={goToNextPage}
                        onPrevious={goToPreviousPage}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Right: Selected Citizen Information */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-heading-700 text-lg">Citizen Information</CardTitle>
                {selectedCitizen && (
                  <div className="flex gap-2">
                    {selectedCitizen.status === 'pending' ? (
                      <>
                        <Button
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => setIsApproveModalOpen(true)}
                        >
                          <div className="mr-1"><FiCheck size={14} /></div>
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setIsRejectModalOpen(true)}
                        >
                          <div className="mr-1"><FiX size={14} /></div>
                          Reject
                        </Button>
                      </>
                    ) : (
                      <>
                        {selectedCitizen.status === 'active' ? (
                          <Button 
                            size="sm" 
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => setIsActivateModalOpen(true)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => setIsActivateModalOpen(true)}
                          >
                            Activate
                          </Button>
                        )}
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
                          onClick={() => setIsRemoveModalOpen(true)}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="max-h-[680px] overflow-y-auto">
              {selectedCitizen ? (
                <div className="space-y-6">
                  {/* Profile Picture and Basic Info */}
                  <div className="flex items-start gap-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div 
                        className={cn(
                          "w-28 h-28 rounded-full bg-white border-4 border-primary-200 overflow-hidden shadow-md transition-shadow",
                          selectedCitizen.citizenPicture ? "cursor-pointer hover:shadow-lg" : ""
                        )}
                        onClick={() => {
                          if (selectedCitizen.citizenPicture) {
                            setImageModalType('profile');
                            setIsImageModalOpen(true);
                          }
                        }}
                      >
                        {selectedCitizen.citizenPicture ? (
                          <img 
                            src={selectedCitizen.citizenPicture} 
                            alt={`${selectedCitizen.firstName} ${selectedCitizen.lastName}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNjAiIHI9IjI1IiBmaWxsPSIjOUI5QkEwIi8+CjxwYXRoIGQ9Ik0zMCAxMjBDMzAgMTAwLjExOCA0NS4xMTggODUgNjUgODVIOThDMTE4Ljg4MiA4NSAxMzQgMTAwLjExOCAxMzQgMTIwVjE1MEgzMFYxMjBaIiBmaWxsPSIjOUI5QkEwIi8+Cjwvc3ZnPg==';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <FiUser size={48} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      {!selectedCitizen.citizenPicture && (
                        <p className="text-xs text-gray-500 text-center mt-2">No image uploaded</p>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-heading-800 mb-3">
                        {selectedCitizen.firstName} {selectedCitizen.middleName} {selectedCitizen.lastName} {selectedCitizen.extensionName}
                      </h3>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">Resident ID:</span>
                          <span className="text-sm font-bold text-heading-800 font-mono bg-white px-2 py-1 rounded border">{selectedCitizen.residentId}</span>
                        </div>
                        <div>{getStatusBadge(selectedCitizen.status)}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Residency Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Residency Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Residency Status</label>
                        <div className="min-h-[40px] flex items-center">
                          {getStatusBadge(selectedCitizen.residencyStatus)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resident ID</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.residentId ? (
                            <p className="text-sm font-medium text-heading-700 font-mono bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.residentId}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not assigned</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Residency Application Remarks</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.residencyApplicationRemarks ? (
                            <p className="text-sm text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.residencyApplicationRemarks}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">No remarks</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Personal Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.lastName ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.lastName}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Middle Name</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.middleName ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.middleName}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.firstName ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.firstName}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extension Name</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.extensionName ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.extensionName}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Employment Status</label>
                        <div className="min-h-[40px] flex items-center">
                          <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                            {selectedCitizen.isEmployed ? 'Employed' : 'Not Employed'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Government Programs Registered */}
                  {selectedCitizen && isBeneficiary(selectedCitizen) && (
                    <>
                      <Separator />
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Government Programs Registered</h3>
                        <div className="space-y-4">
                          {getBeneficiaryPrograms(selectedCitizen).map((beneficiary, index) => (
                            <div key={index} className="space-y-2">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                {beneficiary.type === 'SENIOR_CITIZEN' && 'Senior Citizen Programs'}
                                {beneficiary.type === 'PWD' && 'PWD Programs'}
                                {beneficiary.type === 'STUDENT' && 'Student Programs'}
                                {beneficiary.type === 'SOLO_PARENT' && 'Solo Parent Programs'}
                                {beneficiary.type === 'ALL' && 'Universal Programs (All Beneficiaries)'}
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {beneficiary.programs.length > 0 ? (
                                  beneficiary.programs.map(program => (
                                    <Badge key={program.id} className="bg-primary-100 text-primary-700">
                                      {program.name}
                                    </Badge>
                                  ))
                                ) : (
                                  <p className="text-sm text-gray-400 italic">No programs registered</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Contact Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone Number</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.phoneNumber ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.phoneNumber}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.email ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.email}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Spouse and Emergency Contact */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">
                      {selectedCitizen.civilStatus?.toLowerCase() === 'married' ? 'Spouse and Emergency Contact' : 'Emergency Contact'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedCitizen.civilStatus?.toLowerCase() === 'married' && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Spouse Name</label>
                          <div className="min-h-[40px] flex items-center">
                            {selectedCitizen.spouseName ? (
                              <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.spouseName}</p>
                            ) : (
                              <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact Person</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.emergencyContactPerson ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.emergencyContactPerson}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact Number</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.emergencyContactNumber ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.emergencyContactNumber}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Complete Address */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Complete Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.addressRegion ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{getRegionName(selectedCitizen.addressRegion)}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Province</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.addressProvince ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.addressProvince}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipality</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.addressMunicipality ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.addressMunicipality}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Barangay</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.addressBarangay ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.addressBarangay}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Postal Code</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.addressPostalCode ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.addressPostalCode}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit No. / House No. / Street Name</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.addressStreetAddress ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.addressStreetAddress}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      {/* Legacy Address Field (for backward compatibility) */}
                      {selectedCitizen.address && (
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Legacy Address (Old Format)</label>
                          <div className="min-h-[40px] flex items-center">
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.address}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Demographics */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Demographics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.gender ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">{selectedCitizen.gender}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Civil Status</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.civilStatus ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full capitalize">{selectedCitizen.civilStatus}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Citizenship</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.citizenship ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.citizenship}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ACR No.</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.acrNo ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full font-mono">{selectedCitizen.acrNo}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not applicable</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Place of Birth</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.placeOfBirth ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.placeOfBirth}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.dateOfBirth ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                              {formatDateWithoutTimezone(selectedCitizen.dateOfBirth, {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Professional Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Professional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profession/Occupation</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.profession ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.profession}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Height</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.height ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.height}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.weight ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.weight}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Account Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Account Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.username ? (
                            <p className="text-sm font-medium text-heading-700 font-mono bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.username}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">PIN</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.pin ? (
                            <p className="text-sm font-medium text-heading-700 font-mono bg-gray-50 px-3 py-2 rounded border w-full">{selectedCitizen.pin}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                        <div className="min-h-[40px] flex items-center">
                          {getStatusBadge(selectedCitizen.status)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Registered</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.dateRegistered ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">
                              {formatDateWithoutTimezone(selectedCitizen.dateRegistered, {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Valid ID */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Valid ID</h3>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ID Type</label>
                        <div className="min-h-[40px] flex items-center">
                          {selectedCitizen.idType ? (
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{formatIdType(selectedCitizen.idType)}</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic bg-gray-50 px-3 py-2 rounded border w-full">Not provided</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      {selectedCitizen.proofOfIdentification ? (
                        <>
                          <div 
                            className="w-48 h-60 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-gray-200"
                            onClick={() => {
                              setImageModalType('identification');
                              setIsImageModalOpen(true);
                            }}
                          >
                            {imageErrors.identification ? (
                              <ImagePlaceholder size="small" message="No image" className="rounded-lg" />
                            ) : (
                              <img
                                src={selectedCitizen.proofOfIdentification}
                                alt={`${selectedCitizen.name} - Valid ID`}
                                className="w-full h-full object-cover"
                                onError={() => {
                                  setImageErrors(prev => ({ ...prev, identification: true }));
                                }}
                              />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 text-center mt-3">
                            Click to view larger image
                          </p>
                        </>
                      ) : (
                        <div className="w-48 h-60 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50">
                          <FiUser size={48} className="text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">No ID image uploaded</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a citizen to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modals */}
      <AddCitizenModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddCitizen}
      />
      <EditCitizenModal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditCitizen}
        initialData={selectedCitizen ? {
          citizenPicture: selectedCitizen.citizenPicture || '',
          firstName: selectedCitizen.firstName || '',
          middleName: selectedCitizen.middleName || '',
          lastName: selectedCitizen.lastName || '',
          extensionName: selectedCitizen.extensionName || '',
          civilStatus: selectedCitizen.civilStatus || '',
          sex: selectedCitizen.sex || selectedCitizen.gender?.toLowerCase() || '',
          birthdate: selectedCitizen.birthDate || selectedCitizen.dateOfBirth || '',
          region: selectedCitizen.citizenPlaceOfBirth?.region || '',
          province: selectedCitizen.citizenPlaceOfBirth?.province || '',
          municipality: selectedCitizen.citizenPlaceOfBirth?.municipality || '',
          // Contact Information
          phoneNumber: selectedCitizen.phoneNumber || '',
          email: selectedCitizen.email || '',
          // Spouse and Emergency Contact
          spouseName: selectedCitizen.spouseName || '',
          emergencyContactPerson: selectedCitizen.emergencyContactPerson || '',
          emergencyContactNumber: selectedCitizen.emergencyContactNumber || '',
          // Complete Address
          addressRegion: selectedCitizen.addressRegion || '',
          addressProvince: selectedCitizen.addressProvince || '',
          addressMunicipality: selectedCitizen.addressMunicipality || '',
          addressBarangay: selectedCitizen.addressBarangay || '',
          addressPostalCode: selectedCitizen.addressPostalCode || '',
          addressStreetAddress: selectedCitizen.addressStreetAddress || '',
          // Valid ID
          idType: selectedCitizen.idType || '',
          proofOfIdentification: selectedCitizen.proofOfIdentification || '',
          isResident: selectedCitizen.isResident || false,
          isVoter: selectedCitizen.isVoter || false,
          username: selectedCitizen.username || '',
          pin: selectedCitizen.pin || '',
          address: selectedCitizen.address || '',
          isEmployed: selectedCitizen.isEmployed || false,
          citizenship: selectedCitizen.citizenship || '',
          acrNo: selectedCitizen.acrNo || '',
          profession: selectedCitizen.profession || '',
          height: selectedCitizen.height || '',
          weight: selectedCitizen.weight || '',
        } : undefined}
        citizenId={selectedCitizen?.id}
      />
      {/* Image Modal */}
      {isImageModalOpen && selectedCitizen && imageModalType && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => {
            setIsImageModalOpen(false);
            setImageModalType(null);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl max-h-[95vh] overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-heading-800">
                {selectedCitizen.firstName} {selectedCitizen.lastName} - {
                  imageModalType === 'profile' ? 'Profile Picture' : 
                  'Valid ID'
                }
              </h3>
              <button 
                onClick={() => {
                  setIsImageModalOpen(false);
                  setImageModalType(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX size={28} />
              </button>
            </div>
            <div className="flex justify-center items-center min-h-[70vh]">
              {imageModalType === 'profile' ? (
                selectedCitizen.citizenPicture && !imageErrors.profileModal ? (
                  <img 
                    src={selectedCitizen.citizenPicture} 
                    alt={`${selectedCitizen.firstName} ${selectedCitizen.lastName}`}
                    className="w-auto h-[70vh] object-cover rounded-xl shadow-2xl"
                    onError={() => {
                      setImageErrors(prev => ({ ...prev, profileModal: true }));
                    }}
                  />
                ) : (
                  <ImagePlaceholder size="large" message="No image available" />
                )
              ) : (
                selectedCitizen.proofOfIdentification && !imageErrors.identificationModal ? (
                  <img 
                    src={selectedCitizen.proofOfIdentification} 
                    alt={`${selectedCitizen.firstName} ${selectedCitizen.lastName} - Valid ID`}
                    className="w-auto h-[70vh] object-cover rounded-xl shadow-2xl"
                    onError={() => {
                      setImageErrors(prev => ({ ...prev, identificationModal: true }));
                    }}
                  />
                ) : (
                  <div className="w-full h-[70vh] flex flex-col items-center justify-center bg-gray-100 rounded-xl">
                    <FiUser size={128} className="text-gray-400 mb-4" />
                    <p className="text-lg text-gray-500">No image uploaded</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
      <ApproveCitizenModal
        open={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onConfirm={handleApproveCitizen}
        citizenName={selectedCitizen ? `${selectedCitizen.firstName} ${selectedCitizen.lastName}` : ''}
      />
      <RejectCitizenModal
        open={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleRejectCitizen}
        citizenName={selectedCitizen ? `${selectedCitizen.firstName} ${selectedCitizen.lastName}` : ''}
      />
      <RemoveCitizenModal
        open={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={handleRemoveCitizen}
        citizenName={selectedCitizen ? `${selectedCitizen.firstName} ${selectedCitizen.lastName}` : ''}
        isLoading={isRemoveLoading}
      />
      <ActivateCitizenModal
        open={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        onConfirm={selectedCitizen?.status === 'active' ? handleDeactivateCitizen : handleActivateCitizen}
        citizenName={selectedCitizen ? `${selectedCitizen.firstName} ${selectedCitizen.lastName}` : ''}
        isActivating={selectedCitizen?.status !== 'active'}
      />
    </DashboardLayout>
  );
};

