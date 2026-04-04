import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { handleError } from "@/utils/errorHandler";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Home,
  TrendingDown,
  Download,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import api from "@/utils/api";
import { exportToCSV } from "@/utils/dashboardUtils";
import { useToast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";

const UnemployedHouseholdStats = ({
  role,
  selectedBarangay,
  selectedPurok,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = {};

      if (role === "barangay") {
        // For barangay role, always include barangayId filter using user's target_id
        params.barangayId = user?.target_id;
      } else if (selectedBarangay) {
        // For municipality role, only include if barangay is selected
        params.barangayId = selectedBarangay;
      }

      if (selectedPurok) {
        params.purokId = selectedPurok;
      }

      const response = await api.get("/statistics/unemployed-household-stats", {
        params,
      });

      setStats(response.data.data);
    } catch (error) {
      handleError(error, "Fetch Unemployed Household Stats");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = {};

      if (role === "barangay") {
        // For barangay role, always include barangayId filter using user's target_id
        params.barangayId = user?.target_id;
      } else if (selectedBarangay) {
        params.barangayId = selectedBarangay;
      }

      if (selectedPurok) {
        params.purokId = selectedPurok;
      }

      const response = await api.get(
        "/statistics/unemployed-household-details",
        {
          params,
        }
      );

      const data = response.data.data;

      if (data && data.length > 0) {
        // Transform data for the new Excel format with separate columns
        const exportData = [];
        const householdGroups = {};

        // Group data by household
        data.forEach((item) => {
          if (!householdGroups[item.household_id]) {
            householdGroups[item.household_id] = {
              barangay: item.barangay_name,
              purok: item.purok_name || "N/A",
              address: item.address,
              totalResidents: item.total_residents,
              totalUnemployed: item.unemployed_count,
              totalMonthlyIncome: item.total_monthly_income,
              residents: [],
            };
          }

          householdGroups[item.household_id].residents.push({
            name: `${item.first_name} ${item.middle_name ? item.middle_name : ""} ${item.last_name}${item.suffix ? ` ${item.suffix}` : ""}`,
            employmentStatus: item.employment_status,
            monthlyIncome: item.monthly_income,
            age: item.age,
          });
        });

        // Create export data with proper formatting
        Object.values(householdGroups).forEach((household, index) => {
          household.residents.forEach((resident, residentIndex) => {
            exportData.push({
              Barangay: residentIndex === 0 ? household.barangay : "",
              Purok: residentIndex === 0 ? household.purok : "",
              Address: residentIndex === 0 ? household.address : "",
              "Total Residents":
                residentIndex === 0 ? household.totalResidents : "",
              "Total Unemployed":
                residentIndex === 0 ? household.totalUnemployed : "",
              "Total Monthly Income":
                residentIndex === 0 ? household.totalMonthlyIncome : "",
              "Resident Name": resident.name,
              "Employment Status": resident.employmentStatus,
              Age: resident.age,
              "Monthly Income": resident.monthlyIncome || "0",
            });
          });
        });

        const filename = `unemployed-households-${
          new Date().toISOString().split("T")[0]
        }`;
        exportToCSV(exportData, filename);

        toast({
          title: "Export Successful",
          description: `Exported ${data.length} households to CSV`,
        });
      } else {
        toast({
          title: "No Data",
          description: "No unemployed households found to export",
          variant: "destructive",
        });
      }
    } catch (error) {
      handleError(error, "Export Unemployed Household Data");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [role, selectedBarangay, selectedPurok, user?.target_id]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Unemployed Household Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Loading statistics...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Unemployed Household Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const percentage =
    stats && stats.total_households > 0
      ? Math.round(stats.percentage_households_with_unemployed)
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Unemployed Household Statistics
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={
              exporting || !stats || stats.households_with_unemployed === 0
            }
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {exporting ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.total_households?.toLocaleString() || "0"}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Households
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats?.households_with_unemployed?.toLocaleString() || "0"}
              </div>
              <div className="text-sm text-muted-foreground">
                Households with Unemployed
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats?.total_unemployed_residents?.toLocaleString() || "0"}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Unemployed Residents
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {percentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                Percentage Affected
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Households with Unemployed Members</span>
              <span>{percentage}%</span>
            </div>
            <Progress value={percentage} className="w-full" />
            <p className="text-xs text-muted-foreground">
              {stats?.households_with_unemployed || 0} out of{" "}
              {stats?.total_households || 0} households affected
            </p>
          </div>

          {/* Summary */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800 text-sm mb-1">
                  Unemployment Impact Summary
                </h4>
                <p className="text-xs text-orange-700">
                  {stats?.households_with_unemployed || 0} households (
                  {percentage}%) affected by unemployment, with{" "}
                  {stats?.total_unemployed_residents || 0} unemployed residents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnemployedHouseholdStats;
