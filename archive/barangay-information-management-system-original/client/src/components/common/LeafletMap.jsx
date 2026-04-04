import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
  useMap,
  LayersControl,
} from "react-leaflet";
import logger from "@/utils/logger";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// Default center is Borongan City
const DEFAULT_CENTER = [11.6081, 125.4311];

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

function AreaZoomer({ center, area, defaultZoom }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    let zoom = defaultZoom;
    if (area) {
      if (area < 400) zoom = 19;
      else if (area < 1000) zoom = 19;
      else if (area < 5000) zoom = 18;
    }
    map.setView(center, zoom);
  }, [center, area, defaultZoom, map]);
  return null;
}

function ClickHandler({ onSelect, onMapClick }) {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e) => {
      if (onSelect) {
        onSelect([e.latlng.lat, e.latlng.lng]);
      }
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [map, onSelect, onMapClick]);

  return null;
}

export default function LeafletMap({
  center = DEFAULT_CENTER,
  zoom = 15,
  marker = true,
  markers = [],
  selectedLocation,
  area,
  popupData,
  onSelect,
  onMapClick,
  readOnly = false,
}) {
  const square = getSquarePolygon(center, area);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      maxZoom={22}
      scrollWheelZoom={true}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "0.75rem",
        minHeight: 250,
      }}
      className="rounded-lg"
    >
      <AreaZoomer center={center} area={area} defaultZoom={zoom} />
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={22}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite (Esri)">
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={22}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="CartoDB Positron">
          <TileLayer
            attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={22}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      {(onSelect || onMapClick) && !readOnly && (
        <ClickHandler onSelect={onSelect} onMapClick={onMapClick} />
      )}

      {square && (
        <Polygon
          positions={square}
          pathOptions={{
            color: "#60a5fa",
            weight: 2,
            fillColor: "#93c5fd",
            fillOpacity: 0.15,
          }}
        />
      )}

      {/* Render markers array */}
      {markers.map((markerData, index) => {
        const position = Array.isArray(markerData)
          ? markerData
          : [markerData.lat, markerData.lng];
        const icon =
          markerData.icon === "location" ? locationPinIcon : housePinIcon;
        const popup = markerData.popup || "Selected Location";

        return (
          <Marker key={index} position={position} icon={icon}>
            <Popup>
              {typeof popup === "string" ? (
                popup
              ) : (
                <div className="space-y-1">
                  <div className="font-semibold">{popup.houseHead}</div>
                  <div className="text-xs text-muted-foreground">
                    {popup.houseNumber}
                    {popup.purok ? `, ${popup.purok}` : ""}
                  </div>
                </div>
              )}
            </Popup>
          </Marker>
        );
      })}

      {/* Render selected location marker */}
              {logger.debug("LeafletMap selectedLocation:", selectedLocation)}
      {selectedLocation &&
        Array.isArray(selectedLocation) &&
        selectedLocation.length === 2 && (
          <Marker position={selectedLocation} icon={housePinIcon}>
            <Popup>
              {popupData ? (
                <div className="space-y-1">
                  <div className="font-semibold">
                    {popupData.houseHead || "Selected Location"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {popupData.houseNumber}
                    {popupData.purok ? `, ${popupData.purok}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedLocation[0].toFixed(6)},{" "}
                    {selectedLocation[1].toFixed(6)}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-semibold">Selected Location</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedLocation[0].toFixed(6)},{" "}
                    {selectedLocation[1].toFixed(6)}
                  </div>
                </div>
              )}
            </Popup>
          </Marker>
        )}

      {/* Render single marker if specified (only if no selectedLocation) */}
      {marker && !markers.length && !selectedLocation && (
        <Marker position={center} icon={housePinIcon}>
          <Popup>
            {popupData ? (
              <div className="space-y-1">
                <div className="font-semibold">{popupData.houseHead}</div>
                <div className="text-xs text-muted-foreground">
                  {popupData.houseNumber}
                  {popupData.purok ? `, ${popupData.purok}` : ""}
                </div>
              </div>
            ) : (
              "Selected Location"
            )}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
