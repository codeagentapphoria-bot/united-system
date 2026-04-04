import React, { useEffect, useState } from "react";
import { useExternalApi, useExternalApiData } from "@/hooks/useExternalApi";
import { handleError } from "@/utils/errorHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";

const ExternalApiExample = () => {
  const {
    loading,
    error,
    getCities,
    getBuildings,
    getLandmarks,
    getLandmarksStatistics,
    clearError,
  } = useExternalApi();

  // Example using the data hook with caching
  const {
    data: citiesData,
    loading: citiesLoading,
    error: citiesError,
    fetchData: fetchCities,
  } = useExternalApiData("cities", {}, { cacheTime: 10 * 60 * 1000 }); // 10 minutes cache

  const [apiResults, setApiResults] = useState({
    cities: null,
    buildings: null,
    landmarks: null,
    statistics: null,
  });

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      clearError();

      // Fetch cities
      const cities = await getCities();
      setApiResults((prev) => ({ ...prev, cities }));

      // Fetch buildings
      const buildings = await getBuildings();
      setApiResults((prev) => ({ ...prev, buildings }));

      // Fetch landmarks
      const landmarks = await getLandmarks();
      setApiResults((prev) => ({ ...prev, landmarks }));

      // Fetch statistics
      const statistics = await getLandmarksStatistics();
      setApiResults((prev) => ({ ...prev, statistics }));
    } catch (error) {
      handleError(error, "Fetch External API Data");
    }
  };

  const handleRefresh = () => {
    fetchAllData();
  };

  const handleFetchCitiesWithCache = () => {
    fetchCities(true); // Force refresh
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          External API Integration Example
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh All Data
          </Button>
          <Button
            onClick={handleFetchCitiesWithCache}
            disabled={citiesLoading}
            variant="outline"
          >
            {citiesLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Cities (Cached)
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {(error || citiesError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || citiesError}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading data...</span>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Cities
              <Badge variant="secondary">
                {apiResults.cities?.length || 0} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apiResults.cities ? (
              <div className="space-y-2">
                {apiResults.cities.slice(0, 5).map((city, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium">
                      {city.name || `City ${index + 1}`}
                    </span>
                    <Badge variant="outline">
                      {city.province || "Unknown"}
                    </Badge>
                  </div>
                ))}
                {apiResults.cities.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{apiResults.cities.length - 5} more cities
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No cities data available</p>
            )}
          </CardContent>
        </Card>

        {/* Buildings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Buildings
              <Badge variant="secondary">
                {apiResults.buildings?.length || 0} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apiResults.buildings ? (
              <div className="space-y-2">
                {apiResults.buildings.slice(0, 5).map((building, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium">
                      {building.name || `Building ${index + 1}`}
                    </span>
                    <Badge variant="outline">
                      {building.type || "Unknown"}
                    </Badge>
                  </div>
                ))}
                {apiResults.buildings.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{apiResults.buildings.length - 5} more buildings
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No buildings data available</p>
            )}
          </CardContent>
        </Card>

        {/* Landmarks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Landmarks
              <Badge variant="secondary">
                {apiResults.landmarks?.length || 0} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apiResults.landmarks ? (
              <div className="space-y-2">
                {apiResults.landmarks.slice(0, 5).map((landmark, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium">
                      {landmark.name || `Landmark ${index + 1}`}
                    </span>
                    <Badge variant="outline">
                      {landmark.category || "Unknown"}
                    </Badge>
                  </div>
                ))}
                {apiResults.landmarks.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{apiResults.landmarks.length - 5} more landmarks
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">No landmarks data available</p>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Landmarks Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {apiResults.statistics ? (
              <div className="space-y-3">
                {Object.entries(apiResults.statistics).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="font-medium capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <Badge variant="default">{value}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No statistics available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cached Cities Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Cached Cities Data (Hook Example)
            <Badge variant="secondary">{citiesData?.length || 0} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {citiesLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading cached cities...</span>
            </div>
          ) : citiesData ? (
            <div className="space-y-2">
              {citiesData.slice(0, 3).map((city, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-blue-50 rounded"
                >
                  <span className="font-medium">
                    {city.name || `City ${index + 1}`}
                  </span>
                  <Badge variant="outline" className="bg-blue-100">
                    Cached
                  </Badge>
                </div>
              ))}
              {citiesData.length > 3 && (
                <p className="text-sm text-gray-500 text-center">
                  +{citiesData.length - 3} more cached cities
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No cached cities data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExternalApiExample;
