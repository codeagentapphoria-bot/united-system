/**
 * BulkIDPage.jsx
 *
 * Municipality admin page to bulk download/print Resident ID cards.
 *
 * Features:
 *   - Filter by barangay
 *   - Preview resident count before download
 *   - Download as PDF (all IDs in one file)
 *   - Preview JSON list
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { getToken } from "@/constants/token";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const BIMS_API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function BulkIDPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBarangay, setSelectedBarangay] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  // Load barangay list for the municipality
  const { data: barangayData } = useQuery({
    queryKey: ["barangayList"],
    queryFn: () => apiClient.get("/list/barangay").then((r) => r.data),
  });

  // Preview count query
  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ["bulkIdPreview", selectedBarangay],
    queryFn: () =>
      apiClient
        .get("/setup/residents/bulk-id", {
          params: {
            format: "json",
            barangayId: selectedBarangay || undefined,
            status: "active",
          },
        })
        .then((r) => r.data),
    enabled: true,
  });

  const barangays = barangayData?.data?.data || [];
  const previewCount = previewData?.count || 0;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const params = new URLSearchParams({ format: "pdf", status: "active" });
      if (selectedBarangay) params.append("barangayId", selectedBarangay);

      const token = getToken();

      const response = await fetch(`${BIMS_API}/setup/residents/bulk-id?${params}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resident-ids-${selectedBarangay || "all"}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Downloaded successfully", description: `${previewCount} ID cards exported.` });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Bulk Resident ID Download</h1>
        <p className="text-sm text-gray-500 mt-1">
          Download resident ID cards as a printable PDF.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Filter Options</h2>

        <div>
          <label className="text-sm font-medium text-gray-600 block mb-1">Barangay</label>
          <select
            value={selectedBarangay}
            onChange={(e) => setSelectedBarangay(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Barangays</option>
            {barangays.map((b) => (
              <option key={b.id} value={b.id}>
                {b.barangay_name}
              </option>
            ))}
          </select>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Residents to export</p>
            <p className="text-xs text-gray-400">Active residents only</p>
          </div>
          <span className="text-3xl font-bold text-primary">
            {previewLoading ? "..." : previewCount}
          </span>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading || previewCount === 0}
          className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {isDownloading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating PDF...
            </span>
          ) : (
            `Download ${previewCount} ID Cards (PDF)`
          )}
        </button>
      </div>

      {/* Info */}
      <div className="text-sm text-gray-500 space-y-1">
        <p>• Each ID card is printed in standard CR80 card size (85.6mm × 54mm)</p>
        <p>• Only residents with status "Active" and an assigned Resident ID are included</p>
        <p>• Open the PDF and print with actual size (no scaling) for correct card dimensions</p>
      </div>
    </div>
  );
}
