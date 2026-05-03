import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocialAmeliorationData } from '@/hooks/social-amelioration/useSocialAmelioration';
import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';
import { FiBookOpen, FiTrendingUp, FiUserCheck, FiUsers } from 'react-icons/fi';
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
    monthlyStats,
    trendRange,
    setTrendRange,
    isLoading,
  } = useSocialAmeliorationData();

  // null = "Show All" (no filter applied)
  const [filterDate, setFilterDate] = React.useState<string | null>(null);
  const [filterMonth, setFilterMonth] = React.useState<number | null>(null);
  const [filterYear, setFilterYear] = React.useState<number | null>(null);

  // Filter stats based on selected filters — null means "show all"
  const filteredStats = useMemo(() => {
    if (!monthlyStats || monthlyStats.length === 0) return [];

    if (trendRange === 'all') {
      return monthlyStats;
    }

    if (trendRange === 'daily') {
      if (!filterDate) return monthlyStats;
      return monthlyStats.filter((stat) => stat.period === filterDate);
    }

    if (trendRange === 'monthly') {
      if (!filterMonth && !filterYear) return monthlyStats;
      return monthlyStats.filter((stat) => {
        const [statYear] = stat.period.split('-');
        const matchYear = !filterYear || statYear === String(filterYear);
        const matchMonth = !filterMonth || stat.period.endsWith(`-${String(filterMonth).padStart(2, '0')}`);
        return matchYear && matchMonth;
      });
    }

    // yearly
    if (!filterYear) return monthlyStats;
    return monthlyStats.filter((stat) => stat.period === String(filterYear));
  }, [trendRange, filterDate, filterMonth, filterYear, monthlyStats]);

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
      icon: <FiUsers className="h-5 w-5" />,
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
      icon: <FiUsers className="h-5 w-5" />,
      iconColor: 'text-orange-600',
      countColor: 'text-orange-700',
    },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

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

  // Pre-compute available yearly periods from rolling 5-year window
  const availableYearlyPeriods = years.map((year) => ({
    value: year,
    label: String(year),
  }));

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
          {/* View toggle + filters */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Registration Trends</h3>
              <div className="flex gap-2">
                <Button
                  variant={trendRange === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendRange('all')}
                  className={cn(
                    trendRange === 'all'
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300'
                  )}
                >
                  All
                </Button>
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
                  By Date
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
                  By Month
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
                  By Year
                </Button>
              </div>
            </div>

            {/* Filter inputs — hidden when "All" is selected */}
            {trendRange !== 'all' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
              {trendRange === 'daily' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={filterDate ?? ''}
                    onChange={(e) => setFilterDate(e.target.value || null)}
                    className="w-full h-10 px-3 rounded-md border border-[#d1d5db] bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              )}

              {trendRange === 'monthly' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                    <Select
                      isClearable
                      value={filterMonth ? months.find((m) => m.value === filterMonth) : null}
                      onChange={(opt) => setFilterMonth(opt?.value ?? null)}
                      options={months}
                      placeholder="Show all months"
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '40px',
                          borderColor: '#d1d5db',
                        }),
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <Select
                      isClearable
                      value={filterYear ? { value: filterYear, label: String(filterYear) } : null}
                      onChange={(opt) => setFilterYear(opt?.value ?? null)}
                      options={years.map((y) => ({ value: y, label: String(y) }))}
                      placeholder="Show all years"
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '40px',
                          borderColor: '#d1d5db',
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
                    isClearable
                    value={filterYear ? { value: filterYear, label: String(filterYear) } : null}
                    onChange={(opt) => setFilterYear(opt?.value ?? null)}
                    options={availableYearlyPeriods}
                    placeholder="Show all years"
                    className="react-select-container"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: '40px',
                        borderColor: '#d1d5db',
                      }),
                    }}
                  />
                </div>
              )}
            </div>
            )}
          </div>

          {isLoading ? (
            <Skeleton className="h-[400px] w-full rounded-xl" />
          ) : (
            <MonthlyChart data={filteredStats} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
