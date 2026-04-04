// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { useParams, useSearchParams } from 'react-router-dom';

// UI Components (shadcn/ui)
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Custom Components
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ServiceApplicationsTab } from '@/components/services/ServiceApplicationsTab';
import { ServiceDashboardTab } from '@/components/services/ServiceDashboardTab';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Services
import { serviceService, type Service } from '@/services/api/service.service';

// Utils
import { cn } from '@/lib/utils';
import { convertKebabToServiceCode, getServiceDisplayName } from '@/utils/service-utils';

// Icons
import { FiBarChart2, FiFileText } from 'react-icons/fi';

export const ServicePage: React.FC = () => {
  const { serviceCode: kebabServiceCode } = useParams<{ serviceCode: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const current = searchParams.get('tab');
    if (current !== activeTab) {
      setSearchParams({ tab: activeTab });
    }
  }, [activeTab, searchParams, setSearchParams]);

  useEffect(() => {
    const fetchService = async () => {
      if (!kebabServiceCode) {
        setError('Service code is required');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const serviceCode = convertKebabToServiceCode(kebabServiceCode);
        const fetchedService = await serviceService.getServiceByCode(serviceCode);
        setService(fetchedService);
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch service';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchService();
  }, [kebabServiceCode, toast]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-heading-600">Loading service...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !service) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-600 text-lg font-semibold mb-2">Error</p>
            <p className="text-heading-600">{error || 'Service not found'}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={cn('space-y-4')}>
        {/* Header */}
        <div className={cn('flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4')}>
          <div>
            <h2 className={cn('text-2xl font-semibold text-heading-700')}>{getServiceDisplayName(service)}</h2>
            <p className={cn('text-sm text-gray-500 mt-1')}>
              {service.description || 'Manage service applications and view statistics'}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className={cn('p-0')}>
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)} className={cn('w-full')}>
              <div className={cn('border-b border-gray-200')}>
                <TabsList className={cn('h-auto bg-transparent p-0 w-full justify-start')}>
                  <TabsTrigger
                    value="dashboard"
                    className={cn(
                      'flex items-center gap-2 px-6 py-4 rounded-none data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary-600'
                    )}
                  >
                    <FiBarChart2 size={18} />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger
                    value="applications"
                    className={cn(
                      'flex items-center gap-2 px-6 py-4 rounded-none data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary-600'
                    )}
                  >
                    <FiFileText size={18} />
                    Applications
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Contents */}
              <div className={cn('p-6')}>
                <TabsContent value="dashboard" className={cn('mt-0')}>
                  <ServiceDashboardTab serviceCode={service.code} service={service} />
                </TabsContent>

                <TabsContent value="applications" className={cn('mt-0')}>
                  <ServiceApplicationsTab serviceCode={service.code} service={service} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

