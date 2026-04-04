import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  LayersControl,
  ZoomControl,
  Marker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Map,
  MapPin,
  Layers,
  Info,
  Loader2,
  Building,
  Users,
  Home,
} from "lucide-react";
import api from "@/utils/api";
import useRoles from "@/hooks/useRoles";
import useAuth from "@/hooks/useAuth";
import HouseholdViewDialog from "@/features/household/components/HouseholdViewDialog";
import { handleError, handleErrorSilently } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import LoadingSpinner from "@/components/common/LoadingSpinner";

// Default fallback coordinates — override via environment or barangay setup
const DEFAULT_CENTER = [11.6081, 125.4311];
const DEFAULT_ZOOM = 12;

// Custom household marker icon
const createHouseholdIcon = () => {
  return L.divIcon({
    html: `<div style="
      background-color: #ef4444;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    className: "household-marker",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const GeoMapPage = () => {
  const [geojsonData, setGeojsonData] = useState(null);
  const [householdLocations, setHouseholdLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showHouseholds, setShowHouseholds] = useState(true);
  const [selectedHousehold, setSelectedHousehold] = useState(null);
  const [householdDialogOpen, setHouseholdDialogOpen] = useState(false);
  const [loadingHouseholdDetails, setLoadingHouseholdDetails] = useState(false);
  const { role } = useRoles();
  const { user } = useAuth();
  const mapRef = useRef(null);

  // Determine if this is a barangay or municipality user
  const isBarangayUser = role === "barangay";
  const isMunicipalityUser = role === "municipality";

  useEffect(() => {
    fetchGeoJSONData();
    fetchHouseholdLocations();
  }, [role]);

  const fetchHouseholdLocations = async () => {
    try {
      const response = await api.get("/locations/household");
      setHouseholdLocations(response.data.data || []);
    } catch (err) {
      handleErrorSilently("Error fetching household locations:", err);

      // Handle authorization errors specifically
      if (err.response?.status === 403) {
        setError(
          "Access denied: You don't have permission to view household locations."
        );
      } else if (err.response?.status === 401) {
        setError("Authentication required. Please log in again.");
      } else {
        setError("Failed to load household locations. Please try again later.");
      }
    }
  };

  const fetchGeoJSONData = async () => {
    try {
      setLoading(true);
      let endpoint = "/geojson/city"; // Default to municipality data

      if (isBarangayUser && user?.target_id) {
        // For barangay users, only show their specific barangay boundary
        endpoint = `/geojson/barangays/${user.target_id}`;
      } else if (isMunicipalityUser) {
        // For municipality users, show all barangays
        endpoint = "/geojson/city";
      } else {
        // For other users, show municipality data
        endpoint = "/geojson/city";
      }
      
      const response = await api.get(endpoint);
      setGeojsonData(response.data);
      setError(null);
    } catch (err) {
      handleErrorSilently("Error fetching GeoJSON data:", err);

      // Handle authorization errors specifically
      if (err.response?.status === 403) {
        setError(
          "Access denied: You don't have permission to view this map data."
        );
      } else if (err.response?.status === 401) {
        setError("Authentication required. Please log in again.");
      } else if (err.response?.status === 404) {
        setError("Map data not found for your area.");
      } else {
        setError("Failed to load map data. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to fit map to GeoJSON bounds
  const fitMapToData = (data) => {
    if (data && data.features && data.features.length > 0 && mapRef.current) {
      const map = mapRef.current;
      const geoJsonLayer = L.geoJSON(data);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
  };

  // Effect to fit map when GeoJSON data changes
  useEffect(() => {
    if (geojsonData && !loading) {
      setTimeout(() => fitMapToData(geojsonData), 100);
    }
  }, [geojsonData, loading]);

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const { id, name, code, contact, email, area, gis_code, gis_name } =
        feature.properties;

      // Create popup content based on user type
      let popupContent = `
        <div class="p-2">
          <h3 class="font-semibold text-lg mb-1">${name}</h3>
          <p class="text-sm text-gray-600 mb-1">Area: ${area} km²</p>
      `;

      if (isBarangayUser) {
        // Barangay view - show barangay details
        popupContent += `
          <p class="text-sm text-gray-600 mb-1">Code: ${code || "N/A"}</p>
          <p class="text-sm text-gray-600 mb-1">Contact: ${contact || "N/A"}</p>
          <p class="text-sm text-gray-600 mb-1">Email: ${email || "N/A"}</p>
        `;
      }

      popupContent += `</div>`;

      // Add click handler
      layer.on("click", function() {
        setSelectedFeature(feature);
        // Show popup on click
        this.bindPopup(popupContent).openPopup();
      });

      // Add hover effects without popup
      layer.on("mouseover", function () {
        this.setStyle({
          weight: 3,
          color: isBarangayUser ? "#059669" : "#2563eb", // Green for barangay, blue for municipality
          fillOpacity: 0.7,
        });
      });

      layer.on("mouseout", function () {
        this.setStyle({
          weight: 2,
          color: isBarangayUser ? "#10b981" : "#3b82f6",
          fillOpacity: 0.3,
        });
      });
    }
  };

  const geoJSONStyle = {
    weight: 2,
    color: isBarangayUser ? "#10b981" : "#3b82f6", // Green for barangay, blue for municipality
    fillColor: isBarangayUser ? "#34d399" : "#60a5fa",
    fillOpacity: 0.3,
    opacity: 1,
  };

  const getMapTitle = () => {
    if (isBarangayUser) return "Barangay Map";
    if (isMunicipalityUser) return "Municipality Map";
    return "Geographical Map";
  };

  const getMapDescription = () => {
    if (isBarangayUser)
      return "Interactive map showing your barangay boundary and household locations";
    if (isMunicipalityUser)
      return "Interactive map of the municipality with barangay boundaries and household locations";
    return "Interactive geographical mapping system";
  };

  const getLegendItems = () => {
    const items = [
      {
        color: isBarangayUser ? "#10b981" : "#3b82f6",
        label: `${isBarangayUser ? "Barangay" : "Municipality"} Boundaries`,
      },
      {
        color: isBarangayUser ? "#34d399" : "#60a5fa",
        opacity: 0.3,
        label: `${isBarangayUser ? "Barangay" : "Municipality"} Areas`,
      },
      { icon: "📍", label: "Click to select area" },
    ];

    if (showHouseholds) {
      items.push({ icon: "🔴", label: "Household locations" });
    }

    return items;
  };

  // Parse household coordinates from GeoJSON
  const parseHouseholdCoordinates = (geomString) => {
    try {
      const geom = JSON.parse(geomString);
      if (geom.type === "Point" && geom.coordinates) {
        const [lng, lat] = geom.coordinates;
        return [lat, lng]; // Leaflet expects [lat, lng]
      }
    } catch (error) {
      handleErrorSilently("Error parsing household coordinates:", error);
    }
    return null;
  };

  // Handle view details button click
  const handleViewDetails = async (household) => {
    try {
      setLoadingHouseholdDetails(true);
      logger.debug("Fetching household details for ID:", household.household_id);
      logger.debug("Current household data from map:", household);

      // Fetch complete household information using the household ID
      const response = await api.get(`/${household.household_id}/household`);
      const fullHouseholdData = response.data.data;

      // Check if we have the required data
      if (!fullHouseholdData) {
        handleErrorSilently("No household data received from API");
        throw new Error("No household data received");
      }

      setSelectedHousehold(fullHouseholdData);
      setHouseholdDialogOpen(true);

      // Hide the map when dialog opens
      if (mapRef.current) {
        const mapElement = mapRef.current;
        if (mapElement && mapElement._container) {
          mapElement._container.style.display = "none";
        }
      }
    } catch (error) {
      handleErrorSilently("Error fetching household details:", error);

      // Fallback to using the simplified data if the API call fails
      logger.debug("Using fallback household data:", household);
      setSelectedHousehold(household);
      setHouseholdDialogOpen(true);

      // Hide the map when dialog opens
      if (mapRef.current) {
        const mapElement = mapRef.current;
        if (mapElement && mapElement._container) {
          mapElement._container.style.display = "none";
        }
      }
    } finally {
      setLoadingHouseholdDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{getMapTitle()}</h1>
        </div>
        <Card>
          <CardContent>
            <LoadingSpinner message="Loading map data..." variant="default" size="default" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{getMapTitle()}</h1>
        </div>
        <Card>
          <CardContent>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Info className="h-10 w-10 mx-auto text-red-500 mb-3" />
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Error Loading Map</h3>
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <Button size="sm" onClick={fetchGeoJSONData} className="gap-2">
                  <Loader2 className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{getMapTitle()}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{getMapDescription()}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Badge variant="outline" className="text-xs self-center">
              {geojsonData?.features?.length || 0} {isBarangayUser ? "Barangays" : "Areas"}
            </Badge>
            <Badge variant="outline" className="text-xs self-center">
              <Home className="h-3 w-3 mr-1" />
              {householdLocations.length} Households
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHouseholds(!showHouseholds)}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              {showHouseholds ? "Hide" : "Show"} Households
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchGeoJSONData(); fetchHouseholdLocations(); }}
              className="gap-2"
            >
              <Layers className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Map Container */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[400px] sm:h-[500px] lg:h-[600px] w-full">
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                ref={mapRef}
              >
                <ZoomControl position="bottomright" />

                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="OpenStreetMap">
                    <TileLayer
                      attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maxZoom={22}
                    />
                  </LayersControl.BaseLayer>

                  <LayersControl.BaseLayer name="Satellite">
                    <TileLayer
                      attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={22}
                    />
                  </LayersControl.BaseLayer>

                  <LayersControl.BaseLayer name="Terrain">
                    <TileLayer
                      attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                      maxZoom={17}
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {geojsonData && (
                  <GeoJSON
                    data={geojsonData}
                    style={geoJSONStyle}
                    onEachFeature={onEachFeature}
                  />
                )}

                {/* Household Markers */}
                {showHouseholds &&
                  householdLocations.map((household) => {
                    const coordinates = parseHouseholdCoordinates(
                      household.geom
                    );
                    if (!coordinates) return null;

                    return (
                      <Marker
                        key={household.household_id}
                        position={coordinates}
                        icon={createHouseholdIcon()}
                      >
                        <Popup>
                          <div
                            style={{
                              padding: "12px",
                              fontFamily:
                                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                              maxWidth: "250px",
                            }}
                          >
                            <div style={{ marginBottom: "6px" }}>
                              <span
                                style={{
                                  fontSize: "13px",
                                  color: "#6b7280",
                                  fontWeight: 500,
                                  marginRight: "4px",
                                }}
                              >
                                House Head:
                              </span>
                              <span
                                style={{
                                  fontSize: "14px",
                                  color: "#111827",
                                  fontWeight: 600,
                                }}
                              >
                                {household.house_head || "N/A"}
                              </span>
                            </div>
                            <div style={{ marginBottom: "12px" }}>
                              <span
                                style={{
                                  fontSize: "13px",
                                  color: "#6b7280",
                                  fontWeight: 500,
                                  marginRight: "4px",
                                }}
                              >
                                Residents:
                              </span>
                              <span
                                style={{
                                  fontSize: "14px",
                                  color: "#111827",
                                  fontWeight: 600,
                                }}
                              >
                                {household.resident_count || 0}
                              </span>
                            </div>
                            <button
                              onClick={() => handleViewDetails(household)}
                              disabled={loadingHouseholdDetails}
                              style={{
                                backgroundColor: loadingHouseholdDetails
                                  ? "#9ca3af"
                                  : "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                padding: "8px 12px",
                                fontSize: "12px",
                                fontWeight: "500",
                                cursor: loadingHouseholdDetails
                                  ? "not-allowed"
                                  : "pointer",
                                width: "100%",
                                transition: "background-color 0.2s",
                              }}
                              onMouseOver={(e) => {
                                if (!loadingHouseholdDetails) {
                                  e.target.style.backgroundColor = "#2563eb";
                                }
                              }}
                              onMouseOut={(e) => {
                                if (!loadingHouseholdDetails) {
                                  e.target.style.backgroundColor = "#3b82f6";
                                }
                              }}
                            >
                              {loadingHouseholdDetails
                                ? <LoadingSpinner message="Loading..." variant="default" size="sm" compact={true} />
                                : "View Details"}
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
              </MapContainer>
            </div>
          </CardContent>
        </Card>

        {/* Map Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-800">Map Legend</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-4">
              {getLegendItems().map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {item.icon ? (
                    <span className="text-sm">{item.icon}</span>
                  ) : (
                    <div
                      className="w-3 h-3 border-2 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color, opacity: item.opacity || 1 }}
                    />
                  )}
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Household Details Dialog */}
        <HouseholdViewDialog
          household={selectedHousehold}
          open={householdDialogOpen}
          onOpenChange={(open) => {
            setHouseholdDialogOpen(open);
            // Show the map when dialog closes
            if (!open && mapRef.current) {
              const mapElement = mapRef.current;
              if (mapElement && mapElement._container) {
                mapElement._container.style.display = "block";
              }
            }
          }}
          onEdit={() => {
            // Refresh household data when dialog closes
            fetchHouseholdLocations();
          }}
          onEditInfo={() => {}} // No action
          onEditDetails={() => {}} // No action
          onEditFamilies={() => {}} // No action
          onEditLocation={() => {}} // No action
          onEditImages={() => {}} // No action
          onDelete={() => {}} // No action
          loading={loadingHouseholdDetails}
          hideActions={true}
        />
    </div>
  );
};

export default GeoMapPage;
