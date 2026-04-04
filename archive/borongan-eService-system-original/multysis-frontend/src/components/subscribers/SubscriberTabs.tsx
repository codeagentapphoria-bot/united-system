// React imports
import React, { useEffect, useState } from 'react';

// Hooks
import { useSocket } from '@/context/SocketContext';

// UI Components (shadcn/ui)
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Custom Components
import { DynamicServiceDetailsModal } from '@/components/modals/subscribers/DynamicServiceDetailsModal';
import { DynamicServiceTab } from '@/components/subscribers/tabs/DynamicServiceTab';
import { ProfileTab } from '@/components/subscribers/tabs/ProfileTab';

// Types
import type { Service } from '@/services/api/service.service';
import type { Transaction } from '@/types/subscriber';
import type {
  NewServicePayload,
  ServiceUpdatePayload,
  ServiceDeletePayload,
} from '@/types/socket.types';

// Utils
import { cn } from '@/lib/utils';
import { clearSubscriberTabCache, getSubscriberTabServices, normalizeServiceCode } from '@/utils/dynamic-subscriber-tabs';

interface SubscriberTabsProps {
  selectedSubscriber: any;
  onImageClick: () => void;
}

export const SubscriberTabs: React.FC<SubscriberTabsProps> = ({
  selectedSubscriber,
  onImageClick,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('profile');
  const { socket, isConnected } = useSocket();

  const fetchServices = async () => {
    setIsLoadingServices(true);
    try {
      const tabServices = await getSubscriberTabServices();
      setServices(tabServices);
    } catch (error) {
      console.error('Failed to fetch subscriber tab services:', error);
      setServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Listen for socket service events
  useEffect(() => {
    if (!socket || !isConnected) {
      return;
    }

    const handleServiceNew = (_data: NewServicePayload) => {
      clearSubscriberTabCache();
      fetchServices();
    };

    const handleServiceUpdate = (_data: ServiceUpdatePayload) => {
      clearSubscriberTabCache();
      fetchServices();
    };

    const handleServiceDelete = (_data: ServiceDeletePayload) => {
      clearSubscriberTabCache();
      fetchServices();
    };

    socket.on('service:new', handleServiceNew);
    socket.on('service:update', handleServiceUpdate);
    socket.on('service:delete', handleServiceDelete);

    return () => {
      socket.off('service:new', handleServiceNew);
      socket.off('service:update', handleServiceUpdate);
      socket.off('service:delete', handleServiceDelete);
    };
  }, [socket, isConnected]);

  const handleViewDetails = (transaction: Transaction) => {
    // Find the service for this transaction
    const service = services.find((s) => s.id === transaction.serviceId);
    setSelectedTransaction(transaction);
    setSelectedService(service || null);
    setIsDetailsModalOpen(true);
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("w-full")}>
        <div className={cn("overflow-x-auto mb-4")}>
          <TabsList 
            className={cn(
              "inline-flex w-max min-w-full"
            )}
          >
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {isLoadingServices ? (
              <TabsTrigger value="loading" disabled>
                Loading...
              </TabsTrigger>
            ) : (
              services.map((service) => (
                <TabsTrigger key={service.id} value={normalizeServiceCode(service.code)}>
                  {service.name}
                </TabsTrigger>
              ))
            )}
          </TabsList>
        </div>

        {/* Profile Tab */}
        <ProfileTab 
          selectedSubscriber={selectedSubscriber}
          onImageClick={onImageClick}
        />

        {/* Dynamic Service Tabs */}
        {services.map((service) => {
          const tabValue = normalizeServiceCode(service.code);
          return (
            <DynamicServiceTab
              key={service.id}
              service={service}
              subscriberId={selectedSubscriber?.id || ''}
              onViewDetails={handleViewDetails}
              isActive={activeTab === tabValue}
            />
          );
        })}
      </Tabs>

      {/* Dynamic Service Details Modal */}
      <DynamicServiceDetailsModal
        open={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedTransaction(null);
          setSelectedService(null);
        }}
        transaction={selectedTransaction || undefined}
        service={selectedService || undefined}
      />
    </>
  );
};
