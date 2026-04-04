import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Popup,
  Marker,
  LayersControl,
  ZoomControl,
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
  Phone,
  Mail,
  RefreshCw,
  Landmark,
  School,
  Church,
  Store,
  AlertCircle,
} from "lucide-react";
import api from "@/utils/api";
import { useBarangay } from "@/contexts/BarangayContext";
import { handleErrorSilently } from "@/utils/errorHandler";
import logger from "@/utils/logger";

// Default fallback coordinates — override via environment or barangay setup
const DEFAULT_CENTER = [11.6081, 125.4311];
const DEFAULT_ZOOM = 12;

// Removed sample landmarks and facilities

const BarangayGeoMap = () => {
  const [geojsonData, setGeojsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const mapRef = useRef(null);
  const { selectedBarangay, availableBarangays, getBarangayStats } =
    useBarangay();

  logger.debug("selectedBarangay", selectedBarangay);

  useEffect(() => {
    if (selectedBarangay) {
      fetchBarangayGeoJSONData();
    } else {
      // Don't show any data when no barangay is selected
      setGeojsonData(null);
      setLoading(false);
    }
  }, [selectedBarangay]);

  const fetchBarangayGeoJSONData = async () => {
    try {
      setLoading(true);
      // Fetch specific barangay GeoJSON data
      const response = await api.get(
        `/public/geojson/barangays/${selectedBarangay.id}?type=barangay`
      );
      logger.debug("Barangay GeoJSON response:", response);
      setGeojsonData(response.data);
      setError(null);
    } catch (err) {
      handleErrorSilently("Error fetching barangay GeoJSON data:", err);
      // Don't fallback to all barangays - show error instead
      setError("Failed to load barangay boundary data");
      setGeojsonData(null);
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

      // Find corresponding barangay data
      const barangayData = availableBarangays.find(
        (b) => b.id === parseInt(id) || b.id === id
      );
      const stats = barangayData ? getBarangayStats(barangayData.id) : null;

      // Create popup content
      let popupContent = `
        <div class="p-3 min-w-[250px]">
          <h3 class="font-semibold text-lg mb-2 text-gray-800">${name}</h3>
          <div class="space-y-2 text-sm">
      `;

      if (code) {
        popupContent += `<p class="text-gray-600"><strong>Code:</strong> ${code}</p>`;
      }

      if (area) {
        popupContent += `<p class="text-gray-600"><strong>Area:</strong> ${area} km²</p>`;
      }

      if (barangayData) {
        if (barangayData.captain) {
          popupContent += `<p class="text-gray-600"><strong>Captain:</strong> ${barangayData.captain}</p>`;
        }
        if (barangayData.contactNumber) {
          popupContent += `<p class="text-gray-600"><strong>Contact:</strong> ${barangayData.contactNumber}</p>`;
        }
        if (barangayData.email) {
          popupContent += `<p class="text-gray-600"><strong>Email:</strong> ${barangayData.email}</p>`;
        }
        if (barangayData.address) {
          popupContent += `<p class="text-gray-600"><strong>Address:</strong> ${barangayData.address}</p>`;
        }
      }

      if (stats) {
        popupContent += `
          <div class="mt-3 pt-3 border-t border-gray-200">
            <div class="grid grid-cols-3 gap-2 text-center">
              <div>
                <div class="font-bold text-blue-600">${stats.residents.toLocaleString()}</div>
                <div class="text-xs text-gray-500">Residents</div>
              </div>
              <div>
                <div class="font-bold text-green-600">${stats.households.toLocaleString()}</div>
                <div class="text-xs text-gray-500">Households</div>
              </div>
              <div>
                <div class="font-bold text-purple-600">${stats.families.toLocaleString()}</div>
                <div class="text-xs text-gray-500">Families</div>
              </div>
            </div>
          </div>
        `;
      }

      popupContent += `
            <div class="mt-3 pt-3 border-t border-gray-200">
              <p class="text-xs text-gray-500">
                <strong>Coordinates:</strong> ${
                  feature.properties.latitude?.toFixed(6) || "N/A"
                }, ${feature.properties.longitude?.toFixed(6) || "N/A"}
              </p>
            </div>
          </div>
        </div>
      `;

      // Add popup
      layer.bindPopup(popupContent);

      // Add click handler
      layer.on("click", () => {
        setSelectedFeature(feature);
      });

      // Add hover effects
      layer.on("mouseover", function () {
        this.setStyle({
          weight: 3,
          color: "#2563eb",
          fillOpacity: 0.7,
        });
      });

      layer.on("mouseout", function () {
        this.setStyle({
          weight: 2,
          color: "#3b82f6",
          fillOpacity: 0.3,
        });
      });
    }
  };

  const geoJSONStyle = {
    weight: 2,
    color: "#3b82f6",
    fillColor: "#60a5fa",
    fillOpacity: 0.3,
    opacity: 1,
  };

  const getMapTitle = () => {
    if (selectedBarangay) {
      return `${selectedBarangay.name} Barangay Map`;
    }
    return "Municipality Map";
  };

  const getMapDescription = () => {
    if (selectedBarangay) {
      return `Interactive map of ${selectedBarangay.name} with boundaries, facilities, and landmarks`;
    }
    return "Interactive map of the municipality with barangay boundaries and detailed information";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            {getMapTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg">Loading map data...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            {getMapTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-red-600 mb-2">{error}</div>
              <Button
                onClick={fetchBarangayGeoJSONData}
                variant="outline"
                disabled={!selectedBarangay}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Facilities and landmarks removed
  // const facilities = selectedBarangay
  //   ? getBarangayFacilities(selectedBarangay.id)
  //   : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          {getMapTitle()}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{getMapDescription()}</p>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[600px] rounded-lg overflow-hidden border">
          <MapContainer
            center={
              selectedBarangay ? selectedBarangay.coordinates : DEFAULT_CENTER
            }
            zoom={selectedBarangay ? 15 : DEFAULT_ZOOM}
            className="w-full h-full"
            ref={mapRef}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="OpenStreetMap">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="ESRI Satellite">
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="ESRI Topo">
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
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

            {/* Facilities and Landmarks removed */}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-3">
            <Info className="w-4 h-4 text-blue-600 mr-2" />
            <h4 className="font-medium text-gray-800">Map Legend</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-600">
                {selectedBarangay
                  ? "Barangay Boundaries"
                  : "Municipality Boundaries"}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-300 rounded opacity-30"></div>
              <span className="text-sm text-gray-600">
                {selectedBarangay ? "Barangay Areas" : "Municipality Areas"}
              </span>
            </div>
            {/* Facilities and Landmarks legend removed */}
            <div className="flex items-center space-x-3">
              <span className="text-lg">📍</span>
              <span className="text-sm text-gray-600">
                Click to view details
              </span>
            </div>
          </div>
        </div>

        {/* Selected Feature Details */}
        {selectedFeature && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-800">
                {selectedFeature.properties.name}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFeature(null)}
              >
                ×
              </Button>
            </div>
            <div className="text-sm text-blue-700">
              <p>
                <strong>Code:</strong>{" "}
                {selectedFeature.properties.code || "N/A"}
              </p>
              <p>
                <strong>Area:</strong>{" "}
                {selectedFeature.properties.area || "N/A"}
              </p>
              {selectedFeature.properties.contact && (
                <p>
                  <strong>Contact:</strong> {selectedFeature.properties.contact}
                </p>
              )}
              {selectedFeature.properties.email && (
                <p>
                  <strong>Email:</strong> {selectedFeature.properties.email}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Barangay Selection Notice */}
        {!selectedBarangay && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <div>
                <h4 className="font-medium text-yellow-800">
                  Select a Barangay
                </h4>
                <p className="text-sm text-yellow-700">
                  Choose a barangay from the header selector to view detailed
                  facilities and landmarks for that specific area.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarangayGeoMap;
