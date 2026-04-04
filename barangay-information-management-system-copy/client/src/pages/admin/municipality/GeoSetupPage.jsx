/**
 * GeoSetupPage.jsx
 *
 * Municipality setup via GeoJSON map selection.
 *
 * Flow:
 *   1. Display all municipalities from the gis_municipality data as polygons on a map
 *   2. Admin clicks a municipality polygon
 *   3. Confirmation dialog shows how many barangays will be created
 *   4. On confirm → POST /api/setup/municipality → backend creates municipality + all barangays
 *   5. Redirect to dashboard
 */

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useAuth from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

const PROVINCE_CENTER = [11.5, 125.5]; // Eastern Samar approximate center
const PROVINCE_ZOOM = 9;

export default function GeoSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedMuni, setSelectedMuni] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [province, setProvince] = useState('');
  const [region, setRegion] = useState('');
  const [setupComplete, setSetupComplete] = useState(false);

  // Load setup status
  const { data: setupStatus } = useQuery({
    queryKey: ["setupStatus"],
    queryFn: () => apiClient.get("/setup/status").then((r) => r.data),
  });

  // Load GIS municipalities (from backend)
  const { data: gisData, isLoading: gisLoading } = useQuery({
    queryKey: ["gismunicipalities"],
    queryFn: () =>
      apiClient.get("/public/geojson/municipalities").then((r) => r.data),
  });

  // Setup mutation
  const setupMutation = useApiMutation(
    (payload) => apiClient.post("/setup/municipality", payload),
    {
      onSuccess: (data) => {
        toast({
          title: "Municipality configured!",
          description: `${data.data?.municipality?.name} — ${data.data?.barangays?.created} barangays created.`,
        });
        setSetupComplete(true);
        setTimeout(() => navigate("/admin/municipality/dashboard"), 2000);
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Setup failed",
          description: error.response?.data?.message || error.message,
        });
      },
    }
  );

  if (setupStatus?.configured && !setupComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 max-w-md p-6">
          <div className="text-5xl">✓</div>
          <h2 className="text-xl font-bold text-green-700">Municipality Already Configured</h2>
          <p className="text-gray-600">
            <strong>{setupStatus.municipality?.municipality_name}</strong> is already set up.
          </p>
          <button
            onClick={() => navigate("/admin/municipality/dashboard")}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleMunicipalityClick = (feature) => {
    setSelectedMuni({
      name: feature.properties.name || feature.properties.adm3_en,
      gisCode: feature.properties.adm3_pcode,
    });
    setIsConfirming(true);
  };

  const handleConfirmSetup = async () => {
    if (!selectedMuni) return;
    setupMutation.mutate({
      gis_municipality_code: selectedMuni.gisCode,
      province: province.trim(),
      region: region.trim(),
    });
    setIsConfirming(false);
  };

  const geoJsonStyle = (feature) => ({
    fillColor:
      selectedMuni?.gisCode === feature.properties.adm3_pcode
        ? "#3b82f6"
        : "#6ee7b7",
    fillOpacity: 0.5,
    color: "#1e3a5f",
    weight: 1.5,
  });

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.name || feature.properties.adm3_en || "Municipality";
    layer.bindTooltip(name, { permanent: false, direction: "center" });
    layer.on({
      click: () => handleMunicipalityClick(feature),
      mouseover: (e) => {
        e.target.setStyle({ fillColor: "#3b82f6", fillOpacity: 0.7 });
      },
      mouseout: (e) => {
        e.target.setStyle(geoJsonStyle(feature));
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white border-b p-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">Municipality Setup</h1>
        <p className="text-sm text-gray-500 mt-1">
          Click on your municipality on the map below to automatically configure it and create all its barangays.
        </p>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {gisLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">Loading map...</p>
          </div>
        ) : (
          <MapContainer
            center={PROVINCE_CENTER}
            zoom={PROVINCE_ZOOM}
            className="w-full h-full"
            style={{ minHeight: "calc(100vh - 120px)" }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {gisData && (
              <GeoJSON
                key={JSON.stringify(gisData)}
                data={gisData}
                style={geoJsonStyle}
                onEachFeature={onEachFeature}
              />
            )}
          </MapContainer>
        )}

        {/* Instruction overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow text-sm text-gray-700 pointer-events-none">
          Click on a municipality to select it
        </div>
      </div>

      {/* Confirmation Dialog */}
      {isConfirming && selectedMuni && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Confirm Municipality Setup</h2>
            <p className="text-gray-600">
              You selected: <strong className="text-primary">{selectedMuni.name}</strong>
            </p>
            <p className="text-sm text-gray-500">
              This will configure your BIMS instance for <strong>{selectedMuni.name}</strong> and
              automatically create all its barangays from the official GIS data.
            </p>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Province</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="e.g. Eastern Samar"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Region</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Region VIII (Eastern Visayas)"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700"
                onClick={() => setIsConfirming(false)}
                disabled={setupMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                onClick={handleConfirmSetup}
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? "Setting up..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success overlay */}
      {setupComplete && (
        <div className="fixed inset-0 bg-green-900/20 flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center space-y-4 max-w-sm w-full mx-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-xl font-bold text-green-700">Setup Complete!</h2>
            <p className="text-gray-600">Redirecting to dashboard...</p>
          </div>
        </div>
      )}
    </div>
  );
}
