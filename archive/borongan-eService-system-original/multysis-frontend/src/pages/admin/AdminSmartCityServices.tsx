// React imports
import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Third-party libraries
import { FiDownload, FiPlus, FiSearch, FiSettings } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';

// Custom Components
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  AddServiceModal,
  DeleteServiceModal,
  EditServiceModal,
} from '@/components/modals/services';
import { ServiceTabs } from '@/components/services/ServiceTabs';

// Hooks
import { useServices } from '@/hooks/services/useServices';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/hooks/use-toast';

// Types and Schemas
import type { CreateServiceInput, UpdateServiceInput } from '@/services/api/service.service';
import type { NewServicePayload, ServiceDeletePayload, ServiceUpdatePayload } from '@/types/socket.types';

// Utils
import { adminMenuItems } from '@/config/admin-menu';
import { cn } from '@/lib/utils';

export const AdminSmartCityServices: React.FC = () => {
  const {
    services,
    selectedService,
    setSelectedService,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    categories,
    currentPage,
    totalPages,
    total,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    createService,
    updateService,
    deleteService,
    activateService,
    deactivateService,
    refreshServices,
  } = useServices();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();

  // Memoize default order calculation
  const defaultOrder = useMemo(() => {
    if (services.length === 0) return 0;
    return Math.max(...services.map(s => s.order), 0) + 1;
  }, [services]);
  
  // Listen for service events via WebSocket
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleNewService = (_data: NewServicePayload) => {
      // Refresh services list to include new service
      refreshServices();
      toast({
        title: 'New Service',
        description: `${_data.name} has been added`,
      });
    };

    const handleServiceUpdate = (_data: ServiceUpdatePayload) => {
      // Refresh services list to get updated service
      refreshServices();
      toast({
        title: 'Service Updated',
        description: 'Service has been updated',
      });
    };

    const handleServiceDelete = (_data: ServiceDeletePayload) => {
      // Refresh services list to remove deleted service
      refreshServices();
      toast({
        title: 'Service Deleted',
        description: 'Service has been deleted',
      });
    };

    socket.on('service:new', handleNewService);
    socket.on('service:update', handleServiceUpdate);
    socket.on('service:delete', handleServiceDelete);

    return () => {
      socket.off('service:new', handleNewService);
      socket.off('service:update', handleServiceUpdate);
      socket.off('service:delete', handleServiceDelete);
    };
  }, [socket, isConnected, toast, refreshServices]);

  const handleDownload = useCallback(() => {
    // Create CSV content
    const headers = ['Service Code', 'Service Name', 'Category', 'Status', 'Created Date'];
    const rows = services.map(service => [
      service.code,
      service.name,
      service.category || 'N/A',
      service.isActive ? 'Active' : 'Inactive',
      new Date(service.createdAt).toLocaleDateString()
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
    a.download = `services-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [services]);

  const handleCreateService = async (data: CreateServiceInput) => {
    try {
      setIsActionLoading(true);
      await createService(data);
      setIsAddModalOpen(false);
      triggerMenuRefresh();
    } catch (error) {
      console.error('Failed to create service:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateService = async (id: string, data: UpdateServiceInput) => {
    try {
      setIsActionLoading(true);
      await updateService(id, data);
      setIsEditModalOpen(false);
      triggerMenuRefresh();
    } catch (error) {
      console.error('Failed to update service:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteService = async () => {
    if (selectedService) {
      try {
        setIsActionLoading(true);
        await deleteService(selectedService.id);
        setIsDeleteModalOpen(false);
        triggerMenuRefresh();
      } catch (error) {
        console.error('Failed to delete service:', error);
      } finally {
        setIsActionLoading(false);
      }
    }
  };

  const handleToggleActive = async () => {
    if (!selectedService) return;
    try {
      setIsActionLoading(true);
      if (selectedService.isActive) {
        await deactivateService(selectedService.id);
      } else {
        await activateService(selectedService.id);
      }
      triggerMenuRefresh();
    } catch (error) {
      console.error('Failed to toggle service status:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Trigger menu refresh after service changes
  const triggerMenuRefresh = () => {
    window.dispatchEvent(new Event('serviceUpdated'));
  };

  const getStatusBadge = useCallback((isActive: boolean) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-red-100 text-red-700',
    };

    return (
      <Badge className={variants[isActive ? 'active' : 'inactive']}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  }, []);

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">Smart City Services</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage e-services and configure dynamic services
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
              onClick={() => {
                setIsAddModalOpen(true);
              }}
            >
              <div className="mr-2"><FiPlus size={16} /></div>
              Add New Service
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
          {/* Left: Services List */}
          <Card className="lg:col-span-1 overflow-visible">
            <CardHeader>
              <CardTitle className="text-heading-700 text-lg flex items-center gap-2">
                <FiSettings size={20} />
                Services List
              </CardTitle>
              
              {/* Search */}
              <div className="relative mt-4">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FiSearch size={18} />
                </div>
                <Input
                  placeholder="Search services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-col gap-2 mt-3">
                {/* Category Filter */}
                {categories.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={categoryFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setCategoryFilter('all')}
                        className={categoryFilter === 'all' ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                      >
                        All
                      </Button>
                      {categories.map((category) => (
                        <Button
                          key={category}
                          size="sm"
                          variant={categoryFilter === category ? 'default' : 'outline'}
                          onClick={() => setCategoryFilter(category)}
                          className={categoryFilter === category ? 'bg-primary-600 hover:bg-primary-700' : 'text-primary-600 hover:bg-primary-50'}
                        >
                          {category}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

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
                <span>Total: {total} services</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex flex-col">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading services...
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-visible pr-4">
                  {services.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No services found.
                    </div>
                  ) : (
                    services.map((service) => (
                      <div key={service.id} className="relative">
                        <Card
                          className={cn(
                            'cursor-pointer transition-all hover:shadow-md',
                            selectedService?.id === service.id
                              ? 'border-primary-600 bg-primary-50'
                              : 'hover:border-primary-300'
                          )}
                          onClick={() => setSelectedService(service)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-heading-700">{service.name}</h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {service.description || 'No description'}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {service.category && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                      {service.category}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500 font-mono">
                                    {service.code}
                                  </span>
                                  {getStatusBadge(service.isActive)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Pointing Arrow - Only on large screens */}
                        {selectedService?.id === service.id && (
                          <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden lg:block z-20">
                            <div className="w-0 h-0 border-t-[15px] border-t-transparent border-b-[15px] border-b-transparent border-l-[15px] border-l-primary-600"></div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {/* Pagination */}
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
            </CardContent>
          </Card>

          {/* Right: Selected Service Information */}
          <Card className="lg:col-span-2">
            <CardContent className="max-h-[700px] overflow-y-auto !p-6">
              {selectedService && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-heading-700">Service Details</h3>
                    <Button
                      size="sm"
                      variant={selectedService.isActive ? 'outline' : 'default'}
                      onClick={handleToggleActive}
                      disabled={isActionLoading}
                      className={selectedService.isActive ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' : 'bg-green-600 hover:bg-green-700'}
                    >
                      {selectedService.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                  <ServiceTabs 
                    selectedService={selectedService}
                    onEdit={() => setIsEditModalOpen(true)}
                    onDelete={() => setIsDeleteModalOpen(true)}
                  />
                </div>
              )}
              {!selectedService && !isLoading && (
                <div className="text-center py-12 text-gray-500">
                  Select a service to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddServiceModal 
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateService}
        isLoading={isActionLoading}
        defaultOrder={defaultOrder}
      />
      
      <EditServiceModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateService}
        service={selectedService}
        isLoading={isActionLoading}
      />

      <DeleteServiceModal 
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteService}
        serviceName={selectedService?.name || ''}
        isLoading={isActionLoading}
      />
    </DashboardLayout>
  );
};

