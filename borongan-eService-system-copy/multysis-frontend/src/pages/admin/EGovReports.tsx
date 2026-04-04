// React imports
import React, { useEffect, useState, useMemo } from 'react';

// UI Components (shadcn/ui)
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Services
import { adminMenuItems } from '@/config/admin-menu';
import { serviceService, type Service } from '@/services/api/service.service';
import { transactionService, type ServiceStatistics } from '@/services/api/transaction.service';

// Utils
import { cn } from '@/lib/utils';
import { FiBarChart2, FiFileText, FiFilter, FiSearch, FiTrendingUp } from 'react-icons/fi';
import { LuPhilippinePeso } from 'react-icons/lu';
import { useToast } from '@/hooks/use-toast';

// Modular Components
import { ReportCharts } from '@/components/admin/reports/ReportCharts';
import { ReportServiceTable } from '@/components/admin/reports/ReportServiceTable';

interface ServiceReportData extends ServiceStatistics {
  service: Service;
}

export const EGovReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [services, setServices] = useState<Service[]>([]);
  const [serviceReports, setServiceReports] = useState<ServiceReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  // Fetch all active e-government services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true);
        const activeServices = await serviceService.getActiveServices({
          displayInSidebar: true,
        });
        setServices(activeServices);
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

  // Unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [services]);

  // Fetch statistics for all services
  useEffect(() => {
    const fetchServiceStatistics = async () => {
      if (services.length === 0) return;

      try {
        setIsLoading(true);
        const statisticsPromises = services.map(async (service) => {
          try {
            const stats = await transactionService.getServiceStatistics(
              service.code,
              startDate || undefined,
              endDate || undefined
            );
            return {
              ...stats,
              service,
            };
          } catch (error) {
            return {
              total: 0,
              pending: 0,
              approved: 0,
              rejected: 0,
              cancelled: 0,
              byPaymentStatus: {},
              totalRevenue: 0,
              byDate: [],
              service,
            };
          }
        });

        const results = await Promise.all(statisticsPromises);
        setServiceReports(results);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to fetch statistics',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchServiceStatistics();
  }, [services, startDate, endDate, toast]);

  // Aggregate statistics
  const aggregatedStats = useMemo(() => {
    const initialStats = {
      totalTransactions: 0,
      totalRevenue: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      byPaymentStatus: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    if (serviceReports.length === 0) return initialStats;

    const stats = serviceReports.reduce((acc, report) => {
      acc.totalTransactions += report.total;
      acc.totalRevenue += report.totalRevenue;
      acc.pending += report.pending;
      acc.approved += report.approved;
      acc.rejected += report.rejected;
      acc.cancelled += report.cancelled;

      Object.entries(report.byPaymentStatus).forEach(([status, count]) => {
        acc.byPaymentStatus[status] = (acc.byPaymentStatus[status] || 0) + count;
      });

      return acc;
    }, initialStats);

    stats.byStatus = {
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected,
      cancelled: stats.cancelled,
    };

    return stats;
  }, [serviceReports]);

  // Filtered reports for the table
  const filteredServiceReports = useMemo(() => {
    return serviceReports.filter((report) => {
      const matchesSearch = 
        report.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.service.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        categoryFilter === 'all' || report.service.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [serviceReports, searchQuery, categoryFilter]);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCategoryFilter('all');
  };

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className={cn('space-y-6')}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-heading-700">E-Government Reports</h2>
            <p className="text-sm text-gray-500 mt-1">
              Analyze performance and trends across e-government services
            </p>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Search Service
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Name or Code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 border-gray-200 focus:ring-primary-500"
                  />
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Category
                </label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Date Range
                </label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 text-xs border-gray-200 flex-1"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 text-xs border-gray-200 flex-1"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="w-full h-10 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-700"
                >
                  <FiFilter className="mr-2" size={14} />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aggregate Totals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm bg-blue-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Transactions</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">
                    {aggregatedStats.totalTransactions.toLocaleString()}
                  </h3>
                </div>
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                  <FiFileText size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-green-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Revenue</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">
                    ₱{aggregatedStats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </h3>
                </div>
                <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                  <LuPhilippinePeso size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-amber-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">
                    {aggregatedStats.pending.toLocaleString()}
                  </h3>
                </div>
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                  <FiTrendingUp size={24} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-emerald-50/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Approved</p>
                  <h3 className="text-3xl font-bold text-gray-900 mt-1">
                    {aggregatedStats.approved.toLocaleString()}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                  <FiBarChart2 size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-gray-200 w-full justify-start rounded-none h-12 p-0 gap-8">
            <TabsTrigger
              value="overview"
              className="px-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:text-primary-600 rounded-none h-full font-semibold text-gray-500 shadow-none transition-none"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="px-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:text-primary-600 rounded-none h-full font-semibold text-gray-500 shadow-none transition-none"
            >
              Service Breakdown
            </TabsTrigger>
            <TabsTrigger
              value="status"
              className="px-1 bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary-600 data-[state=active]:text-primary-600 rounded-none h-full font-semibold text-gray-500 shadow-none transition-none"
            >
              Status Distribution
            </TabsTrigger>
          </TabsList>

          <div className="pt-6">
            <TabsContent value="overview" className="mt-0 space-y-6 outline-none">
              <ReportCharts 
                type="overview" 
                data={serviceReports} 
                aggregatedStats={aggregatedStats} 
              />
            </TabsContent>

            <TabsContent value="services" className="mt-0 outline-none">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium text-heading-700">Detailed Service Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReportServiceTable reports={filteredServiceReports} isLoading={isLoading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status" className="mt-0 outline-none">
              <ReportCharts 
                type="status" 
                data={serviceReports} 
                aggregatedStats={aggregatedStats} 
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
