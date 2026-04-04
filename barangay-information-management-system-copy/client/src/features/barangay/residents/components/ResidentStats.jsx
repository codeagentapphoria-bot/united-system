import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import api from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";

const ResidentStats = ({
  residents = [],
  filterBarangay = "",
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
        } else if (filterBarangay && filterBarangay !== "all") {
          params.barangayId = filterBarangay;
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
  }, [user, filterBarangay, filterClassification, residents]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2].map((i) => (
          <Card key={i} className="">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3.5 w-3.5 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground">Total Residents</CardTitle>
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold text-gray-800">
            {stats.totalResidents.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Registered in the system</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground">Gender Distribution</CardTitle>
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-xl font-bold text-gray-800">
            {stats.totalMales.toLocaleString()}M / {stats.totalFemales.toLocaleString()}F
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Male to female ratio: {stats.genderRatio}
          </p>
        </CardContent>
      </Card>

      {filterClassification && filterClassification !== "all" && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Filtered By</CardTitle>
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    classificationOptions.find((opt) => opt.label === filterClassification)?.color ||
                    "#4CAF50",
                }}
              />
              <div className="text-xl font-bold text-gray-800 truncate">{filterClassification}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing residents with this classification
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResidentStats;
