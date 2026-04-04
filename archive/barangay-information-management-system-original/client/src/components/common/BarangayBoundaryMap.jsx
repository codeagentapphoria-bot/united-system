import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  LayersControl,
  Marker,
  Popup,
  Polygon,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import api from "@/utils/api";
import LeafletMap from "./LeafletMap";

// Function to create a square polygon around a center point
function getSquarePolygon(center, area) {
  if (!center || !area) return null;
  const side = Math.sqrt(area);
  const lat = center[0];
  const lng = center[1];
  const dLat = side / 2 / 111320;
  const dLng = side / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat - dLat, lng - dLng],
    [lat - dLat, lng + dLng],
    [lat + dLat, lng + dLng],
    [lat + dLat, lng - dLng],
    [lat - dLat, lng - dLng],
  ];
}

const BarangayBoundaryMap = ({
  center = [11.6081, 125.4311],
  zoom = 15,
  marker = true,
  markers = [],
  area,
  popupData,
  onSelect,
  onMapClick,
  readOnly = false,
  barangayId = null,
  showMarker = true,
}) => {
  const [barangayBoundary, setBarangayBoundary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);

  // Fetch barangay boundary when barangayId is provided
  useEffect(() => {
    const fetchBarangayBoundary = async () => {
      if (!barangayId) {
        setBarangayBoundary(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/geojson/barangays/${barangayId}?type=barangay`);
        setBarangayBoundary(response.data);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching barangay boundary:", err);
}
        setError("Failed to load barangay boundary");
        setBarangayBoundary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBarangayBoundary();
  }, [barangayId]);

  // Custom component to handle auto-zoom to barangay boundary
  const BarangayZoomer = () => {
    const map = useMap();

    useEffect(() => {
      // Always zoom to barangay boundary on first load if boundary data is available
      if (
        barangayBoundary &&
        barangayBoundary.features &&
        barangayBoundary.features.length > 0
      ) {
        // Add a small delay to ensure map is fully loaded
        setTimeout(() => {
          // Fit map to barangay boundary
          const geoJsonLayer = L.geoJSON(barangayBoundary);
          const bounds = geoJsonLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [20, 20],
              maxZoom: 16, // Limit zoom level for better UX
            });
          }
        }, 100);
      }
    }, [barangayBoundary, map]);

    return null;
  };

  // Custom component to handle zooming to selected location and area
  const LocationZoomer = () => {
    const map = useMap();

    useEffect(() => {
      // Only zoom to location if center coordinates are provided and valid
      if (
        center &&
        Array.isArray(center) &&
        center.length === 2 &&
        !isNaN(center[0]) &&
        !isNaN(center[1])
      ) {
        // If area is provided, fit the area polygon to the map
        if (area && area > 0) {
          const polygonPositions = getSquarePolygon(center, area);
          if (polygonPositions) {
            // Add a small delay to ensure the polygon is rendered
            setTimeout(() => {
              // Create a temporary polygon to get its bounds
              const tempPolygon = L.polygon(polygonPositions);
              const bounds = tempPolygon.getBounds();

              // Fit the map to show the entire area with some padding
              map.fitBounds(bounds, {
                padding: [20, 20],
                maxZoom: 18, // Limit maximum zoom for better UX
                animate: true,
                duration: 1,
              });
            }, 100);
            return;
          }
        }

        // If no area or area is 0, zoom to the center point
        let zoom = 20; // Maximum zoom level for household detail
        map.setView(center, zoom, {
          animate: true,
          duration: 1,
        });
      }
    }, [center, area, map]);

    return null;
  };

  // Custom component to handle map clicks
  const ClickHandler = () => {
    const map = useMap();

    useEffect(() => {
      if (readOnly || !onSelect) return;

      const handleClick = (e) => {
        const { lat, lng } = e.latlng;
        onSelect([lat, lng]);
        setClickedLocation([lat, lng]);

        // Provide visual feedback - briefly zoom to the clicked location
        const currentZoom = map.getZoom();
        const targetZoom = Math.max(currentZoom, 16); // Ensure we zoom in enough

        map.setView([lat, lng], targetZoom, {
          animate: true,
          duration: 0.5,
        });

        // Clear the temporary marker after 2 seconds
        setTimeout(() => {
          setClickedLocation(null);
        }, 2000);
      };

      map.on("click", handleClick);

      return () => {
        map.off("click", handleClick);
      };
    }, [map, onSelect, readOnly]);

    return null;
  };

  // Style for barangay boundary
  const boundaryStyle = {
    fillColor: "#3b82f6",
    weight: 2,
    opacity: 1,
    color: "#1d4ed8",
    fillOpacity: 0.1,
  };

  // Custom house icon using DivIcon with SVG
  const housePinIcon = L.divIcon({
    html: `
      <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#shadow)">
          <path d="M16 3C10.477 3 6 7.477 6 13c0 6.075 7.09 13.09 9.293 15.293a1 1 0 0 0 1.414 0C18.91 26.09 26 19.075 26 13c0-5.523-4.477-10-10-10z" fill="#2563eb"/>
          <circle cx="16" cy="13" r="7" fill="#fff"/>
          <g transform="translate(9,6)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5L12 4L21 10.5" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 10.5V19C5 19.5523 5.44772 20 6 20H18C18.5523 20 19 19.5523 19 19V10.5" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <rect x="9" y="14" width="6" height="6" rx="1" fill="#2563eb"/>
            </svg>
          </g>
        </g>
        <defs>
          <filter id="shadow" x="0" y="0" width="32" height="32" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.15"/>
          </filter>
        </defs>
      </svg>
    `,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 35],
    popupAnchor: [0, -20],
  });

  // Custom location pin icon for selected locations
  const locationPinIcon = L.divIcon({
    html: `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#shadow)">
          <circle cx="16" cy="16" r="12" fill="#dc2626"/>
          <circle cx="16" cy="16" r="6" fill="#fff"/>
          <circle cx="16" cy="16" r="3" fill="#dc2626"/>
        </g>
        <defs>
          <filter id="shadow" x="0" y="0" width="32" height="32" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.15"/>
          </filter>
        </defs>
      </svg>
    `,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -16],
  });

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <LayersControl position="topright">
        {/* Base layers */}
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Terrain">
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>

        {/* Barangay boundary overlay with toggle */}
        {barangayBoundary && (
          <LayersControl.Overlay checked name="Barangay Boundary">
            <GeoJSON data={barangayBoundary} style={boundaryStyle} />
          </LayersControl.Overlay>
        )}
      </LayersControl>

      {/* Auto-zoom component */}
      <BarangayZoomer />

      {/* Location zoomer component */}
      <LocationZoomer />

      {/* Click handler component */}
      <ClickHandler />

      {/* Display house marker if coordinates are set and showMarker is true */}
      {showMarker &&
        center &&
        Array.isArray(center) &&
        center.length === 2 &&
        !isNaN(center[0]) &&
        !isNaN(center[1]) && (
          <Marker position={center} icon={housePinIcon}>
            {popupData && (
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold text-lg mb-1">
                    {popupData.houseHead || "Household"}
                  </h3>
                  {popupData.houseNumber && (
                    <p className="text-sm text-gray-600 mb-1">
                      House #: {popupData.houseNumber}
                    </p>
                  )}
                  {popupData.purok && (
                    <p className="text-sm text-gray-600 mb-1">
                      Purok: {popupData.purok}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    Coordinates: {center[0].toFixed(6)}, {center[1].toFixed(6)}
                  </p>
                </div>
              </Popup>
            )}
          </Marker>
        )}

      {/* Display temporary click marker */}
      {clickedLocation && (
        <Marker position={clickedLocation} icon={locationPinIcon}>
          <Popup>
            <div className="p-2">
              <p className="text-sm font-medium text-gray-800">
                Location Selected
              </p>
              <p className="text-xs text-gray-600">
                {clickedLocation[0].toFixed(6)}, {clickedLocation[1].toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Display area polygon if area is provided */}
      {area &&
        center &&
        Array.isArray(center) &&
        center.length === 2 &&
        !isNaN(center[0]) &&
        !isNaN(center[1]) && (
          <Polygon
            positions={getSquarePolygon(center, area)}
            color="#2563eb"
            fillColor="#3b82f6"
            fillOpacity={0.2}
            weight={2}
          />
        )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">
              Loading barangay boundary...
            </p>
          </div>
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <p className="text-red-600 text-sm">{error}</p>
            <p className="text-xs text-gray-500 mt-1">Using default map view</p>
          </div>
        </div>
      )}
    </MapContainer>
  );
};

export default BarangayBoundaryMap;
