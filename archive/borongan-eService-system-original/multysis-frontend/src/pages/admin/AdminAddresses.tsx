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
    ActivateAddressModal,
    AddAddressModal,
    DeleteAddressModal,
    EditAddressModal,
} from '@/components/modals/addresses';

// Hooks
import { useAddresses, type CreateAddressInput, type UpdateAddressInput } from '@/hooks/addresses/useAddresses';
import { useDebounce } from '@/hooks/useDebounce';

// Utils
import { adminMenuItems } from '@/config/admin-menu';
import { getRegionName } from '@/constants/regions';
import { cn } from '@/lib/utils';

export const AdminAddresses: React.FC = () => {
  const {
    addresses,
    selectedAddress,
    setSelectedAddress,
    isLoading,
    error,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createAddress,
    updateAddress,
    deleteAddress,
    activateAddress,
    deactivateAddress,
    formatAddress,
  } = useAddresses();

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
    const headers = ['Region', 'Province', 'Municipality', 'Barangay', 'Postal Code', 'Street Address', 'Status', 'Created Date'];
    const rows = addresses.map(address => [
      getRegionName(address.region),
      address.province,
      address.municipality,
      address.barangay,
      address.postalCode,
      address.streetAddress || 'N/A',
      address.isActive ? 'Active' : 'Inactive',
      new Date(address.createdAt).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `addresses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreateAddress = async (data: CreateAddressInput) => {
    try {
      setIsActionLoading(true);
      await createAddress(data);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create address:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateAddress = async (id: string, data: UpdateAddressInput) => {
    try {
      setIsActionLoading(true);
      await updateAddress(id, data);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update address:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (selectedAddress) {
      try {
        setIsActionLoading(true);
        await deleteAddress(selectedAddress.id);
        setIsDeleteModalOpen(false);
      } catch (error) {
        console.error('Failed to delete address:', error);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleToggleActive = async () => {
    if (!selectedAddress) return;
    try {
      setIsActionLoading(true);
      if (selectedAddress.isActive) {
        await deactivateAddress(selectedAddress.id);
      } else {
        await activateAddress(selectedAddress.id);
      }
      setIsActivateModalOpen(false);
    } catch (error) {
      console.error('Failed to toggle address status:', error);
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
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">Addresses</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage addresses for citizens and subscribers
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
              Add Address
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
          {/* Left: Addresses List */}
          <Card className="lg:col-span-1 overflow-visible">
            <CardHeader>
              <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
                <FiSettings size={20} />
                Addresses List
              </CardTitle>
              
              {/* Search */}
              <div className="relative mt-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiSearch size={18} />
                </div>
                <Input
                  placeholder="Search addresses..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-2 mt-3">
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
                <span>Total: {addresses.length} addresses</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex flex-col">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading addresses...
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                  {addresses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No addresses found.
                    </div>
                  ) : (
                    addresses.map((address) => (
                      <div key={address.id} className="relative">
                        <Card
                          className={cn(
                            'cursor-pointer transition-all hover:shadow-md',
                            selectedAddress?.id === address.id
                              ? 'border-primary-600 bg-primary-50'
                              : 'hover:border-primary-300'
                          )}
                          onClick={() => setSelectedAddress(address)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-heading-700">{formatAddress(address)}</h3>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {getStatusBadge(address.isActive)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Pointing Arrow - Only on large screens */}
                        {selectedAddress?.id === address.id && (
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

          {/* Right: Selected Address Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-heading-700 text-lg">Address Details</CardTitle>
                {selectedAddress && (
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
                      variant={selectedAddress.isActive ? 'outline' : 'default'}
                      onClick={() => setIsActivateModalOpen(true)}
                      disabled={isActionLoading}
                      className={selectedAddress.isActive ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {selectedAddress.isActive ? (
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
              {selectedAddress ? (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-heading-800 mb-6 pb-2 border-b-2 border-primary-200">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Region</label>
                        <div className="min-h-[40px] flex items-center">
                          <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{getRegionName(selectedAddress.region)}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Province</label>
                        <div className="min-h-[40px] flex items-center">
                          <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedAddress.province}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipality</label>
                        <div className="min-h-[40px] flex items-center">
                          <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedAddress.municipality}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Barangay</label>
                        <div className="min-h-[40px] flex items-center">
                          <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedAddress.barangay}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Postal Code</label>
                        <div className="min-h-[40px] flex items-center">
                          <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedAddress.postalCode}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                        <div className="min-h-[40px] flex items-center">
                          {getStatusBadge(selectedAddress.isActive)}
                        </div>
                      </div>
                      {selectedAddress.streetAddress && (
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Street Address</label>
                          <div className="min-h-[40px] flex items-center">
                            <p className="text-sm font-medium text-heading-700 bg-gray-50 px-3 py-2 rounded border w-full">{selectedAddress.streetAddress}</p>
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
                            {new Date(selectedAddress.createdAt).toLocaleDateString('en-US', {
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
                            {new Date(selectedAddress.updatedAt).toLocaleDateString('en-US', {
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
                  <p className="text-lg">Select an address to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddAddressModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateAddress}
        isLoading={isActionLoading}
      />
      
      <EditAddressModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateAddress}
        address={selectedAddress}
        isLoading={isActionLoading}
      />

      <DeleteAddressModal 
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAddress}
        addressLabel={selectedAddress ? formatAddress(selectedAddress) : ''}
        isLoading={isActionLoading}
      />

      <ActivateAddressModal
        open={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        onConfirm={handleToggleActive}
        addressLabel={selectedAddress ? formatAddress(selectedAddress) : ''}
        isActivating={!selectedAddress?.isActive}
        isLoading={isActionLoading}
      />
    </DashboardLayout>
  );
};

