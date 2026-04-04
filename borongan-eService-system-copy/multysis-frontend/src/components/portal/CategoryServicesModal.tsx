import React, { useMemo, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import type { Service } from '@/services/api/service.service';

import { RequestServiceModal } from './RequestServiceModal';

import { useAuth } from '@/context/AuthContext';
import { useLoginSheet } from '@/context/LoginSheetContext';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiFileText,
  FiLock,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { LuPhilippinePeso } from 'react-icons/lu';

interface CategoryServicesModalProps {
  open: boolean;
  onClose: () => void;
  category: string;
  services: Service[];
}

export const CategoryServicesModal: React.FC<CategoryServicesModalProps> = ({
  open,
  onClose,
  category,
  services,
}) => {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { openLoginSheet } = useLoginSheet();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const lower = searchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.description?.toLowerCase().includes(lower)
    );
  }, [services, searchQuery]);

  const openService = (service: Service) => {
    if (!user) {
      openLoginSheet();
      return;
    }
    setSelectedService(service);
    setIsRequestModalOpen(true);
  };

  const closeRequestModal = () => {
    setIsRequestModalOpen(false);
    setSelectedService(null);
  };

  const handleApplyAsGuest = (service: Service) => {
    onClose();
    navigate(`/portal/apply-as-guest?serviceId=${service.id}`);
  };

  const getCategoryDescription = (cat: string) => {
    const descriptions: Record<string, string> = {
      'Barangay Certificate':
        'Request official barangay certificates including clearance, indigency, residency, and more.',
      'Civil Registry': 'Birth, marriage, and death certificate services.',
      Tax: 'Community tax certificates and real property tax services.',
      Health: 'Occupational health and medical certificate services.',
      Business:
        'Business permits, licensing, and related business services.',
      Permit: 'Permits and licensing for various business activities.',
    };
    return descriptions[cat] || `Services related to ${cat}`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <FiFileText className="text-primary-600" size={20} />
            <Badge className="bg-primary-100 text-primary-700 border-primary-200">
              {category}
            </Badge>
          </div>
          <DialogTitle className="text-xl">{category} Services</DialogTitle>
          <DialogDescription className="text-base">
            {getCategoryDescription(category)} Select a service to request.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-shrink-0">
          <div className="relative">
            <FiSearch
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-heading-400"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 mt-4">
          {filteredServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No services found.
            </div>
          ) : (
            filteredServices
              .sort((a, b) => a.order - b.order)
              .map((service) => (
                <div
                  key={service.id}
                  className={`border rounded-lg p-4 transition-all ${selectedService?.id === service.id
                      ? 'border-primary-600 bg-primary-50'
                      : 'hover:border-primary-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-heading-700">
                          {service.name}
                        </h4>
                        {!service.isActive && (
                          <Badge
                            variant="outline"
                            className="bg-gray-100 text-gray-600"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-heading-600 mb-2">
                        {service.description ||
                          'Government service available for online request'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {service.requiresPayment && (
                          <span className="text-green-600 flex items-center">
                            <LuPhilippinePeso size={14} className="mr-1" />
                            {service.defaultAmount
                              ? `${Number(service.defaultAmount).toFixed(2)}`
                              : 'With payment'}
                          </span>
                        )}
                        {service.requiresAppointment && (
                          <span className="text-blue-600 flex items-center">
                            <FiCalendar size={14} className="mr-1" />
                            Appointment
                          </span>
                        )}
                        {service.requiresPayment === false &&
                          !service.requiresAppointment && (
                            <span className="text-gray-500 flex items-center">
                              <FiClock size={14} className="mr-1" />
                              Free
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {isAuthLoading ? (
                        <Button disabled size="sm" className="bg-gray-300 text-gray-500">
                          Loading...
                        </Button>
                      ) : user ? (
                        <Button
                          size="sm"
                          onClick={() => openService(service)}
                          className="bg-primary-600 hover:bg-primary-700"
                        >
                          Request <FiArrowRight className="ml-1" size={14} />
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openService(service)}
                            className="border-primary-600 text-primary-600 hover:bg-primary-50"
                          >
                            <FiLock size={12} className="mr-1" />
                            Login
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApplyAsGuest(service)}
                            className="text-gray-500 hover:text-gray-700 text-xs h-auto py-1"
                          >
                            <FiUser size={12} className="mr-1" />
                            Apply as Guest
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        <div className="flex-shrink-0 pt-4 border-t mt-4">
          <p className="text-sm text-heading-500 text-center">
            {filteredServices.length} service
            {filteredServices.length !== 1 ? 's' : ''} available in this
            category
          </p>
        </div>

        {/* Request Service Modal */}
        {selectedService && (
          <RequestServiceModal
            open={isRequestModalOpen}
            onClose={closeRequestModal}
            service={selectedService}
            onSuccess={() => { }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

interface OpenCategoryModalProps {
  category: string;
  services: Service[];
  onOpen: (category: string, services: Service[]) => void;
}

export const CategoryCard: React.FC<OpenCategoryModalProps> = ({
  category,
  services,
  onOpen,
}) => {
  const getCategoryDescription = (cat: string) => {
    const descriptions: Record<string, string> = {
      'Barangay Certificate':
        'Request official barangay certificates including clearance, indigency, residency, and more.',
      'Civil Registry': 'Birth, marriage, and death certificate services.',
      Tax: 'Community tax certificates and real property tax services.',
      Health: 'Occupational health and medical certificate services.',
      Business:
        'Business permits, licensing, and related business services.',
      Permit: 'Permits and licensing for various business activities.',
    };
    return descriptions[cat] || `Services related to ${cat}`;
  };

  return (
    <div
      onClick={() => onOpen(category, services)}
      className="cursor-pointer"
    >
      <Badge className="bg-primary-100 text-primary-700 border-primary-200 mb-2">
        {category}
      </Badge>
      <h3 className="text-lg font-semibold text-heading-700 mb-2">{category}</h3>
      <p className="text-sm text-heading-600 mb-4 line-clamp-2">
        {getCategoryDescription(category)}
      </p>
      <p className="text-sm text-heading-500">{services.length} services</p>
    </div>
  );
};