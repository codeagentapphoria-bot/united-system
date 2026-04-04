import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Building,
  Home,
  Users2,
  User,
  PawPrint,
  Briefcase,
  BarChart3,
  GraduationCap,
  Vote,
  TrendingUp,
  MapPin,
} from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import useAuth from "@/hooks/useAuth";
import { useDashboardData } from "@/features/dashboard/hooks/useDashboardData";
import { useChartData } from "@/features/dashboard/hooks/useChartData";
import { getFilterDescription } from "@/utils/dashboardUtils";
import { chartColors } from "@/constants/dashboardConstants";
import { responsiveChartConfig } from "@/components/ui/chart";
import DashboardHeader from "@/features/dashboard/components/DashboardHeader";
import FilterControls from "@/features/dashboard/components/FilterControls";
import StatCard from "@/features/dashboard/components/StatCard";
import ChartCard from "@/features/dashboard/components/ChartCard";
import EmptyState from "@/features/dashboard/components/EmptyState";
import RecentActivities from "@/features/dashboard/components/RecentActivities";
import QuickActions from "@/features/dashboard/components/QuickActions";
import DemographicsTab from "@/features/dashboard/components/tabs/DemographicsTab";
import UnemployedHouseholdStats from "@/features/dashboard/components/UnemployedHouseholdStats";

 const Dashboard = ({ role }) => {
   const { user } = useAuth();
   const [selectedBarangay, setSelectedBarangay] = useState(null);
   const [selectedPurok, setSelectedPurok] = useState(null);
   const [activeTab, setActiveTab] = useState("demographics");

  const {
    loading,
    stats,
    demographics,
    distributionData,
    barangays,
    puroks,
    loadDashboardData,
  } = useDashboardData(role, selectedBarangay, selectedPurok);

  const {
    prepareGenderData,
    prepareAgeData,
    prepareCivilStatusData,
    prepareEducationData,
    prepareEmploymentData,
    prepareClassificationData,
    prepareVoterData,
  } = useChartData(demographics);

  const municipalityStats = [
    {
      title: "Total Barangays",
      value: (barangays?.length || 0).toString(),
      icon: Building,
      description: "Registered barangays",
      trend: null,
    },
    {
      title: "Total Population",
      value: (stats.population?.total || 0).toLocaleString(),
      icon: Users,
      description: getFilterDescription(
        "Registered residents",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend:
        (stats.population?.addedThisMonth || 0) > 0
          ? `+${stats.population.addedThisMonth} this month`
          : null,
    },
    {
      title: "Total Households",
      value: (stats.households?.total || 0).toLocaleString(),
      icon: Home,
      description: getFilterDescription(
        "Registered households",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend:
        (stats.households?.addedThisMonth || 0) > 0
          ? `+${stats.households.addedThisMonth} this month`
          : null,
    },
    {
      title: "Total Families",
      value: (stats.families?.total || 0).toLocaleString(),
      icon: Users2,
      description: getFilterDescription(
        "Family units",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend:
        (stats.families?.addedThisMonth || 0) > 0
          ? `+${stats.families.addedThisMonth} this month`
          : null,
    },
  ];

  const barangayStats = [
    {
      title: "Total Population",
      value: (stats.population?.total || 0).toLocaleString(),
      icon: Users,
      description: getFilterDescription(
        "Registered residents",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend:
        (stats.population?.addedThisMonth || 0) > 0
          ? `+${stats.population.addedThisMonth} this month`
          : null,
    },
    {
      title: "Male Residents",
      value: (stats.population?.male || 0).toLocaleString(),
      icon: User,
      description: getFilterDescription(
        "Male population",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend: null,
    },
    {
      title: "Female Residents",
      value: (stats.population?.female || 0).toLocaleString(),
      icon: User,
      description: getFilterDescription(
        "Female population",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend: null,
    },
    {
      title: "Total Households",
      value: (stats.households?.total || 0).toLocaleString(),
      icon: Home,
      description: getFilterDescription(
        "Registered households",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend:
        (stats.households?.addedThisMonth || 0) > 0
          ? `+${stats.households.addedThisMonth} this month`
          : null,
    },
    {
      title: "Total Families",
      value: (stats.families?.total || 0).toLocaleString(),
      icon: Users2,
      description: getFilterDescription(
        "Family units",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend:
        (stats.families?.addedThisMonth || 0) > 0
          ? `+${stats.families.addedThisMonth} this month`
          : null,
    },
    {
      title: "Registered Pets",
      value: (stats.pets?.total || 0).toLocaleString(),
      icon: PawPrint,
      description: getFilterDescription(
        "Pet registrations",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend:
        (stats.pets?.addedThisMonth || 0) > 0
          ? `+${stats.pets.addedThisMonth} this month`
          : null,
    },
    {
      title: "Households with Unemployed",
      value: (stats.unemployedHouseholds?.affected || 0).toLocaleString(),
      icon: Briefcase,
      description: getFilterDescription(
        "Households affected by unemployment",
        selectedBarangay,
        selectedPurok,
        barangays,
        puroks
      ),
      trend:
        stats.unemployedHouseholds?.percentage > 0
          ? `${Math.round(stats.unemployedHouseholds.percentage)}% affected`
          : null,
    },
  ];

  const currentStats =
    role === "municipality" ? municipalityStats : barangayStats;

  if (loading) {
    return (
      <LoadingSpinner 
        message="Loading dashboard data..." 
        variant="default"
        size="default"
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <DashboardHeader role={role} user={user} onRefresh={loadDashboardData} />

      <FilterControls
        role={role}
        selectedBarangay={selectedBarangay}
        setSelectedBarangay={setSelectedBarangay}
        selectedPurok={selectedPurok}
        setSelectedPurok={setSelectedPurok}
        barangays={barangays}
        puroks={puroks}
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {currentStats.map((stat, index) => (
          <StatCard key={index} stat={stat} />
        ))}
      </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
         {/* Mobile: Dropdown Select */}
         <div className="sm:hidden">
           <Select value={activeTab} onValueChange={setActiveTab}>
             <SelectTrigger className="w-full">
               <SelectValue placeholder="Select tab" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="demographics">
                 <div className="flex items-center gap-2">
                   <Users className="h-4 w-4" />
                   Demographics
                 </div>
               </SelectItem>
               <SelectItem value="population">
                 <div className="flex items-center gap-2">
                   <BarChart3 className="h-4 w-4" />
                   Population
                 </div>
               </SelectItem>
               <SelectItem value="education">
                 <div className="flex items-center gap-2">
                   <GraduationCap className="h-4 w-4" />
                   Education
                 </div>
               </SelectItem>
               <SelectItem value="employment">
                 <div className="flex items-center gap-2">
                   <Briefcase className="h-4 w-4" />
                   Employment
                 </div>
               </SelectItem>
               <SelectItem value="voters">
                 <div className="flex items-center gap-2">
                   <Vote className="h-4 w-4" />
                   Voters
                 </div>
               </SelectItem>
               {!selectedPurok && (
                 <SelectItem value="distribution">
                   <div className="flex items-center gap-2">
                     <BarChart3 className="h-4 w-4" />
                     Distribution
                   </div>
                 </SelectItem>
               )}
             </SelectContent>
           </Select>
         </div>
         
         {/* Desktop: Original Tabs */}
         <TabsList className="hidden sm:grid w-full grid-cols-6">
           <TabsTrigger value="demographics" className="flex items-center gap-2">
             <Users className="h-4 w-4" />
             Demographics
           </TabsTrigger>
           <TabsTrigger value="population" className="flex items-center gap-2">
             <BarChart3 className="h-4 w-4" />
             Population
           </TabsTrigger>
           <TabsTrigger value="education" className="flex items-center gap-2">
             <GraduationCap className="h-4 w-4" />
             Education
           </TabsTrigger>
           <TabsTrigger value="employment" className="flex items-center gap-2">
             <Briefcase className="h-4 w-4" />
             Employment
           </TabsTrigger>
           <TabsTrigger value="voters" className="flex items-center gap-2">
             <Vote className="h-4 w-4" />
             Voters
           </TabsTrigger>
           {!selectedPurok && (
             <TabsTrigger value="distribution" className="flex items-center gap-2">
               <BarChart3 className="h-4 w-4" />
               Distribution
             </TabsTrigger>
           )}
         </TabsList>

        <TabsContent value="demographics" className="space-y-3 sm:space-y-4">
          <DemographicsTab
            demographics={demographics}
            prepareGenderData={prepareGenderData}
            prepareAgeData={prepareAgeData}
            prepareCivilStatusData={prepareCivilStatusData}
            prepareClassificationData={prepareClassificationData}
          />
        </TabsContent>

        <TabsContent value="population" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <ChartCard
              title="Population Growth"
              description="Monthly population trends"
              icon={TrendingUp}
              showExport={false}
            >
                             {stats.population.total > 0 || stats.households.total > 0 ? (
                 <ResponsiveContainer width="100%" height={250}>
                   <AreaChart
                    data={[
                      {
                        month: "Jan",
                        population: Math.floor(stats.population.total * 0.85),
                        households: Math.floor(stats.households.total * 0.85),
                      },
                      {
                        month: "Feb",
                        population: Math.floor(stats.population.total * 0.88),
                        households: Math.floor(stats.households.total * 0.88),
                      },
                      {
                        month: "Mar",
                        population: Math.floor(stats.population.total * 0.92),
                        households: Math.floor(stats.households.total * 0.92),
                      },
                      {
                        month: "Apr",
                        population: Math.floor(stats.population.total * 0.95),
                        households: Math.floor(stats.households.total * 0.95),
                      },
                      {
                        month: "May",
                        population: Math.floor(stats.population.total * 0.98),
                        households: Math.floor(stats.households.total * 0.98),
                      },
                      {
                        month: "Jun",
                        population: stats.population.total,
                        households: stats.households.total,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      {...responsiveChartConfig.xAxisArea}
                    />
                    <YAxis {...responsiveChartConfig.yAxis} />
                    <Tooltip {...responsiveChartConfig.tooltip} />
                                         <Area
                       type="monotone"
                       dataKey="population"
                       stroke={chartColors.primary}
                       fill={chartColors.primary}
                       fillOpacity={0.3}
                       name="Population"
                       label={responsiveChartConfig.areaLabel}
                     />
                     <Area
                       type="monotone"
                       dataKey="households"
                       stroke={chartColors.secondary}
                       fill={chartColors.secondary}
                       fillOpacity={0.3}
                       name="Households"
                       label={responsiveChartConfig.areaLabel}
                     />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No population data available"
                  description="Add residents and households to see population trends"
                />
              )}
            </ChartCard>

            <ChartCard
              title="Household vs Population"
              description="Household size distribution"
              icon={Home}
              showExport={false}
            >
                             {stats.population.total > 0 ||
               stats.households.total > 0 ||
               stats.families.total > 0 ? (
                 <ResponsiveContainer width="100%" height={250}>
                   <BarChart
                    data={[
                      {
                        category: "Population",
                        value: stats.population.total,
                      },
                      {
                        category: "Households",
                        value: stats.households.total,
                      },
                      { category: "Families", value: stats.families.total },
                    ]}
                  >
                                         <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="category" {...responsiveChartConfig.xAxisArea} />
                     <YAxis {...responsiveChartConfig.yAxis} />
                     <Tooltip {...responsiveChartConfig.tooltip} />
                                         <Bar 
                       dataKey="value" 
                       fill={chartColors.secondary}
                       label={responsiveChartConfig.barLabel}
                     />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={Home}
                  title="No household data available"
                  description="Add residents and households to see this comparison"
                />
              )}
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="education" className="space-y-3 sm:space-y-4">
          <ChartCard
            title="Educational Attainment"
            description="Population by educational level"
            icon={GraduationCap}
            data={prepareEducationData}
            rawData={demographics.education}
            filename="educational-attainment"
          >
                         {demographics.education && demographics.education.length > 0 ? (
               <ResponsiveContainer width="100%" height={300}>
                 <BarChart data={prepareEducationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                                     <XAxis
                     dataKey="name"
                     {...responsiveChartConfig.xAxisBar}
                   />
                   <YAxis {...responsiveChartConfig.yAxis} />
                   <Tooltip {...responsiveChartConfig.tooltip} />
                                     <Bar 
                     dataKey="value" 
                     fill={chartColors.info}
                     label={responsiveChartConfig.barLabel}
                   />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={GraduationCap}
                title="No education data available"
                description={`Add residents with education information to see distribution across ${
                  role === "barangay"
                    ? "puroks"
                    : selectedBarangay
                    ? "puroks in selected barangay"
                    : "barangays"
                }`}
              />
            )}
          </ChartCard>
        </TabsContent>

        <TabsContent value="employment" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
            <ChartCard
              title="Employment Status"
              description="Population by employment status"
              icon={Briefcase}
              data={prepareEmploymentData}
              rawData={demographics.employment}
              filename="employment-status"
            >
                             {demographics.employment && demographics.employment.length > 0 ? (
                 <ResponsiveContainer width="100%" height={300}>
                   <BarChart data={prepareEmploymentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      {...responsiveChartConfig.xAxisBar}
                    />
                    <YAxis {...responsiveChartConfig.yAxis} />
                    <Tooltip {...responsiveChartConfig.tooltip} />
                                         <Bar 
                       dataKey="value" 
                       fill={chartColors.warning}
                       label={responsiveChartConfig.barLabel}
                     />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={Briefcase}
                  title="No employment data available"
                  description="Add residents with employment information to see this chart"
                />
              )}
            </ChartCard>

            <UnemployedHouseholdStats
              role={role}
              selectedBarangay={selectedBarangay}
              selectedPurok={selectedPurok}
            />
          </div>
        </TabsContent>

        <TabsContent value="voters" className="space-y-3 sm:space-y-4">
          <ChartCard
            title="Voter Statistics"
            description="Registered voters in the community"
            icon={Vote}
            data={prepareVoterData}
            rawData={demographics.voters}
            filename="voter-statistics"
          >
                         {demographics.voters && demographics.voters.length > 0 ? (
               <ResponsiveContainer width="100%" height={300}>
                 <RechartsPieChart>
                                     <Pie
                     data={prepareVoterData}
                     cx="50%"
                     cy="50%"
                     labelLine={false}
                     label={responsiveChartConfig.pieLabel}
                     outerRadius={120}
                     fill="#8884d8"
                     dataKey="value"
                   >
                    {prepareVoterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                                     <Tooltip {...responsiveChartConfig.tooltip} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Vote}
                title="No voter data available"
                description="Add resident classifications with voter status to see this chart"
              />
            )}
          </ChartCard>
        </TabsContent>

        {!selectedPurok && (
          <TabsContent value="distribution" className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {/* Gender Distribution - More Detailed */}
              <ChartCard
                title="Gender Distribution"
                description={
                  role === "barangay"
                    ? "Male vs Female population across puroks"
                    : selectedBarangay
                    ? "Male vs Female population across puroks in selected barangay"
                    : "Male vs Female population across barangays"
                }
                icon={Users}
                data={distributionData.demographics}
                rawData={distributionData.demographics}
                filename="gender-distribution"
              >
                {distributionData.demographics &&
                distributionData.demographics.length > 0 &&
                                 distributionData.demographics.some((item) => item.value > 0) ? (
                   <ResponsiveContainer width="100%" height={250}>
                     <BarChart data={distributionData.demographics}>
                      <CartesianGrid strokeDasharray="3 3" />
                                             <XAxis
                         dataKey="name"
                         {...responsiveChartConfig.xAxisBar}
                       />
                       <YAxis {...responsiveChartConfig.yAxis} />
                       <Tooltip {...responsiveChartConfig.tooltip} />
                      <Legend />
                                             <Bar
                         dataKey="male"
                         name="Male"
                         fill={chartColors.primary}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                       <Bar
                         dataKey="female"
                         name="Female"
                         fill={chartColors.secondary}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="No gender data available"
                    description={`Add residents with gender information to see distribution across ${
                      role === "barangay"
                        ? "puroks"
                        : selectedBarangay
                        ? "puroks in selected barangay"
                        : "barangays"
                    }`}
                  />
                )}
              </ChartCard>

              {/* Employment Distribution - More Detailed */}
              <ChartCard
                title="Employment Status Distribution"
                description={
                  role === "barangay"
                    ? "Employment status breakdown across puroks"
                    : selectedBarangay
                    ? "Employment status breakdown across puroks in selected barangay"
                    : "Employment status breakdown across barangays"
                }
                icon={Briefcase}
                data={distributionData.employment}
                rawData={distributionData.employment}
                filename="employment-distribution"
              >
                {distributionData.employment &&
                distributionData.employment.length > 0 &&
                                 distributionData.employment.some((item) => item.value > 0) ? (
                   <ResponsiveContainer width="100%" height={250}>
                     <BarChart data={distributionData.employment}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        {...responsiveChartConfig.xAxisBar}
                      />
                      <YAxis {...responsiveChartConfig.yAxis} />
                      <Tooltip {...responsiveChartConfig.tooltip} />
                      <Legend />
                                             <Bar
                         dataKey="employed"
                         name="Employed"
                         fill={chartColors.success}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                       <Bar
                         dataKey="unemployed"
                         name="Unemployed"
                         fill={chartColors.destructive}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                       <Bar
                         dataKey="student"
                         name="Student"
                         fill={chartColors.accent}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                       <Bar
                         dataKey="retired"
                         name="Retired"
                         fill={chartColors.muted}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={Briefcase}
                    title="No employment data available"
                    description={`Add residents with employment information to see distribution across ${
                      role === "barangay"
                        ? "puroks"
                        : selectedBarangay
                        ? "puroks in selected barangay"
                        : "barangays"
                    }`}
                  />
                )}
              </ChartCard>

              {/* Education Distribution - More Detailed */}
              <ChartCard
                title="Educational Attainment Distribution"
                description={
                  role === "barangay"
                    ? "Education levels across puroks"
                    : selectedBarangay
                    ? "Education levels across puroks in selected barangay"
                    : "Education levels across barangays"
                }
                icon={GraduationCap}
                data={distributionData.education}
                rawData={distributionData.education}
                filename="education-distribution"
              >
                {distributionData.education &&
                distributionData.education.length > 0 &&
                                 distributionData.education.some((item) => item.value > 0) ? (
                   <ResponsiveContainer width="100%" height={250}>
                     <BarChart data={distributionData.education}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        {...responsiveChartConfig.xAxisBar}
                      />
                      <YAxis {...responsiveChartConfig.yAxis} />
                      <Tooltip {...responsiveChartConfig.tooltip} />
                      <Legend />
                                             <Bar
                         dataKey="elementary"
                         name="Elementary"
                         fill={chartColors.primary}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                       <Bar
                         dataKey="high_school"
                         name="High School"
                         fill={chartColors.secondary}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                       <Bar
                         dataKey="college"
                         name="College"
                         fill={chartColors.accent}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                       <Bar
                         dataKey="post_graduate"
                         name="Post Graduate"
                         fill={chartColors.success}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={GraduationCap}
                    title="No education data available"
                    description={`Add residents with education information to see distribution across ${
                      role === "barangay" ? "puroks" : "puroks in all barangays"
                    }`}
                  />
                )}
              </ChartCard>

              {/* Voters Distribution - More Detailed */}
              <ChartCard
                title="Voter Status Distribution"
                description={
                  role === "barangay"
                    ? "Voter types across puroks"
                    : selectedBarangay
                    ? "Voter types across puroks in selected barangay"
                    : "Voter types across barangays"
                }
                icon={Vote}
                data={distributionData.voters}
                rawData={distributionData.voters}
                filename="voters-distribution"
              >
                {distributionData.voters &&
                distributionData.voters.length > 0 &&
                                 distributionData.voters.some((item) => item.value > 0) ? (
                   <ResponsiveContainer width="100%" height={250}>
                     <BarChart data={distributionData.voters}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        {...responsiveChartConfig.xAxisBar}
                      />
                      <YAxis {...responsiveChartConfig.yAxis} />
                      <Tooltip {...responsiveChartConfig.tooltip} />
                      <Legend />
                                             <Bar
                         dataKey="regular_voter"
                         name="Regular Voter"
                         fill={chartColors.primary}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                       <Bar
                         dataKey="sk_voter"
                         name="SK Voter"
                         fill={chartColors.secondary}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                       <Bar
                         dataKey="other_voter"
                         name="Other Voter"
                         fill={chartColors.muted}
                         stackId="a"
                         label={responsiveChartConfig.barLabel}
                       />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    icon={Vote}
                    title="No voters data available"
                    description={`Add resident classifications with voter status to see distribution across ${
                      role === "barangay"
                        ? "puroks"
                        : selectedBarangay
                        ? "puroks in selected barangay"
                        : "barangays"
                    }`}
                  />
                )}
              </ChartCard>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
        <RecentActivities />
        <QuickActions role={role} />
      </div>
    </div>
  );
};

export default Dashboard;
