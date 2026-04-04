import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Home, Loader2, RefreshCw } from "lucide-react";
import { useBarangay } from "@/contexts/BarangayContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LoadingSpinner from "@/components/common/LoadingSpinner";

export function BarangaySelector() {
  const {
    selectedBarangay,
    availableBarangays,
    getBarangayStats,
    setSelectedBarangay,
    clearBarangaySelection,
    loading,
    error,
    refetchBarangays,
  } = useBarangay();

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2">
                 <LoadingSpinner message="Loading..." variant="default" size="sm" compact={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-2">
        <span className="text-xs sm:text-sm text-destructive">{error}</span>
        <Button variant="ghost" size="sm" onClick={refetchBarangays} className="h-8 w-8 sm:h-9 sm:w-9 p-0">
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
        </Button>
      </div>
    );
  }

  if (!selectedBarangay) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
          >
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
            <span className="hidden sm:inline">Select Barangay</span>
            <span className="sm:hidden">Select</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72 sm:w-80 bg-background border border-border shadow-medium max-h-96 overflow-y-auto"
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs sm:text-sm font-medium text-foreground">
              Available Barangays
            </p>
            <p className="text-xs text-muted-foreground">
              Choose your barangay to view local information
            </p>
          </div>

          <div className="py-1">
            {availableBarangays.map((barangay) => {
              const stats = getBarangayStats(barangay.id);
              return (
                <DropdownMenuItem
                  key={barangay.id}
                  onClick={() => setSelectedBarangay(barangay)}
                  className="cursor-pointer hover:bg-accent p-2 sm:p-3"
                >
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                        <span className="font-medium text-xs sm:text-sm">{barangay.name}</span>
                        {barangay.code && (
                          <Badge variant="outline" className="text-xs">
                            {barangay.code}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>
                          {stats.residents.toLocaleString()} residents
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Home className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span>
                          {stats.households.toLocaleString()} households
                        </span>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const stats = getBarangayStats(selectedBarangay.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
          <span className="max-w-20 sm:max-w-32 truncate">{selectedBarangay.name}</span>
          {selectedBarangay.code && (
            <Badge variant="secondary" className="text-xs">
              {selectedBarangay.code}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 sm:w-80">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs sm:text-sm font-medium">Switch Barangay</p>
        </div>
        <div className="py-1">
          {availableBarangays
            .filter((b) => b.id !== selectedBarangay.id)
            .map((barangay) => {
              const barangayStats = getBarangayStats(barangay.id);
              return (
                <DropdownMenuItem
                  key={barangay.id}
                  onClick={() => setSelectedBarangay(barangay)}
                  className="cursor-pointer hover:bg-accent p-2 sm:p-3"
                >
                  <div className="flex flex-col w-full">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="font-medium text-xs sm:text-sm">{barangay.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground ml-4 sm:ml-6">
                      {barangayStats.residents.toLocaleString()} residents
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={clearBarangaySelection}
          className="cursor-pointer text-destructive hover:bg-destructive/10 p-2 sm:p-3"
        >
          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
          <span className="text-xs sm:text-sm">Clear Selection</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
