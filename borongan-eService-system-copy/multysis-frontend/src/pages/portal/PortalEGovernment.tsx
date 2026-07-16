import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiChevronLeft, FiChevronRight, FiClipboard, FiFileText, FiSearch, FiUser } from 'react-icons/fi';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { CategoryServicesModal } from '@/components/portal/CategoryServicesModal';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useToast } from '@/hooks/use-toast';
import { serviceService, type Service } from '@/services/api/service.service';

const categoryOrder = ['Barangay Certificate', 'Civil Registry', 'Tax', 'Health', 'Business', 'Permit', 'Other'];
const itemsPerPage = 6;

const getCategoryDescription = (category: string) => {
  const descriptions: Record<string, string> = {
    'Barangay Certificate': 'Request official barangay certificates including clearance, indigency, residency, and more.',
    'Civil Registry': 'Birth, marriage, and death certificate services.',
    Tax: 'Community tax certificates and real property tax services.',
    Health: 'Occupational health and medical certificate services.',
    Business: 'Business permits, licensing, and related business services.',
    Permit: 'Permits and licensing for various business activities.',
    Other: 'Other government services.',
  };

  return descriptions[category] || `Services related to ${category}`;
};

export const PortalEGovernment: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryServices, setCategoryServices] = useState<Service[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    serviceService
      .getActiveServices({ displayInSubscriberTabs: true }, controller.signal)
      .then(setServices)
      .catch((error) => {
        if (error.name === 'CanceledError') return;
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to fetch services' });
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [toast]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const refreshServices = () => {
      serviceService.getActiveServices({ displayInSubscriberTabs: true }).then(setServices).catch(console.error);
    };

    socket.on('service:new', refreshServices);
    socket.on('service:update', refreshServices);
    socket.on('service:delete', refreshServices);

    return () => {
      socket.off('service:new', refreshServices);
      socket.off('service:update', refreshServices);
      socket.off('service:delete', refreshServices);
    };
  }, [socket, isConnected]);

  const displayItems = useMemo(() => {
    const searchLower = searchQuery.trim().toLowerCase();
    const groups = new Map<string, Service[]>();

    services.forEach((service) => {
      if (
        searchLower &&
        !service.name.toLowerCase().includes(searchLower) &&
        !service.description?.toLowerCase().includes(searchLower) &&
        !service.category?.toLowerCase().includes(searchLower)
      ) {
        return;
      }

      const category = service.category || 'Other';
      groups.set(category, [...(groups.get(category) || []), service]);
    });

    return Array.from(groups.entries())
      .map(([category, categoryServiceList]) => ({
        category,
        services: categoryServiceList.sort((a, b) => a.order - b.order),
      }))
      .sort((a, b) => {
        const aIndex = categoryOrder.indexOf(a.category);
        const bIndex = categoryOrder.indexOf(b.category);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.category.localeCompare(b.category);
      });
  }, [services, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(displayItems.length / itemsPerPage));
  const currentItems = displayItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openCategoryModal = (category: string, categoryServiceList: Service[]) => {
    setSelectedCategory(category);
    setCategoryServices(categoryServiceList);
    setIsCategoryModalOpen(true);
  };

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-heading-700 mb-4">E-Government Services</h1>
              <p className="text-lg text-heading-600">Access government services and submit requests online.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button variant="outline" className="text-primary-600 border-primary-600 hover:bg-primary-50 whitespace-nowrap" onClick={() => navigate('/portal/track')}>
                <FiClipboard size={15} className="mr-1.5" /> Track Application
              </Button>
              {!user && !isAuthLoading && (
                <Button variant="outline" className="text-gray-600 border-gray-300 hover:bg-gray-50 whitespace-nowrap" onClick={() => navigate('/portal/apply-as-guest')}>
                  <FiUser size={15} className="mr-1.5" /> Apply as Guest
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-heading-400" size={20} />
            <Input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12"><p className="text-heading-600">Loading services...</p></div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-12"><p className="text-heading-600">No services found.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentItems.map((item) => (
              <Card key={item.category} className="hover:shadow-lg transition-shadow flex flex-col h-full border-primary-200 cursor-pointer" onClick={() => openCategoryModal(item.category, item.services)}>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <FiFileText size={20} className="text-primary-600" />
                    <Badge className="bg-primary-100 text-primary-700 border-primary-200">{item.category}</Badge>
                  </div>
                  <CardTitle className="text-xl text-heading-700">{item.category} Services</CardTitle>
                  <CardDescription className="text-base mt-2">{getCategoryDescription(item.category)}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <p className="text-sm text-heading-500 mb-4">{item.services.length} service{item.services.length !== 1 ? 's' : ''} available</p>
                  <Button variant="outline" className="w-full border-primary-600 text-primary-600 hover:bg-primary-50">
                    View Services <FiArrowRight className="ml-2" size={16} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button variant="outline" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="flex items-center gap-2">
              <FiChevronLeft size={16} /> Previous
            </Button>
            <span className="text-sm text-heading-600">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2">
              Next <FiChevronRight size={16} />
            </Button>
          </div>
        )}

        <CategoryServicesModal
          open={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setSelectedCategory('');
            setCategoryServices([]);
          }}
          category={selectedCategory}
          services={categoryServices}
        />
      </div>
    </PortalLayout>
  );
};
