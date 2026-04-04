import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";

const ResidentStats = ({
  residents = [],
  filterPurok = "",
  filterClassification = "all",
  classificationOptions = [],
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalResidents: 0,
    totalMales: 0,
    totalFemales: 0,
    genderRatio: "0",
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

        // Add classification filter if specified
        if (filterClassification && filterClassification !== "all") {
          params.classificationType = filterClassification;
        }

        // Fetch total population statistics from API
        const response = await api.get("/statistics/total-population", {
          params,
        });
        const data = response.data.data;

        const totalResidents = data?.total_population || 0;
        const totalMales = data?.total_male || 0;
        const totalFemales = data?.total_female || 0;

        // Calculate gender ratio (avoid division by zero)
        const genderRatio =
          totalFemales > 0
            ? (totalMales / totalFemales).toFixed(2)
            : totalMales > 0
            ? "∞"
            : "0";

        setStats({
          totalResidents,
          totalMales,
          totalFemales,
          genderRatio,
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching resident statistics:", error);
}
        // Fallback to calculating from current page data
        const totalResidents = residents.length;
        const totalMales = residents.filter(
          (r) => r.sex === "Male" || r.sex === "male"
        ).length;
        const totalFemales = residents.filter(
          (r) => r.sex === "Female" || r.sex === "female"
        ).length;

        const genderRatio =
          totalFemales > 0
            ? (totalMales / totalFemales).toFixed(2)
            : totalMales > 0
            ? "∞"
            : "0";

        setStats({
          totalResidents,
          totalMales,
          totalFemales,
          genderRatio,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, filterPurok, filterClassification, residents]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[1, 2].map((i) => (
          <Card
            key={i}
            className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !pb-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="sm:pt-0">
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
          <CardTitle className="text-sm font-medium">Total Residents</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="sm:pt-0">
          <div className="text-2xl font-bold">
            {stats.totalResidents.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Registered in the system
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !pb-1">
          <CardTitle className="text-sm font-medium">
            Gender Distribution
          </CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="sm:pt-0">
          <div className="text-2xl font-bold">
            {stats.totalMales.toLocaleString()}M /{" "}
            {stats.totalFemales.toLocaleString()}F
          </div>
          <p className="text-xs text-muted-foreground">
            Male to female ratio: {stats.genderRatio}
          </p>
        </CardContent>
      </Card>

      {/* Classification Filter Indicator */}
      {filterClassification && filterClassification !== "all" && (
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 !pb-1">
            <CardTitle className="text-sm font-medium">Filtered By</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              <Filter className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="sm:pt-0">
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ 
                  backgroundColor: classificationOptions.find(opt => opt.label === filterClassification)?.color || '#4CAF50' 
                }}
              />
              <div className="text-lg font-bold">
                {filterClassification}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Showing residents with this classification
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResidentStats;
