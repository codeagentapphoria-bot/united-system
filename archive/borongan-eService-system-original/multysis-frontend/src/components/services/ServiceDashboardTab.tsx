// React imports
import React, { useMemo, useState } from 'react';

// UI Components (shadcn/ui)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';

// Custom Components
import { useServiceStatistics } from '@/hooks/services/useServiceStatistics';

// Services
import type { Service } from '@/services/api/service.service';

// Utils
import { cn } from '@/lib/utils';
import Select from 'react-select';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

// Icons
import { FiCheckCircle, FiFileText, FiTrendingUp, FiXCircle } from 'react-icons/fi';
import { LuPhilippinePeso } from "react-icons/lu";

interface ServiceDashboardTabProps {
  serviceCode: string;
  service: Service;
}

const chartConfig = {
  count: {
    label: 'Applications',
    color: 'rgb(59, 130, 246)',
  },
  revenue: {
    label: 'Revenue',
    color: 'rgb(34, 197, 94)',
  },
};

export const ServiceDashboardTab: React.FC<ServiceDashboardTabProps> = ({ serviceCode, service }) => {
  const [filterType, setFilterType] = useState<'all' | 'daily' | 'monthly' | 'yearly'>('all');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Format payment status for display
  const formatPaymentStatus = (status: string): string => {
    if (!status) return 'N/A';
    // Replace underscores with spaces and capitalize each word
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Calculate date range based on filter type
  const { startDate, endDate } = useMemo(() => {
    // If "all" is selected, don't filter by date
    if (filterType === 'all') {
      return {
        startDate: undefined,
        endDate: undefined,
      };
    }

    let start: Date | undefined;
    let end: Date | undefined;

    if (filterType === 'daily') {
      const [year, month, day] = filterDate.split('-').map(Number);
      start = new Date(year, month - 1, day, 0, 0, 0, 0);
      end = new Date(year, month - 1, day, 23, 59, 59, 999);
    } else if (filterType === 'monthly') {
      // First day of the month at 00:00:00
      start = new Date(filterYear, filterMonth - 1, 1, 0, 0, 0, 0);
      // Last day of the month at 23:59:59
      end = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
    } else {
      // First day of the year at 00:00:00
      start = new Date(filterYear, 0, 1, 0, 0, 0, 0);
      // Last day of the year at 23:59:59
      end = new Date(filterYear, 11, 31, 23, 59, 59, 999);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [filterType, filterDate, filterMonth, filterYear]);

  const { statistics, isLoading } = useServiceStatistics({
    serviceCode,
    startDate,
    endDate,
  });

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!statistics?.byDate) return [];

    return statistics.byDate.map((item) => ({
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: filterType === 'daily' ? 'numeric' : undefined,
        year: filterType === 'yearly' ? 'numeric' : undefined,
      }),
      count: item.count,
      revenue: item.revenue,
    }));
  }, [statistics, filterType]);

  // Prepare payment status pie chart data
  const paymentStatusData = useMemo(() => {
    if (!statistics?.byPaymentStatus) return [];

    const colors = [
      'rgb(59, 130, 246)',
      'rgb(34, 197, 94)',
      'rgb(239, 68, 68)',
      'rgb(245, 158, 11)',
      'rgb(139, 92, 246)',
    ];

    return Object.entries(statistics.byPaymentStatus).map(([status, count], index) => ({
      name: formatPaymentStatus(status),
      value: count,
      color: colors[index % colors.length],
    }));
  }, [statistics]);

  const overviewCards: Array<{
    title: string;
    value: number | string;
    icon: React.ReactNode;
    iconColor: string;
    countColor: string;
  }> = [
    {
      title: 'Total Applications',
      value: statistics?.total || 0,
      icon: <FiFileText size={24} />,
      iconColor: 'bg-blue-100 text-blue-600',
      countColor: 'text-heading-800',
    },
    {
      title: 'Pending',
      value: statistics?.pending || 0,
      icon: <FiTrendingUp size={24} />,
      iconColor: 'bg-yellow-100 text-yellow-600',
      countColor: 'text-yellow-700',
    },
    {
      title: 'Approved/ Completed',
      value: statistics?.approved || 0,
      icon: <FiCheckCircle size={24} />,
      iconColor: 'bg-green-100 text-green-600',
      countColor: 'text-green-700',
    },
    {
      title: 'Rejected/ Cancelled',
      value: (statistics?.rejected || 0) + (statistics?.cancelled || 0),
      icon: <FiXCircle size={24} />,
      iconColor: 'bg-red-100 text-red-600',
      countColor: 'text-red-700',
    },
  ];

  if (service.requiresPayment) {
    overviewCards.push({
      title: 'Total Revenue',
      value: `₱${(statistics?.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: <LuPhilippinePeso size={24} />,
      iconColor: 'bg-emerald-100 text-emerald-600',
      countColor: 'text-emerald-700',
    });
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Filter Type</label>
              <Select
                value={{ value: filterType, label: filterType === 'all' ? 'All Time' : filterType.charAt(0).toUpperCase() + filterType.slice(1) }}
                onChange={(option) => setFilterType(option?.value || 'all')}
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ]}
                className="mt-1"
                classNamePrefix="react-select"
              />
            </div>

            {filterType === 'daily' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date</label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {filterType === 'monthly' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Month</label>
                  <Select
                    value={{ value: filterMonth, label: new Date(filterYear, filterMonth - 1).toLocaleDateString('en-US', { month: 'long' }) }}
                    onChange={(option) => setFilterMonth(option?.value || 1)}
                    options={Array.from({ length: 12 }, (_, i) => ({
                      value: i + 1,
                      label: new Date(filterYear, i).toLocaleDateString('en-US', { month: 'long' }),
                    }))}
                    className="mt-1"
                    classNamePrefix="react-select"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Year</label>
                  <Input
                    type="number"
                    value={filterYear}
                    onChange={(e) => setFilterYear(parseInt(e.target.value) || new Date().getFullYear())}
                    className="mt-1"
                    min={2020}
                    max={new Date().getFullYear() + 1}
                  />
                </div>
              </>
            )}

            {filterType === 'yearly' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Year</label>
                <Input
                  type="number"
                  value={filterYear}
                  onChange={(e) => setFilterYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="mt-1"
                  min={2020}
                  max={new Date().getFullYear() + 1}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 wrap">
        {overviewCards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow min-w-fit">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn('p-3 rounded-lg', card.iconColor)}>{card.icon}</div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{card.title}</h3>
                    <p className={cn('text-2xl font-bold mt-1', card.countColor)}>{card.value}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Applications Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-gray-500">Loading chart data...</p>
              </div>
            ) : chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <p className="text-gray-500">No data available for the selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Status Distribution */}
        {service.requiresPayment && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <p className="text-gray-500">Loading chart data...</p>
                </div>
              ) : paymentStatusData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                        // Calculate label position inside the pie segment
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize={12}
                            fontWeight={600}
                            style={{ pointerEvents: 'none' }}
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      outerRadius={120}
                      innerRadius={60}
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
                <div className="flex items-center justify-center h-[400px]">
                  <p className="text-gray-500">No payment data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

