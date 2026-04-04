// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Custom Components
import { PortalLayout } from '@/components/layout/PortalLayout';
import { LoginPrompt } from '@/components/portal/LoginPrompt';
import { RequestServiceModal } from '@/components/portal/RequestServiceModal';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useLoginSheet } from '@/context/LoginSheetContext';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/hooks/use-toast';

// Services
import { serviceService, type Service } from '@/services/api/service.service';

// Utils
import { FiArrowRight, FiCalendar, FiChevronLeft, FiChevronRight, FiLock, FiSearch } from 'react-icons/fi';

export const PortalEGovernment: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { openLoginSheet } = useLoginSheet();
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        const result = await serviceService.getActiveServices({
          displayInSubscriberTabs: true,
        });
        setServices(result);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to fetch services',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchServices();
  }, [toast]);

  // Listen for service:update events to update service status in real-time
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleServiceUpdate = (data: { serviceId: string; isActive?: boolean; name?: string; description?: string; code?: string; category?: string; updatedAt: string }) => {
      setServices((prev) => {
        const index = prev.findIndex((s) => s.id === data.serviceId);
        if (index === -1) {
          // Service not in list, refresh to get it if it became active
          if (data.isActive === true) {
            const fetchServices = async () => {
              try {
                const result = await serviceService.getActiveServices({
                  displayInSubscriberTabs: true,
                });
                setServices(result);
              } catch (error) {
                console.error('Failed to refresh services:', error);
              }
            };
            fetchServices();
          }
          return prev;
        }

        // Update the service
        const updated = [...prev];
        if (data.isActive !== undefined) {
          if (data.isActive === false) {
            // Remove inactive service from list
            return prev.filter((s) => s.id !== data.serviceId);
          }
          updated[index] = { ...updated[index], isActive: data.isActive };
        }
        if (data.name !== undefined) {
          updated[index] = { ...updated[index], name: data.name };
        }
        if (data.description !== undefined) {
          updated[index] = { ...updated[index], description: data.description };
        }
        if (data.code !== undefined) {
          updated[index] = { ...updated[index], code: data.code };
        }
        if (data.category !== undefined) {
          updated[index] = { ...updated[index], category: data.category };
        }

        // Update selected service if it's the one being updated
        if (selectedService?.id === data.serviceId) {
          setSelectedService(updated[index]);
        }

        return updated;
      });

      if (data.isActive !== undefined) {
        toast({
          title: 'Service Status Updated',
          description: data.isActive 
            ? 'Service is now available.' 
            : 'Service is no longer available.',
        });
      }
    };

    socket.on('service:update', handleServiceUpdate);

    return () => {
      socket.off('service:update', handleServiceUpdate);
    };
  }, [socket, isConnected, selectedService, toast]);

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentServices = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-heading-700 mb-4">E-Government Services</h1>
          <p className="text-lg text-heading-600">
            Access government services and submit requests online. Login to request services and track your applications.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400" size={20} />
            <Input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Services Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-heading-600">Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-heading-600">No services found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentServices.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                <CardHeader>
                  <div className="flex items-start justify-end mb-4">
                    <div className="flex items-center gap-2">
                      {service.requiresAppointment && (
                        <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white border-blue-700">
                          <FiCalendar size={12} className="mr-1" />
                          Appointment
                        </Badge>
                      )}
                      {!isAuthLoading && !user && (
                        <div className="flex items-center space-x-1 text-orange-600">
                          <FiLock size={16} />
                          <span className="text-xs font-medium">Login Required</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-xl text-heading-700">{service.name}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {service.description || 'Government service available for online request'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="space-y-3">
                    {service.category && (
                      <div className="text-sm">
                        <span className="text-heading-500">Category: </span>
                        <span className="text-heading-700 font-medium">{service.category}</span>
                      </div>
                    )}
                    {service.requiresPayment && (
                      <div className="text-sm">
                        <span className="text-heading-500">Payment Required</span>
                        {service.defaultAmount && !isNaN(Number(service.defaultAmount)) && (
                          <span className="text-heading-700 font-medium ml-2">
                            - ₱{Number(service.defaultAmount).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                    {service.requiresAppointment && (
                      <div className="text-sm text-blue-600 flex items-center">
                        <FiCalendar size={14} className="mr-1" />
                        <span className="font-medium">Appointment Required</span>
                      </div>
                    )}
                    {isAuthLoading ? (
                      <Button
                        disabled
                        className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                      >
                        Loading...
                      </Button>
                    ) : user ? (
                      <Button
                        onClick={() => {
                          setSelectedService(service);
                          setIsModalOpen(true);
                        }}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                      >
                        Request Service
                        <FiArrowRight className="ml-2" size={16} />
                      </Button>
                    ) : (
                      <Button
                        onClick={openLoginSheet}
                        variant="outline"
                        className="w-full border-primary-600 text-primary-600 hover:bg-primary-50"
                      >
                        Login to Request
                        <FiLock className="ml-2" size={16} />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="flex items-center gap-2"
            >
              <FiChevronLeft size={16} />
              Previous
            </Button>
            <span className="text-sm text-heading-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2"
            >
              Next
              <FiChevronRight size={16} />
            </Button>
          </div>
        )}

        {/* Login Prompt Section */}
        {!isAuthLoading && !user && (
          <div className="mt-16">
            <LoginPrompt
              title="Login to Request Services"
              description="Create an account or log in to request government services and track your applications:"
              features={[
                'Submit service requests online',
                'Track application status',
                'Make secure payments',
                'View transaction history',
                'Receive notifications',
              ]}
            />
          </div>
        )}

        {/* Request Service Modal */}
        {selectedService && (
          <RequestServiceModal
            open={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedService(null);
            }}
            service={selectedService}
            onSuccess={() => {
              // Optionally refresh services or show success message
            }}
          />
        )}
      </div>
    </PortalLayout>
  );
};

