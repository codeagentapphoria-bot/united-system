import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocialAmeliorationData } from '@/hooks/social-amelioration/useSocialAmelioration';
import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';
import { FiBookOpen, FiHeart, FiTrendingUp, FiUserCheck, FiUsers } from 'react-icons/fi';
import Select from 'react-select';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

// Chart configuration using your specific RGB colors
const chartConfig = {
  seniorCitizens: {
    label: "Senior Citizens",
    color: "rgb(82, 114, 170)",
  },
  pwd: {
    label: "PWD",
    color: "rgb(135, 161, 209)",
  },
  students: {
    label: "Students", 
    color: "rgb(142, 238, 215)",
  },
  soloParents: {
    label: "Solo Parents",
    color: "rgb(163, 179, 249)",
  },
};

interface TrendChartDatum {
  month: string;
  period: string;
  seniorCitizens: number;
  pwd: number;
  students: number;
  soloParents: number;
}

// Professional chart component using shadcn/ui
const MonthlyChart: React.FC<{ data: TrendChartDatum[] }> = ({ data }) => {
  return (
    <ChartContainer config={chartConfig} className="h-[400px] w-full">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="month" 
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
        <Bar dataKey="seniorCitizens" stackId="a" fill="var(--color-seniorCitizens)" />
        <Bar dataKey="pwd" stackId="a" fill="var(--color-pwd)" />
        <Bar dataKey="students" stackId="a" fill="var(--color-students)" />
        <Bar dataKey="soloParents" stackId="a" fill="var(--color-soloParents)" />
      </BarChart>
    </ChartContainer>
  );
};

export const DashboardTab: React.FC = () => {
  const {
    dashboardStats,
    monthlyStats: allMonthlyStats,
    trendRange,
    setTrendRange,
    isLoading,
  } = useSocialAmeliorationData();

  const [filterDate, setFilterDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = React.useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = React.useState(new Date().getFullYear());

  // Filter monthly stats based on selected filters
  const filteredMonthlyStats = useMemo(() => {
    if (!allMonthlyStats || allMonthlyStats.length === 0) {
      return [];
    }

    if (trendRange === 'daily') {
      return allMonthlyStats.filter((stat) => stat.period === filterDate);
    }

    if (trendRange === 'monthly') {
      const targetPeriod = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
      return allMonthlyStats.filter((stat) => stat.period === targetPeriod);
    }

    // trendRange === 'yearly'
    return allMonthlyStats.filter((stat) => stat.period === String(filterYear));
  }, [trendRange, filterDate, filterMonth, filterYear, allMonthlyStats]);

  const overviewCards = [
    {
      title: 'Senior Citizens',
      count: dashboardStats.totalSeniorCitizens,
      icon: <FiUserCheck className="h-5 w-5" />,
      iconColor: 'text-blue-600',
      countColor: 'text-blue-700',
    },
    {
      title: 'PWD',
      count: dashboardStats.totalPWD,
      icon: <FiHeart className="h-5 w-5" />,
      iconColor: 'text-green-600',
      countColor: 'text-green-700',
    },
    {
      title: 'Students',
      count: dashboardStats.totalStudents,
      icon: <FiBookOpen className="h-5 w-5" />,
      iconColor: 'text-purple-600',
      countColor: 'text-purple-700',
    },
    {
      title: 'Solo Parents',
      count: dashboardStats.totalSoloParents,
      icon: <FiHeart className="h-5 w-5" />,
      iconColor: 'text-orange-600',
      countColor: 'text-orange-700',
    },
  ];

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: (new Date().getFullYear() - i).toString()
  }));
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      {/* Left Column - Overview Cards (30%) */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiUsers className="h-5 w-5" />
            Beneficiary Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[80px] rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {overviewCards.map((card, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-5 hover:border-primary-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-lg bg-gray-50 ${card.iconColor}`}>
                        {card.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{card.title}</h3>
                        <p className={`text-2xl font-bold ${card.countColor} mt-1`}>{card.count.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Column - Vertical Statistics Chart (70%) */}
      <Card className="lg:col-span-7">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FiTrendingUp className="h-5 w-5" />
            Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filter Statistics</h3>
              <div className="flex gap-2">
                <Button
                  variant={trendRange === 'daily' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendRange('daily')}
                  className={cn(
                    trendRange === 'daily'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300'
                  )}
                >
                  Daily
                </Button>
                <Button
                  variant={trendRange === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendRange('monthly')}
                  className={cn(
                    trendRange === 'monthly'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300'
                  )}
                >
                  Monthly
                </Button>
                <Button
                  variant={trendRange === 'yearly' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendRange('yearly')}
                  className={cn(
                    trendRange === 'yearly'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300'
                  )}
                >
                  Yearly
                </Button>
              </div>
            </div>

            {/* Filter Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
              {trendRange === 'daily' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full h-10"
                  />
                </div>
              )}

              {trendRange === 'monthly' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                    <Select
                      value={months.find(month => month.value === filterMonth)}
                      onChange={(selectedOption) => setFilterMonth(selectedOption?.value || 1)}
                      options={months}
                      placeholder="Select Month"
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '40px',
                          borderColor: '#d1d5db',
                          '&:hover': {
                            borderColor: '#9ca3af',
                          },
                        }),
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <Select
                      value={years.find(year => year.value === filterYear)}
                      onChange={(selectedOption) => setFilterYear(selectedOption?.value || new Date().getFullYear())}
                      options={years}
                      placeholder="Select Year"
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '40px',
                          borderColor: '#d1d5db',
                          '&:hover': {
                            borderColor: '#9ca3af',
                          },
                        }),
                      }}
                    />
                  </div>
                </>
              )}

              {trendRange === 'yearly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                  <Select
                    value={years.find(year => year.value === filterYear)}
                    onChange={(selectedOption) => setFilterYear(selectedOption?.value || new Date().getFullYear())}
                    options={years}
                    placeholder="Select Year"
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '40px',
                        borderColor: '#d1d5db',
                        '&:hover': {
                          borderColor: '#9ca3af',
                        },
                      }),
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-[400px] w-full rounded-xl" />
          ) : (
            <MonthlyChart data={filteredMonthlyStats} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
