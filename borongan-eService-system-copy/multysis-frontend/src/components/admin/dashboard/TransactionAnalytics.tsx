// React imports
import React, { useMemo } from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Hooks
import { useDashboardStatistics } from '@/hooks/admin/useDashboardStatistics';

// Utils
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

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

// Format status for display
const formatStatus = (status: string): string => {
  if (!status) return 'Pending';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const TransactionAnalytics: React.FC = () => {
  const { statistics, isLoading } = useDashboardStatistics();

  // Prepare transaction trends chart data
  const transactionTrendsData = useMemo(() => {
    if (!statistics?.transactionTrends) return [];

    return statistics.transactionTrends.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      count: item.count,
      revenue: item.revenue,
    }));
  }, [statistics]);

  // Prepare transaction status pie chart data
  const transactionStatusData = useMemo(() => {
    if (!statistics?.transactionsByStatus) return [];

    const colors = [
      'rgb(59, 130, 246)',   // Blue
      'rgb(34, 197, 94)',    // Green
      'rgb(239, 68, 68)',    // Red
      'rgb(245, 158, 11)',   // Yellow
      'rgb(139, 92, 246)',   // Purple
      'rgb(236, 72, 153)',   // Pink
    ];

    return Object.entries(statistics.transactionsByStatus)
      .map(([status, count], index) => ({
        name: formatStatus(status),
        value: count,
        color: colors[index % colors.length],
      }))
      .filter(item => item.value > 0);
  }, [statistics]);

  // Prepare payment status pie chart data
  const paymentStatusData = useMemo(() => {
    if (!statistics?.transactionsByPaymentStatus) return [];

    const colors = [
      'rgb(59, 130, 246)',   // Blue
      'rgb(34, 197, 94)',    // Green
      'rgb(239, 68, 68)',    // Red
      'rgb(245, 158, 11)',   // Yellow
      'rgb(139, 92, 246)',   // Purple
    ];

    return Object.entries(statistics.transactionsByPaymentStatus)
      .map(([status, count], index) => ({
        name: formatStatus(status),
        value: count,
        color: colors[index % colors.length],
      }))
      .filter(item => item.value > 0);
  }, [statistics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Analytics</CardTitle>
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
          <CardTitle>Transaction Volume & Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionTrendsData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <BarChart data={transactionTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
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
                <Bar dataKey="count" fill="var(--color-count)" name="Transactions" />
                <Bar dataKey="revenue" fill="var(--color-revenue)" name="Revenue (₱)" />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-gray-500">No transaction data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionStatusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <PieChart>
                  <Pie
                    data={transactionStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {transactionStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-gray-500">No status data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentStatusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <PieChart>
                  <Pie
                    data={paymentStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <p className="text-gray-500">No payment status data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

