import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, Users, Heart, Building } from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";

const HouseholdStats = ({
  households = [],
  filterPurok = "",
  filterHousingType = "all",
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalHouseholds: 0,
    totalFamilies: 0,
    totalResidents: 0,
    averageFamilySize: "0.0",
    mostCommonHousingType: "N/A",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Build query parameters for filtering
        const params = {};

        if (user?.target_type === "barangay") {
          params.barangayId = user.target_id;
          if (filterPurok && filterPurok !== "all") {
            params.purokId = filterPurok;
          }
        } else if (filterPurok && filterPurok !== "all") {
          params.barangayId = filterPurok;
        }

        // Fetch total households and families from statistics API
        const [householdStats, familyStats] = await Promise.all([
          api.get("/statistics/total-households", { params }),
          api.get("/statistics/total-families", { params }),
        ]);

        const householdData = householdStats.data.data;
        const familyData = familyStats.data.data;

        // Calculate average family size
        const totalFamilies = familyData?.total_families || 0;
        const totalResidents = householdData?.total_residents || 0;
        const totalHouseholds = householdData?.total_households || 0;

        // Calculate average family size: (total residents - house heads) / total families
        // This gives us the average number of family members per family
        const familyMembers = totalResidents - totalHouseholds;
        const averageFamilySize =
          totalFamilies > 0
            ? (familyMembers / totalFamilies).toFixed(1)
            : "0.0";

        // For housing type analysis, we'll use the current page data as a sample
        // since the backend doesn't provide this statistic
        const housingTypes = households.reduce((acc, h) => {
          const type = h.housingType || "Unknown";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        const mostCommonHousingType =
          Object.keys(housingTypes).length > 0
            ? Object.keys(housingTypes).reduce((a, b) =>
                housingTypes[a] > housingTypes[b] ? a : b
              )
            : "N/A";

        setStats({
          totalHouseholds: householdData?.total_households || 0,
          totalFamilies: totalFamilies,
          totalResidents: totalResidents,
          averageFamilySize,
          mostCommonHousingType,
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching household statistics:", error);
}
        // Fallback to calculating from current page data
        const totalHouseholds = households.length;
        const totalFamilies = households.reduce((sum, h) => {
          return sum + (parseInt(h.family_count) || 0);
        }, 0);
        const totalResidents = households.reduce(
          (sum, h) => sum + (parseInt(h.resident_count) || 0),
          0
        );

        // Calculate average family size: (total residents - house heads) / total families
        const familyMembers = totalResidents - totalHouseholds;
        const averageFamilySize =
          totalFamilies > 0
            ? (familyMembers / totalFamilies).toFixed(1)
            : "0.0";

        const housingTypes = households.reduce((acc, h) => {
          const type = h.housingType || "Unknown";
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {});

        const mostCommonHousingType =
          Object.keys(housingTypes).length > 0
            ? Object.keys(housingTypes).reduce((a, b) =>
                housingTypes[a] > housingTypes[b] ? a : b
              )
            : "N/A";

        setStats({
          totalHouseholds,
          totalFamilies,
          totalResidents,
          averageFamilySize,
          mostCommonHousingType,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, filterPurok, filterHousingType, households]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !pb-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="!pt-0">
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !pb-1">
          <CardTitle className="text-sm font-medium">
            Total Households
          </CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="!pt-0">
          <div className="text-2xl font-bold">
            {stats.totalHouseholds.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Registered households</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !pb-1">
          <CardTitle className="text-sm font-medium">Total Families</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="!pt-0">
          <div className="text-2xl font-bold">
            {stats.totalFamilies.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Family units</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !pb-1">
          <CardTitle className="text-sm font-medium">
            Avg Family Members
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="!pt-0">
          <div className="text-2xl font-bold">{stats.averageFamilySize}</div>
          <p className="text-xs text-muted-foreground">Members per family</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HouseholdStats;
