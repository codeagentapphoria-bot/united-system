// React imports
import React, { useMemo } from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Hooks
import { useDashboardStatistics } from '@/hooks/admin/useDashboardStatistics';

// Utils
import { Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';

const chartConfig = {
  residents: {
    label: 'Residents',
    color: 'rgb(59, 130, 246)',
  },
  pendingResidents: {
    label: 'Pending Residents',
    color: 'rgb(34, 197, 94)',
  },
};

export const SubscriberAnalytics: React.FC = () => {
  const { statistics, isLoading } = useDashboardStatistics();

  // Prepare subscriber growth trends chart data
  const subscriberGrowthData = useMemo(() => {
    if (!statistics?.subscriberGrowthTrends) return [];

    return statistics.subscriberGrowthTrends.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      residents: item.active,
      nonResidents: item.pending,
    }));
  }, [statistics]);

  // Prepare citizen status distribution pie chart data
  const citizenStatusData = useMemo(() => {
    if (!statistics?.citizensByStatus) return [];

    const colors = [
      'rgb(59, 130, 246)',   // Blue - PENDING
      'rgb(34, 197, 94)',    // Green - ACTIVE
      'rgb(239, 68, 68)',    // Red - REJECTED
      'rgb(245, 158, 11)',   // Yellow - INACTIVE
    ];

    return Object.entries(statistics.citizensByStatus)
      .map(([status, count], index) => ({
        name: status.charAt(0) + status.slice(1).toLowerCase(),
        value: count,
        color: colors[index % colors.length],
      }))
      .filter(item => item.value > 0);
  }, [statistics]);

  // Prepare resident distribution pie chart data
  const subscriberTypeData = useMemo(() => {
    if (!statistics) return [];

    const total = statistics.totalResidents ?? statistics.totalSubscribers ?? 0;
    if (!total) return [];

    return [
      {
        name: 'Residents',
        value: total,
        color: 'rgb(59, 130, 246)',
      },
    ];
  }, [statistics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscriber Analytics</CardTitle>
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
          <CardTitle>Subscriber Growth Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriberGrowthData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <LineChart data={subscriberGrowthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="residents" 
                  stroke="var(--color-residents)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Residents"
                />
                <Line 
                  type="monotone" 
                  dataKey="nonResidents" 
                  stroke="var(--color-nonCitizens)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Non-Residents"
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-gray-500">No growth data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Citizen Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {citizenStatusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <PieChart>
                  <Pie
                    data={citizenStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {citizenStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-gray-500">No citizen status data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscriber Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {subscriberTypeData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <PieChart>
                  <Pie
                    data={subscriberTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subscriberTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-gray-500">No subscriber type data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

