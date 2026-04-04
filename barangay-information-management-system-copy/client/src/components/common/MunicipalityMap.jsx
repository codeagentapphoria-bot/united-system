import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from "react-leaflet";
import { handleErrorSilently } from "@/utils/errorHandler";
import "leaflet/dist/leaflet.css";
import api from "@/utils/api";

const MunicipalityMap = ({
  onMunicipalitySelect,
  selectedMunicipalityId = null,
  existingMunicipalityId = null, // For auto-highlighting existing municipality
}) => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const geoJsonRef = useRef(null);
  const layerRefs = useRef(new Map());

  useEffect(() => {
    const fetchMunicipalitiesGeoJson = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch municipalities GeoJSON data
        const response = await api.get("/public/geojson/municipalities");
        setGeoJsonData(response.data);
      } catch (err) {
        handleErrorSilently(err, "Fetch Municipalities GeoJSON");
        setError("Failed to load municipalities map data");
      } finally {
        setLoading(false);
      }
    };

    fetchMunicipalitiesGeoJson();

    // Cleanup function to clear layer refs
    return () => {
      layerRefs.current.clear();
    };
  }, []);

  const getLayerStyle = useCallback(
    (gisCode) => {
      const isSelected = selectedMunicipalityId && gisCode === selectedMunicipalityId;
      const isExisting = existingMunicipalityId && gisCode === existingMunicipalityId;

      if (isSelected) {
        return {
          fillColor: "#3b82f6",
          weight: 3,
          opacity: 1,
          color: "#1d4ed8",
          fillOpacity: 0.7,
        };
      } else if (isExisting) {
        return {
          fillColor: "#8b5cf6",
          weight: 3,
          opacity: 1,
          color: "#6d28d9",
          fillOpacity: 0.6,
        };
      } else {
        return {
          fillColor: "#10b981",
          weight: 2,
          opacity: 1,
          color: "#059669",
          fillOpacity: 0.3,
        };
      }
    },
    [selectedMunicipalityId, existingMunicipalityId]
  );

  // Update styling when highlighting props change
  useEffect(() => {
    // Use setTimeout to ensure this runs after the GeoJSON component has rendered
    const timeoutId = setTimeout(() => {
      layerRefs.current.forEach((layer, gisCode) => {
        const style = getLayerStyle(gisCode);
        layer.setStyle(style);
      });
    }, 100); // Small delay to ensure GeoJSON has rendered

    return () => clearTimeout(timeoutId);
  }, [selectedMunicipalityId, existingMunicipalityId, geoJsonData, getLayerStyle]);

  const onEachFeature = (feature, layer) => {
    const properties = feature.properties;

    // Store layer reference for later updates
    layerRefs.current.set(properties.gis_municipality_code, layer);

    // Store GIS ID in the layer for hover callbacks
    layer.gisCode = properties.gis_municipality_code;

    // Apply initial styling
    const style = getLayerStyle(properties.gis_municipality_code);
    layer.setStyle(style);

    // Add click and hover handlers
    layer.on({
      click: (e) => {
        const layer = e.target;
        onMunicipalitySelect({
          gis_code: properties.gis_municipality_code,
          name: properties.name,
        });
        
        // Show popup on click
        const popupContent = `
          <div class="p-2">
            <h3 class="font-semibold text-lg">${properties.name}</h3>
          </div>
        `;
        layer.bindPopup(popupContent).openPopup();
      },
      mouseover: (e) => {
        const layer = e.target;
        // Only change opacity and weight on hover, preserve the color
        layer.setStyle({
          weight: 4,
          fillOpacity: 0.8,
        });
      },
      mouseout: (e) => {
        const layer = e.target;
        // Restore the original style using the same function
        const style = getLayerStyle(layer.gisCode);
        layer.setStyle(style);
      },
    });
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading municipalities map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (
    !geoJsonData ||
    !geoJsonData.features ||
    geoJsonData.features.length === 0
  ) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600">No municipalities data available</p>
        </div>
      </div>
    );
  }

  // Calculate center from GeoJSON features
  const center =
    geoJsonData.features.length > 0
      ? [11.6081, 125.4311] // Default to Eastern Samar
      : [11.6081, 125.4311];

  return (
    <div className="space-y-2">
      <div className="h-64 rounded-lg overflow-hidden border">
        <MapContainer
          center={center}
          zoom={8}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {geoJsonData && (
            <GeoJSON
              key={`geojson-${selectedMunicipalityId || "none"}-${
                existingMunicipalityId || "none"
              }`}
              ref={geoJsonRef}
              data={geoJsonData}
              onEachFeature={onEachFeature}
              style={{
                fillColor: "#10b981",
                weight: 2,
                opacity: 1,
                color: "#059669",
                fillOpacity: 0.3,
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Available Municipalities</span>
        </div>
        {existingMunicipalityId && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>Current Municipality (Auto-highlighted)</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Selected Municipality</span>
        </div>
      </div>
    </div>
  );
};

export default MunicipalityMap;
