// React imports
import React, { useMemo } from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Hooks
import { useDashboardStatistics } from '@/hooks/admin/useDashboardStatistics';

// Utils
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

const chartConfig = {
  count: {
    label: 'Transactions',
    color: 'rgb(59, 130, 246)',
  },
  revenue: {
    label: 'Revenue',
    color: 'rgb(34, 197, 94)',
  },
};

export const ServicePerformance: React.FC = () => {
  const { statistics, isLoading } = useDashboardStatistics();

  // Get top 10 services by volume
  const topServicesByVolume = useMemo(() => {
    if (!statistics?.transactionsByService) return [];
    return statistics.transactionsByService
      .slice(0, 10)
      .map(service => ({
        name: service.serviceName.length > 20 
          ? service.serviceName.substring(0, 20) + '...' 
          : service.serviceName,
        fullName: service.serviceName,
        code: service.serviceCode,
        count: service.count,
        revenue: service.revenue,
      }));
  }, [statistics]);

  // Get top 10 services by revenue
  const topServicesByRevenue = useMemo(() => {
    if (!statistics?.transactionsByService) return [];
    return [...statistics.transactionsByService]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(service => ({
        name: service.serviceName.length > 20 
          ? service.serviceName.substring(0, 20) + '...' 
          : service.serviceName,
        fullName: service.serviceName,
        code: service.serviceCode,
        count: service.count,
        revenue: service.revenue,
      }));
  }, [statistics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-gray-500">Loading chart data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Top Services by Transaction Volume</CardTitle>
        </CardHeader>
        <CardContent>
          {topServicesByVolume.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart 
                data={topServicesByVolume} 
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={150}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [value.toLocaleString(), 'Transactions']}
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]}>
                  {topServicesByVolume.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill="rgb(59, 130, 246)" />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-gray-500">No service data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Services by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {topServicesByRevenue.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart 
                data={topServicesByRevenue} 
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={150}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [
                    `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    'Revenue'
                  ]}
                />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]}>
                  {topServicesByRevenue.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill="rgb(34, 197, 94)" />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-gray-500">No revenue data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Overview Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {statistics?.transactionsByService && statistics.transactionsByService.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Service</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Transactions</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {statistics.transactionsByService.slice(0, 10).map((service) => (
                    <tr key={service.serviceCode} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{service.serviceName}</p>
                          <p className="text-xs text-gray-500">{service.serviceCode}</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-gray-900">
                        {service.count.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-4 text-sm text-gray-900">
                        ₱{service.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No service data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

