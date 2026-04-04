// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Custom Components
import { PortalLayout } from '@/components/layout/PortalLayout';
import { LoginPrompt } from '@/components/portal/LoginPrompt';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Services
import { eServiceService, type EService } from '@/services/api/eservice.service';

// Utils
import { FiChevronLeft, FiChevronRight, FiSearch } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Input } from '@/components/ui/input';

const formatFee = (requiresPayment: boolean, defaultAmount?: number | string): string => {
  if (!requiresPayment) return 'Free';
  if (!defaultAmount || defaultAmount === 0) return 'Varies';
  const amount = typeof defaultAmount === 'string' ? parseFloat(defaultAmount) : Number(defaultAmount);
  if (isNaN(amount) || amount === 0) return 'Varies';
  return `₱${amount.toFixed(2)}`;
};

export const PortalEServices: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [services, setServices] = useState<EService[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchEServices = async () => {
      try {
        setIsLoadingData(true);
        const result = await eServiceService.getAllEServices();
        setServices(result);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to fetch services',
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchEServices();
  }, [toast]);

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentServices = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (!user) {
    return (
      <PortalLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-heading-700 mb-4">E-Services</h1>
            <p className="text-lg text-heading-600">
              Access additional services and utilities. Login to explore available services.
            </p>
          </div>
          <LoginPrompt
            title="Login to Access E-Services"
            description="Log in to access additional services and utilities:"
            features={[
              'Access utility services',
              'Manage service subscriptions',
              'View service usage',
              'Configure service settings',
              'Get service support',
            ]}
          />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-heading-700 mb-4">E-Services</h1>
          <p className="text-lg text-heading-600">
            Access city services and utilities online. Browse available services below.
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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Services Grid */}
        {isLoadingData ? (
          <div className="text-center py-12">
            <p className="text-heading-600">Loading services...</p>
          </div>
        ) : currentServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-heading-600">No services found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentServices.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                <CardHeader>
                  <CardTitle className="text-xl text-heading-700">{service.name}</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {service.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <div className="text-sm">
                    <span className="text-heading-500">Department: </span>
                    <span className="text-heading-700 font-medium">{service.category || 'N/A'}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-heading-500">Fee: </span>
                    <span className="text-heading-700 font-medium">                    {formatFee(service.requiresPayment, service.defaultAmount)}</span>
                  </div>
                  <Button
                    disabled
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white cursor-not-allowed"
                  >
                    Currently Unavailable
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
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
      </div>
    </PortalLayout>
  );
};

