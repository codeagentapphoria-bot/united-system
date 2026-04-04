import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface ReportChartsProps {
  data: any[];
  aggregatedStats: any;
  type: 'overview' | 'status';
}

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
];

const chartConfig = {
  count: {
    label: 'Transactions',
    color: '#3b82f6',
  },
  revenue: {
    label: 'Revenue',
    color: '#10b981',
  },
};

export const ReportCharts: React.FC<ReportChartsProps> = ({ data, aggregatedStats, type }) => {
  // Format status for display
  const formatStatus = (status: string): string => {
    if (!status) return 'Pending';
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Prepare trend data (aggregated by date across all services)
  const trendData = useMemo(() => {
    const dateMap = new Map<string, { date: string; count: number; revenue: number }>();
    
    data.forEach(report => {
      report.byDate.forEach((item: any) => {
        const existing = dateMap.get(item.date);
        if (existing) {
          existing.count += item.count;
          existing.revenue += item.revenue;
        } else {
          dateMap.set(item.date, { ...item });
        }
      });
    });

    return Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        formattedDate: new Date(item.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      }));
  }, [data]);

  // Prepare status data for pie chart
  const statusPieData = useMemo(() => {
    const total = Object.values(aggregatedStats.byStatus).reduce((sum: number, val: any) => sum + val, 0);
    return Object.entries(aggregatedStats.byStatus)
      .filter(([, value]) => (value as number) > 0)
      .map(([name, value], index) => ({
        name: formatStatus(name),
        value,
        percentage: total > 0 ? (((value as number) / total) * 100).toFixed(1) : '0',
        color: COLORS[index % COLORS.length],
      }));
  }, [aggregatedStats]);

  // Prepare payment status data for pie chart
  const paymentStatusPieData = useMemo(() => {
    const total = Object.values(aggregatedStats.byPaymentStatus).reduce((sum: number, val: any) => sum + val, 0);
    return Object.entries(aggregatedStats.byPaymentStatus)
      .filter(([, value]) => (value as number) > 0)
      .map(([name, value], index) => ({
        name: formatStatus(name),
        value,
        percentage: total > 0 ? (((value as number) / total) * 100).toFixed(1) : '0',
        color: COLORS[(index + 2) % COLORS.length],
      }));
  }, [aggregatedStats]);

  // Custom label function for pie charts
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
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
        fontWeight="bold"
      >
        {value.toLocaleString()}
      </text>
    );
  };

  if (type === 'overview') {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Transaction & Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {trendData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="formattedDate" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-count)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Transactions"
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Revenue (₱)"
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No trend data available for the selected period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Application Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {statusPieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => [
                      `${value.toLocaleString()} (${props.payload.percentage}%)`,
                      name
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No status data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Payment Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            {paymentStatusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStatusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {paymentStatusPieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => [
                      `${value.toLocaleString()} (${props.payload.percentage}%)`,
                      name
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No payment data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

