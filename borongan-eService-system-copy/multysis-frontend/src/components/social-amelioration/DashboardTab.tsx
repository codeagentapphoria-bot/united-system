import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { useGovernmentPrograms } from '@/hooks/social-amelioration/useGovernmentPrograms';
import { useSocialAmeliorationData } from '@/hooks/social-amelioration/useSocialAmelioration';
import { cn } from '@/lib/utils';
import { socialAmeliorationApi } from '@/services/api/social-amelioration.service';
import React, { useEffect, useMemo, useState } from 'react';
import { FiBookOpen, FiExternalLink, FiHeart, FiSettings, FiTrendingUp, FiUserCheck, FiUsers } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

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
  } = useSocialAmeliorationData();
  const { allGovernmentPrograms } = useGovernmentPrograms();
  const navigate = useNavigate();
  
  const [filterType, setFilterType] = useState<'daily' | 'monthly' | 'yearly'>(trendRange);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [programRegistrationStats, setProgramRegistrationStats] = useState<{
    total: number;
    active: number;
    inactive: number;
    byType: {
      SENIOR_CITIZEN: number;
      PWD: number;
      STUDENT: number;
      SOLO_PARENT: number;
      ALL: number;
    };
  }>({
    total: 0,
    active: 0,
    inactive: 0,
    byType: {
      SENIOR_CITIZEN: 0,
      PWD: 0,
      STUDENT: 0,
      SOLO_PARENT: 0,
      ALL: 0,
    },
  });
  const [isLoadingProgramStats, setIsLoadingProgramStats] = useState(false);

  useEffect(() => {
    setTrendRange(filterType);
  }, [filterType, setTrendRange]);

  useEffect(() => {
    setFilterType(trendRange);
  }, [trendRange]);

  // Helper function to fetch all pages of beneficiaries
  const fetchAllBeneficiaries = async <T,>(
    fetchFn: (params?: { page?: number; limit?: number }) => Promise<{ data: T[]; pagination: { totalPages: number; total: number } }>
  ): Promise<T[]> => {
    const allData: T[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await fetchFn({ page: currentPage, limit: 100 });
      allData.push(...response.data);
      totalPages = response.pagination.totalPages;
      currentPage++;
    } while (currentPage <= totalPages);

    return allData;
  };

  // Fetch program registration statistics based on beneficiary records
  // NOTE: This is independent of filterType/filterDate/filterMonth/filterYear filters
  // and always shows total registrations across all time periods
  // Using a ref to track if stats have been fetched to prevent unnecessary refetches
  const statsFetchedRef = React.useRef(false);
  const lastDashboardStatsRef = React.useRef<string>('');

  useEffect(() => {
    // Create a stable key from dashboardStats to detect actual changes
    const dashboardStatsKey = `${dashboardStats.totalSeniorCitizens}-${dashboardStats.totalPWD}-${dashboardStats.totalStudents}-${dashboardStats.totalSoloParents}`;
    
    // Only fetch if stats haven't been fetched yet OR if dashboardStats actually changed
    if (statsFetchedRef.current && lastDashboardStatsRef.current === dashboardStatsKey) {
      return; // Skip if already fetched and stats haven't changed
    }

    const fetchProgramRegistrationStats = async () => {
      setIsLoadingProgramStats(true);
      try {
        // Use dashboardStats for beneficiary type counts (already fetched correctly)
        // Only need to fetch beneficiaries to count "ALL" type program registrations
        // This fetches ALL beneficiaries regardless of date filters
        const [seniors, pwds, students, soloParents] = await Promise.all([
          fetchAllBeneficiaries(socialAmeliorationApi.getSeniorBeneficiaries),
          fetchAllBeneficiaries(socialAmeliorationApi.getPWDBeneficiaries),
          fetchAllBeneficiaries(socialAmeliorationApi.getStudentBeneficiaries),
          fetchAllBeneficiaries(socialAmeliorationApi.getSoloParentBeneficiaries),
        ]);

        // Count citizens registered in "ALL" type programs (programs that apply to all beneficiary types)
        const allTypeProgramIds = allGovernmentPrograms
          .filter(p => p.type === 'ALL' && p.isActive)
          .map(p => p.id);

        const citizensInAllPrograms = new Set<string>();
        const activeCitizensInAllPrograms = new Set<string>();

        // Check all beneficiaries for ALL type programs
        [...seniors, ...pwds, ...students, ...soloParents].forEach(beneficiary => {
          const citizenId = beneficiary.citizenId;
          const isActive = beneficiary.status === 'ACTIVE';
          const programIds = 
            (beneficiary as any).governmentPrograms || 
            (beneficiary as any).programs || 
            (beneficiary as any).assistancePrograms || 
            [];

          const hasAllProgram = programIds.some((pid: string) => allTypeProgramIds.includes(pid));
          if (hasAllProgram) {
            citizensInAllPrograms.add(citizenId);
            if (isActive) {
              activeCitizensInAllPrograms.add(citizenId);
            }
          }
        });

        // Calculate total unique citizens registered across all beneficiary types
        // Note: A citizen can be registered in multiple types, so we need to count unique citizens
        const allCitizenIds = new Set<string>();
        [...seniors, ...pwds, ...students, ...soloParents].forEach(beneficiary => {
          allCitizenIds.add(beneficiary.citizenId);
        });

        const activeCitizenIds = new Set<string>();
        [...seniors, ...pwds, ...students, ...soloParents].forEach(beneficiary => {
          if (beneficiary.status === 'ACTIVE') {
            activeCitizenIds.add(beneficiary.citizenId);
          }
        });

        const newStats = {
          total: allCitizenIds.size,
          active: activeCitizenIds.size,
          inactive: allCitizenIds.size - activeCitizenIds.size,
          byType: {
            SENIOR_CITIZEN: dashboardStats.totalSeniorCitizens,
            PWD: dashboardStats.totalPWD,
            STUDENT: dashboardStats.totalStudents,
            SOLO_PARENT: dashboardStats.totalSoloParents,
            ALL: citizensInAllPrograms.size,
          },
        };

        // Only update state if values actually changed to prevent unnecessary re-renders
        setProgramRegistrationStats((prevStats) => {
          const hasChanged = 
            prevStats.total !== newStats.total ||
            prevStats.active !== newStats.active ||
            prevStats.inactive !== newStats.inactive ||
            prevStats.byType.SENIOR_CITIZEN !== newStats.byType.SENIOR_CITIZEN ||
            prevStats.byType.PWD !== newStats.byType.PWD ||
            prevStats.byType.STUDENT !== newStats.byType.STUDENT ||
            prevStats.byType.SOLO_PARENT !== newStats.byType.SOLO_PARENT ||
            prevStats.byType.ALL !== newStats.byType.ALL;
          
          return hasChanged ? newStats : prevStats;
        });

        // Mark as fetched and store the key
        statsFetchedRef.current = true;
        lastDashboardStatsRef.current = dashboardStatsKey;
      } catch (error) {
        console.error('Failed to fetch program registration stats:', error);
      } finally {
        setIsLoadingProgramStats(false);
      }
    };

    if (dashboardStats.totalSeniorCitizens >= 0 && allGovernmentPrograms.length > 0) {
      fetchProgramRegistrationStats();
    }
  }, [dashboardStats.totalSeniorCitizens, dashboardStats.totalPWD, dashboardStats.totalStudents, dashboardStats.totalSoloParents, allGovernmentPrograms.length]);

  // Filter monthly stats based on selected filters
  const filteredMonthlyStats = useMemo(() => {
    // If no stats available, return empty array
    if (!allMonthlyStats || allMonthlyStats.length === 0) {
      return [];
    }

    if (filterType === 'daily') {
      // period format: "2024-01-15" (ISO date string)
      // filterDate format: "2024-01-15" (ISO date string)
      return allMonthlyStats.filter((stat) => stat.period === filterDate);
    }

    if (filterType === 'monthly') {
      // period format: "2024-01" (YYYY-MM)
      // Need to match filterYear and filterMonth
      const targetPeriod = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
      return allMonthlyStats.filter((stat) => stat.period === targetPeriod);
    }

    // filterType === 'yearly'
    // period format: "2024" (YYYY)
    return allMonthlyStats.filter((stat) => stat.period === String(filterYear));
  }, [filterType, filterDate, filterMonth, filterYear, allMonthlyStats]);

  // Program distribution chart data based on citizen registrations
  // NOTE: This is independent of the statistics filters (daily/monthly/yearly)
  // and shows total registrations across all time periods
  const programDistributionData = useMemo(() => {
    return [
      { name: 'Senior Citizen', value: programRegistrationStats.byType.SENIOR_CITIZEN, color: 'rgb(82, 114, 170)' },
      { name: 'PWD', value: programRegistrationStats.byType.PWD, color: 'rgb(135, 161, 209)' },
      { name: 'Student', value: programRegistrationStats.byType.STUDENT, color: 'rgb(142, 238, 215)' },
      { name: 'Solo Parent', value: programRegistrationStats.byType.SOLO_PARENT, color: 'rgb(163, 179, 249)' },
    ].filter(item => item.value > 0);
  }, [programRegistrationStats]);

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
    <div className="space-y-6">
      {/* Government Programs Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FiSettings className="h-5 w-5" />
              Government Programs Registration Overview
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/general-settings/government-program')}
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
            >
              <FiExternalLink className="h-4 w-4 mr-2" />
              Manage Programs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingProgramStats ? (
            <div className="text-center py-8 text-gray-500">
              Loading enrollment statistics...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Total Registered Citizens</p>
                      <p className="text-3xl font-bold text-blue-700 mt-2">{programRegistrationStats.total.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-full bg-white shadow-sm text-blue-600">
                      <FiUsers className="h-6 w-6" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Active Registrations</p>
                      <p className="text-3xl font-bold text-green-700 mt-2">{programRegistrationStats.active.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-full bg-white shadow-sm text-green-600">
                      <FiTrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Inactive Registrations</p>
                      <p className="text-3xl font-bold text-orange-700 mt-2">{programRegistrationStats.inactive.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-full bg-white shadow-sm text-orange-600">
                      <FiSettings className="h-6 w-6" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Universal Program Registrations</p>
                      <p className="text-3xl font-bold text-purple-700 mt-2">{programRegistrationStats.byType.ALL.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-full bg-white shadow-sm text-purple-600">
                      <FiUsers className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Program Distribution Chart */}
          {programDistributionData.length > 0 && !isLoadingProgramStats && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Citizen Registration Distribution by Beneficiary Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-center">
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <PieChart>
                      <Pie
                        data={programDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {programDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-gray-700">Citizen Registration Count by Type</h4>
                  {programDistributionData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                      <Badge className="bg-primary-100 text-primary-700">{item.value.toLocaleString()} citizens</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
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
                    variant={filterType === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('daily')}
                    className={cn(
                      filterType === 'daily' 
                        ? 'bg-primary-600 text-white hover:bg-primary-700' 
                        : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300'
                    )}
                  >
                    Daily
                  </Button>
                  <Button
                    variant={filterType === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('monthly')}
                    className={cn(
                      filterType === 'monthly' 
                        ? 'bg-primary-600 text-white hover:bg-primary-700' 
                        : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300'
                    )}
                  >
                    Monthly
                  </Button>
                  <Button
                    variant={filterType === 'yearly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType('yearly')}
                    className={cn(
                      filterType === 'yearly' 
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
                {filterType === 'daily' && (
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
                
                {filterType === 'monthly' && (
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
                
                {filterType === 'yearly' && (
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
            
            <MonthlyChart data={filteredMonthlyStats} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
