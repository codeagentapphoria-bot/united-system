import React from "react";
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
} from "recharts";
import ChartCard from "../ChartCard";
import EmptyState from "../EmptyState";
import { chartColors } from "@/constants/dashboardConstants";
import { responsiveChartConfig } from "@/components/ui/chart";
import { Users, Calendar, HeartHandshake, Badge } from "lucide-react";

const DemographicsTab = ({
  demographics,
  prepareGenderData,
  prepareAgeData,
  prepareCivilStatusData,
  prepareClassificationData,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gender Distribution */}
      <ChartCard
        title="Gender Distribution"
        description="Population by gender"
        icon={Users}
        data={prepareGenderData}
        rawData={demographics.gender}
        filename="gender-distribution"
      >
        {demographics.gender && demographics.gender.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={prepareGenderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={responsiveChartConfig.pieLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {prepareGenderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip {...responsiveChartConfig.tooltip} />
            </RechartsPieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={Users}
            title="No gender data available"
            description="Add residents with gender information to see this chart"
          />
        )}
      </ChartCard>

      {/* Age Distribution */}
      <ChartCard
        title="Age Distribution"
        description="Population by age groups"
        icon={Calendar}
        data={prepareAgeData}
        rawData={demographics.age}
        filename="age-distribution"
      >
        {demographics.age && demographics.age.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={prepareAgeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                {...responsiveChartConfig.xAxisBar}
              />
              <YAxis {...responsiveChartConfig.yAxis} />
              <Tooltip {...responsiveChartConfig.tooltip} />
              <Bar 
                dataKey="value" 
                fill={chartColors.primary}
                label={responsiveChartConfig.barLabel}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No age data available"
            description="Add residents with age information to see this chart"
          />
        )}
      </ChartCard>

      {/* Civil Status */}
      <ChartCard
        title="Civil Status"
        description="Population by civil status"
        icon={HeartHandshake}
        data={prepareCivilStatusData}
        rawData={demographics.civilStatus}
        filename="civil-status"
      >
        {demographics.civilStatus && demographics.civilStatus.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={prepareCivilStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={responsiveChartConfig.pieLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {prepareCivilStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip {...responsiveChartConfig.tooltip} />
            </RechartsPieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={HeartHandshake}
            title="No civil status data available"
            description="Add residents with civil status information to see this chart"
          />
        )}
      </ChartCard>

      {/* Resident Classifications */}
      <ChartCard
        title="Resident Classifications"
        description="Special classifications"
        icon={Badge}
        data={prepareClassificationData}
        rawData={demographics.classifications}
        filename="resident-classifications"
      >
        {demographics.classifications &&
        demographics.classifications.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={prepareClassificationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                {...responsiveChartConfig.xAxisBar}
              />
              <YAxis {...responsiveChartConfig.yAxis} />
              <Tooltip {...responsiveChartConfig.tooltip} />
              <Bar 
                dataKey="value" 
                fill={chartColors.primary}
                label={responsiveChartConfig.barLabel}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={Badge}
            title="No classification data available"
            description="Add resident classifications to see this chart"
          />
        )}
      </ChartCard>
    </div>
  );
};

export default DemographicsTab;
