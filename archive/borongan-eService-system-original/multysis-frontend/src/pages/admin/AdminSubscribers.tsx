import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
    ActivateSubscriberModal,
    AddSubscriberModal,
    BlockSubscriberModal,
    ChangePasswordModal,
    EditProfileModal
} from '@/components/modals/subscribers';
import { SubscriberTabs } from '@/components/subscribers/SubscriberTabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { adminMenuItems } from '@/config/admin-menu';
import { useSocket } from '@/context/SocketContext';
import { useSubscribers } from '@/hooks/subscribers/useSubscribers';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { subscriberService } from '@/services/api/subscriber.service';
import type { NewSubscriberPayload, SubscriberUpdatePayload } from '@/types/socket.types';
import type { AddSubscriberInput, EditProfileInput } from '@/validations/subscriber.schema';
import React, { useEffect, useState } from 'react';
import { FiDownload, FiEdit, FiPlus, FiSearch, FiUser, FiX } from 'react-icons/fi';

export const AdminSubscribers: React.FC = () => {
  const {
    filteredSubscribers,
    paginatedFilteredSubscribers,
    selectedSubscriber,
    setSelectedSubscriber,
    searchQuery,
    setSearchQuery,
    residencyFilter,
    setResidencyFilter,
    // Pagination
    currentPage,
    totalPages,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    isLoading,
    refreshSubscribers,
  } = useSubscribers();
  
  const { toast } = useToast();
  const { socket, isConnected, subscribeToSubscriber, unsubscribeFromSubscriber } = useSocket();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  // Listen for new subscribers via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleNewSubscriber = (data: NewSubscriberPayload) => {
      // Refresh subscribers list to include new subscriber
      refreshSubscribers();
      toast({
        title: 'New Subscriber',
        description: `${data.firstName} ${data.lastName} has been added`,
      });
    };

    socket.on('subscriber:new', handleNewSubscriber);

    return () => {
      socket.off('subscriber:new', handleNewSubscriber);
    };
  }, [socket, isConnected, refreshSubscribers, toast]);

  // Listen for subscriber updates via WebSocket
  useEffect(() => {
    if (!socket || !isConnected || !selectedSubscriber) {
      return;
    }

    subscribeToSubscriber(selectedSubscriber.id);

    const handleSubscriberUpdate = (update: SubscriberUpdatePayload) => {
      if (update.subscriberId === selectedSubscriber.id) {
        // Refresh subscribers list to get updated status
        refreshSubscribers();
        toast({
          title: 'Subscriber Updated',
          description: `Subscriber status has been updated to ${update.status || 'unknown'}`,
        });
      }
    };

    socket.on('subscriber:update', handleSubscriberUpdate);

    return () => {
      if (selectedSubscriber) {
        unsubscribeFromSubscriber(selectedSubscriber.id);
      }
      socket.off('subscriber:update', handleSubscriberUpdate);
    };
  }, [socket, isConnected, selectedSubscriber, subscribeToSubscriber, unsubscribeFromSubscriber, refreshSubscribers, toast]);

  const handleDownload = () => {
    // Create CSV content
    const headers = ['Name', 'Phone Number', 'Email', 'Status', 'Residency', 'Date Subscribed'];
    const rows = filteredSubscribers.map(sub => [
      sub.name,
      sub.phoneNumber,
      sub.email || '',
      sub.status,
      sub.residencyType || '',
      sub.dateSubscribed
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
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddSubscriber = async (data: AddSubscriberInput) => {
    try {
      await subscriberService.createSubscriber(data);
      toast({
        title: 'Success',
        description: 'Subscriber created successfully',
      });
      setIsAddModalOpen(false);
      // Refresh subscribers list
      await refreshSubscribers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to create subscriber',
      });
      throw error; // Re-throw to prevent modal from closing on error
    }
  };

  const handleEditProfile = async (data: EditProfileInput) => {
    if (!selectedSubscriber) return;
    try {
      const updatedSubscriber = await subscriberService.updateSubscriber(selectedSubscriber.id, data);
      toast({
        title: 'Success',
        description: 'Subscriber updated successfully',
      });
      setIsEditModalOpen(false);
      // Update selected subscriber with the updated data
      setSelectedSubscriber(updatedSubscriber);
      // Refresh subscribers list
      await refreshSubscribers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to update subscriber',
      });
      throw error; // Re-throw to prevent modal from closing
    }
  };

  const handleActivateSubscriber = async () => {
    if (!selectedSubscriber) return;
    setIsActivating(true);
    try {
      const updatedSubscriber = await subscriberService.activateSubscriber(selectedSubscriber.id);
      const wasBlocked = selectedSubscriber.status?.toLowerCase() === 'blocked';
      toast({
        title: 'Success',
        description: wasBlocked 
          ? 'Subscriber unblocked and activated successfully' 
          : 'Subscriber activated successfully',
      });
      setIsActivateModalOpen(false);
      // Update selected subscriber with the updated data
      setSelectedSubscriber(updatedSubscriber);
      // Refresh subscribers list
      await refreshSubscribers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to activate subscriber',
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleDeactivateSubscriber = async () => {
    if (!selectedSubscriber) return;
    setIsDeactivating(true);
    try {
      const updatedSubscriber = await subscriberService.deactivateSubscriber(selectedSubscriber.id);
      toast({
        title: 'Success',
        description: 'Subscriber deactivated successfully',
      });
      setIsActivateModalOpen(false);
      // Update selected subscriber with the updated data
      setSelectedSubscriber(updatedSubscriber);
      // Refresh subscribers list
      await refreshSubscribers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to deactivate subscriber',
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleBlockSubscriber = async (remarks: string) => {
    if (!selectedSubscriber) return;
    setIsBlocking(true);
    try {
      const updatedSubscriber = await subscriberService.blockSubscriber(selectedSubscriber.id, remarks);
      toast({
        title: 'Success',
        description: 'Subscriber blocked successfully',
      });
      setIsBlockModalOpen(false);
      // Update selected subscriber with the updated data
      setSelectedSubscriber(updatedSubscriber);
      // Refresh subscribers list
      await refreshSubscribers();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to block subscriber',
      });
    } finally {
      setIsBlocking(false);
    }
  };

  const handleChangePassword = async (data: { password: string; confirmPassword: string }) => {
    if (!selectedSubscriber) return;
    try {
      await subscriberService.changePassword(selectedSubscriber.id, data.password, data.confirmPassword);
      toast({
        title: 'Success',
        description: 'Password changed successfully',
      });
      setIsChangePasswordModalOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to change password',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-success-100 text-success-700',
      pending: 'bg-warning-100 text-warning-700',
      expired: 'bg-neutral-200 text-neutral-700',
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };


  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">Subscribers</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage and view all subscribers
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
              Add New Subscriber
            </Button>
          </div>
        </div>

        {/* Main Content: List + Details */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          {/* Left: Subscribers List */}
          <Card className="lg:col-span-2 overflow-visible min-w-fit">
            <CardHeader>
              <CardTitle className="text-heading-700 text-lg">Subscribers List</CardTitle>
              
              {/* Search */}
              <div className="relative mt-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiSearch size={18} />
                </div>
                <Input
                  placeholder="Search subscribers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Filter */}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant={residencyFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setResidencyFilter('all')}
                  className={residencyFilter === 'all' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={residencyFilter === 'resident' ? 'default' : 'outline'}
                  onClick={() => setResidencyFilter('resident')}
                  className={residencyFilter === 'resident' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                >
                  Resident
                </Button>
                <Button
                  size="sm"
                  variant={residencyFilter === 'non-resident' ? 'default' : 'outline'}
                  onClick={() => setResidencyFilter('non-resident')}
                  className={residencyFilter === 'non-resident' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                >
                  Non-Resident
                </Button>
              </div>
              
              {/* Total count */}
              <div className="flex justify-between items-center mt-3 text-sm text-gray-600">
                <span>Total: {filteredSubscribers.length} subscribers</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex flex-col">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading subscribers...
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                  {paginatedFilteredSubscribers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No subscribers found.
                    </div>
                  ) : (
                    paginatedFilteredSubscribers.map((subscriber) => (
                    <div key={subscriber.id} className="relative">
                      <Card
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          selectedSubscriber?.id === subscriber.id
                            ? 'border-primary-600 bg-primary-50'
                            : 'hover:border-primary-300'
                        )}
                        onClick={() => setSelectedSubscriber(subscriber)}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2 items-start justify-between">
                            <div className="flex items-center gap-2">
                              {getStatusBadge(subscriber.status)}
                              {/* Non-Citizen Badge */}
                              {subscriber.person?.type === 'SUBSCRIBER' && (
                                <Badge className="bg-blue-100 text-blue-700 text-xs">
                                  Non-Citizen
                                </Badge>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-heading-700">{subscriber.name}</h3>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Pointing Arrow - Only on large screens */}
                      {selectedSubscriber?.id === subscriber.id && (
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                          <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
                        </div>
                      )}
                    </div>
                    ))
                  )}
                </div>
              )}
              
              {/* Pagination - Always at bottom */}
              {totalPages > 1 && (
                <div className="mt-4 pt-4 border-t flex-shrink-0">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    onPrevious={goToPreviousPage}
                    onNext={goToNextPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Selected Subscriber Information */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-heading-700 text-lg">Subscriber Information</CardTitle>
                {selectedSubscriber && (
                  <div className="flex gap-2">
                    {selectedSubscriber.status?.toLowerCase() === 'active' ? (
                      <Button 
                        size="sm" 
                        className="bg-orange-600 hover:bg-orange-700"
                        onClick={() => setIsActivateModalOpen(true)}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      // Show Activate button for PENDING, EXPIRED, and BLOCKED (activating BLOCKED will unblock)
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setIsActivateModalOpen(true)}
                      >
                        {selectedSubscriber.status?.toLowerCase() === 'blocked' ? 'Unblock & Activate' : 'Activate'}
                      </Button>
                    )}
                    {selectedSubscriber.status?.toLowerCase() !== 'blocked' && (
                      // Show Block button for ACTIVE, PENDING, and EXPIRED (not for BLOCKED)
                      <Button 
                        size="sm" 
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => setIsBlockModalOpen(true)}
                      >
                        Block
                      </Button>
                    )}
                    {/* Only show Edit button if subscriber is NOT linked to a citizen */}
                    {selectedSubscriber?.person?.type !== 'CITIZEN' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                        onClick={() => setIsEditModalOpen(true)}
                      >
                        <div className="mr-1"><FiEdit size={14} /></div>
                        Edit
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      onClick={() => setIsChangePasswordModalOpen(true)}
                    >
                      Change Password
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="max-h-[680px] overflow-y-auto">
              {selectedSubscriber ? (
                <SubscriberTabs 
                  selectedSubscriber={selectedSubscriber}
                  onImageClick={() => setIsImageModalOpen(true)}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a subscriber to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddSubscriberModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddSubscriber}
      />
      
      <EditProfileModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditProfile}
        isLinkedToCitizen={selectedSubscriber?.person?.type === 'CITIZEN'}
        initialData={selectedSubscriber ? {
          firstName: selectedSubscriber.firstName || '',
          middleName: selectedSubscriber.middleName || '',
          lastName: selectedSubscriber.lastName || '',
          extensionName: selectedSubscriber.extensionName || '',
          email: selectedSubscriber.email || '',
          phoneNumber: selectedSubscriber.phoneNumber || '',
          civilStatus: selectedSubscriber.civilStatus || '',
          sex: selectedSubscriber.sex || '',
          birthdate: selectedSubscriber.birthDate || '',
          region: selectedSubscriber.placeOfBirth?.region || '',
          province: selectedSubscriber.placeOfBirth?.province || '',
          municipality: selectedSubscriber.placeOfBirth?.municipality || '',
          motherFirstName: selectedSubscriber.motherInfo?.firstName || '',
          motherMiddleName: selectedSubscriber.motherInfo?.middleName || '',
          motherLastName: selectedSubscriber.motherInfo?.lastName || '',
          picture: selectedSubscriber.profilePicture || '',
          // Address fields
          residentAddress: selectedSubscriber.residentAddress || '',
          addressRegion: selectedSubscriber.addressRegion || '',
          addressProvince: selectedSubscriber.addressProvince || '',
          addressMunicipality: selectedSubscriber.addressMunicipality || '',
          addressBarangay: selectedSubscriber.addressBarangay || '',
          addressStreetAddress: selectedSubscriber.addressStreetAddress || '',
          addressPostalCode: selectedSubscriber.addressPostalCode || '',
        } : undefined}
      />

      {/* Activate/Deactivate Subscriber Modal */}
      <ActivateSubscriberModal 
        open={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        onConfirm={selectedSubscriber?.status?.toLowerCase() === 'active' ? handleDeactivateSubscriber : handleActivateSubscriber}
        subscriberName={selectedSubscriber ? `${selectedSubscriber.firstName} ${selectedSubscriber.lastName}` : ''}
        isActivating={selectedSubscriber?.status?.toLowerCase() !== 'active'}
        isLoading={isActivating || isDeactivating}
        currentStatus={selectedSubscriber?.status}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSubmit={handleChangePassword}
        subscriberName={selectedSubscriber ? `${selectedSubscriber.firstName} ${selectedSubscriber.lastName}` : ''}
      />

      {/* Block Subscriber Modal */}
      <BlockSubscriberModal 
        open={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onConfirm={handleBlockSubscriber}
        subscriberName={selectedSubscriber ? `${selectedSubscriber.firstName} ${selectedSubscriber.lastName}` : ''}
        isLoading={isBlocking}
      />

      {/* Image Modal */}
      {isImageModalOpen && selectedSubscriber && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => setIsImageModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl max-h-[95vh] overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-heading-800">
                {selectedSubscriber.firstName} {selectedSubscriber.lastName} - Profile Picture
              </h3>
              <button 
                onClick={() => setIsImageModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <FiX size={28} />
              </button>
            </div>
            <div className="flex flex-col justify-center items-center min-h-[70vh]">
              {selectedSubscriber.profilePicture && !profileImageError ? (
                <img 
                  src={selectedSubscriber.profilePicture} 
                  alt={`${selectedSubscriber.firstName} ${selectedSubscriber.lastName}`}
                  className="w-auto h-[70vh] object-cover rounded-xl shadow-2xl"
                  onError={() => {
                    setProfileImageError(true);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <FiUser size={128} className="mb-4 text-primary-600" />
                  <p className="text-lg font-medium text-gray-600">No profile picture available</p>
                  <p className="text-sm text-gray-500 mt-2">Click "Edit" to upload a profile picture</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

