import React, { useState, useEffect, useRef, useCallback } from "react";
import { handleErrorSilently } from "@/utils/errorHandler";
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "@/utils/api";

const MunicipalityBarangaysMap = React.memo(({
  onBarangaySelect,
  selectedBarangayId = null,
  municipalityId = null, // Can be municipality ID or code
  existingBarangayId = null, // For auto-highlighting existing barangay
  lazyLoad = false, // Add lazy loading option
}) => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loading, setLoading] = useState(!lazyLoad); // Don't show loading initially if lazy load
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(!lazyLoad); // Track if component is visible
  const geoJsonRef = useRef(null);
  const layerRefs = useRef(new Map());
  const dataCache = useRef(new Map()); // Simple cache for API responses
  const currentSelectedBarangayId = useRef(selectedBarangayId);
  const currentExistingBarangayId = useRef(existingBarangayId);
  const abortController = useRef(null); // For canceling requests

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazyLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const mapContainer = document.querySelector('.municipality-map-container');
    if (mapContainer) {
      observer.observe(mapContainer);
    }

    return () => observer.disconnect();
  }, [lazyLoad]);

  // Load data when municipality changes or becomes visible
  useEffect(() => {
    if (!municipalityId || (lazyLoad && !isVisible)) {
      return;
    }

    const fetchBarangaysGeoJson = async () => {
      // Cancel any ongoing request
      if (abortController.current) {
        abortController.current.abort();
      }

      // Create new abort controller
      abortController.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        const cacheKey = municipalityId;
        
        // Check if we have cached data for this municipality
        if (dataCache.current.has(cacheKey)) {
          setGeoJsonData(dataCache.current.get(cacheKey));
          setLoading(false);
          return;
        }

        // For settings and setup pages, we always want to show all barangays in the municipality
        // So we use the municipality code with type=municipality
        const endpoint = `/public/geojson/barangays/${cacheKey}?type=municipality&simplified=true`;
        

        
        const response = await api.get(endpoint, {
          signal: abortController.current.signal,
          timeout: 10000 // 10 second timeout
        });
        

        
        // Cache the response
        dataCache.current.set(cacheKey, response.data);
        setGeoJsonData(response.data);

      } catch (err) {
        // Don't log or set error state for canceled/aborted requests (normal in development)
        if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
          return;
        }
        handleErrorSilently(err, "Fetch Barangays GeoJSON");
        setError("Failed to load barangays map data");
      } finally {
        setLoading(false);
      }
    };

    fetchBarangaysGeoJson();

    // Cleanup function
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [municipalityId, isVisible, lazyLoad]);

  // Update refs when props change
  useEffect(() => {
    currentSelectedBarangayId.current = selectedBarangayId;
    currentExistingBarangayId.current = existingBarangayId;
  }, [selectedBarangayId, existingBarangayId]);

  // Apply highlighting whenever props change
  useEffect(() => {
    if (layerRefs.current.size === 0 || !geoJsonData) {
      return;
    }

    // Apply highlighting to all layers
    layerRefs.current.forEach((layer, gisCode) => {
      const isSelected = selectedBarangayId && gisCode === selectedBarangayId;
      const isExisting = existingBarangayId && gisCode === existingBarangayId;

      if (isSelected) {
        layer.setStyle({
          fillColor: "#3b82f6",
          weight: 3,
          opacity: 1,
          color: "#1d4ed8",
          fillOpacity: 0.7,
        });
      } else if (isExisting) {
        layer.setStyle({
          fillColor: "#8b5cf6",
          weight: 3,
          opacity: 1,
          color: "#6d28d9",
          fillOpacity: 0.6,
        });
      } else {
        layer.setStyle({
          fillColor: "#10b981",
          weight: 2,
          opacity: 1,
          color: "#059669",
          fillOpacity: 0.3,
        });
      }
    });
  }, [selectedBarangayId, existingBarangayId, geoJsonData]);

  const onEachFeature = useCallback((feature, layer) => {
    const properties = feature.properties;

    // Store layer reference for later updates
    layerRefs.current.set(properties.gis_code, layer);

    // Store GIS ID in the layer for hover callbacks
    layer.gisCode = properties.gis_code;

    // Apply initial styling
    const isSelected = selectedBarangayId && properties.gis_code === selectedBarangayId;
    const isExisting = existingBarangayId && properties.gis_code === existingBarangayId;

    if (isSelected) {
      layer.setStyle({
        fillColor: "#3b82f6",
        weight: 3,
        opacity: 1,
        color: "#1d4ed8",
        fillOpacity: 0.7,
      });
    } else if (isExisting) {
      layer.setStyle({
        fillColor: "#8b5cf6",
        weight: 3,
        opacity: 1,
        color: "#6d28d9",
        fillOpacity: 0.6,
      });
    } else {
      layer.setStyle({
        fillColor: "#10b981",
        weight: 2,
        opacity: 1,
        color: "#059669",
        fillOpacity: 0.3,
      });
    }

    // Add click and hover handlers
    layer.on({
      click: (e) => {
        const layer = e.target;
        onBarangaySelect({
          gis_code: properties.gis_code,
          name: properties.name,
        });
        
        // Show popup on click
        layer.bindPopup(popupContent).openPopup();
      },
      mouseover: (e) => {
        const layer = e.target;
        const gisCode = layer.gisCode;
        const isSelected = selectedBarangayId && gisCode === selectedBarangayId;
        const isExisting = existingBarangayId && gisCode === existingBarangayId;
        
        // Preserve the highlighting colors but increase weight and opacity
        if (isSelected) {
          layer.setStyle({
            fillColor: "#3b82f6",
            weight: 5,
            opacity: 1,
            color: "#1d4ed8",
            fillOpacity: 0.9,
          });
        } else if (isExisting) {
          layer.setStyle({
            fillColor: "#8b5cf6",
            weight: 5,
            opacity: 1,
            color: "#6d28d9",
            fillOpacity: 0.8,
          });
        } else {
          layer.setStyle({
            fillColor: "#10b981",
            weight: 4,
            opacity: 1,
            color: "#059669",
            fillOpacity: 0.5,
          });
        }
      },
      mouseout: (e) => {
        const layer = e.target;
        const gisCode = layer.gisCode;
        
        // Get current values from refs
        const isSelected = currentSelectedBarangayId.current && gisCode === currentSelectedBarangayId.current;
        const isExisting = currentExistingBarangayId.current && gisCode === currentExistingBarangayId.current;

        // Restore the original style
        if (isSelected) {
          layer.setStyle({
            fillColor: "#3b82f6",
            weight: 3,
            opacity: 1,
            color: "#1d4ed8",
            fillOpacity: 0.7,
          });
        } else if (isExisting) {
          layer.setStyle({
            fillColor: "#8b5cf6",
            weight: 3,
            opacity: 1,
            color: "#6d28d9",
            fillOpacity: 0.6,
          });
        } else {
          layer.setStyle({
            fillColor: "#10b981",
            weight: 2,
            opacity: 1,
            color: "#059669",
            fillOpacity: 0.3,
          });
        }
        
        // Close popup on mouseout
        layer.closePopup();
      },
    });

    // Add hover popup with barangay name
    const popupContent = `
      <div class="p-2">
        <h3 class="font-semibold text-lg">${properties.name}</h3>
      </div>
    `;

    // Add click handler for popup
    layer.on({
      click: (e) => {
        const layer = e.target;
        // Show popup on click
        layer.bindPopup(popupContent).openPopup();
      },
      mouseover: (e) => {
        const layer = e.target;
        const gisCode = layer.gisCode;
        const isSelected = selectedBarangayId && gisCode === selectedBarangayId;
        const isExisting = existingBarangayId && gisCode === existingBarangayId;
        
        // Preserve the highlighting colors but increase weight and opacity
        if (isSelected) {
          layer.setStyle({
            fillColor: "#3b82f6",
            weight: 5,
            opacity: 1,
            color: "#1d4ed8",
            fillOpacity: 0.9,
          });
        } else if (isExisting) {
          layer.setStyle({
            fillColor: "#8b5cf6",
            weight: 5,
            opacity: 1,
            color: "#6d28d9",
            fillOpacity: 0.8,
          });
        } else {
          layer.setStyle({
            fillColor: "#10b981",
            weight: 4,
            opacity: 1,
            color: "#059669",
            fillOpacity: 0.5,
          });
        }
      },
      mouseout: (e) => {
        const layer = e.target;
        const gisCode = layer.gisCode;
        
        // Get current values from refs
        const isSelected = currentSelectedBarangayId.current && gisCode === currentSelectedBarangayId.current;
        const isExisting = currentExistingBarangayId.current && gisCode === currentExistingBarangayId.current;

        // Restore the original style
        if (isSelected) {
          layer.setStyle({
            fillColor: "#3b82f6",
            weight: 3,
            opacity: 1,
            color: "#1d4ed8",
            fillOpacity: 0.7,
          });
        } else if (isExisting) {
          layer.setStyle({
            fillColor: "#8b5cf6",
            weight: 3,
            opacity: 1,
            color: "#6d28d9",
            fillOpacity: 0.6,
          });
        } else {
          layer.setStyle({
            fillColor: "#10b981",
            weight: 2,
            opacity: 1,
            color: "#059669",
            fillOpacity: 0.3,
          });
        }
        
        // Close popup on mouseout
        layer.closePopup();
      },
    });
  }, [selectedBarangayId, existingBarangayId, onBarangaySelect]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg municipality-map-container">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">
            {lazyLoad && !isVisible ? "Map will load when visible..." : "Loading barangays map..."}
          </p>
          {lazyLoad && !isVisible && (
            <p className="text-xs text-gray-500 mt-1">Scroll down to load map</p>
          )}
          {!lazyLoad && (
            <div className="mt-2 text-xs text-gray-500">
              <p>Optimizing map data...</p>
              <p>This may take a few seconds for large municipalities</p>
            </div>
          )}
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
          <p className="text-gray-600">No barangays data available</p>
        </div>
      </div>
    );
  }

  // Calculate center from GeoJSON features
  const center =
    geoJsonData.features.length > 0
      ? [11.6081, 125.4311] // Default fallback coordinates
      : [11.6081, 125.4311];

  return (
    <div className="space-y-2 municipality-map-container">
      <div className="h-64 rounded-lg overflow-hidden border">
        <MapContainer
          center={center}
          zoom={10}
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
          <span>Available Barangays</span>
        </div>
        {existingBarangayId && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>Current Barangay (Auto-highlighted)</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Selected Barangay</span>
        </div>
      </div>
    </div>
  );
});

MunicipalityBarangaysMap.displayName = 'MunicipalityBarangaysMap';

export default MunicipalityBarangaysMap;
