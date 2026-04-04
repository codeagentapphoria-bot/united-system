import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  MapPin, 
  Users, 
  User, 
  Phone, 
  Mail, 
  Home, 
  Loader2, 
  Search, 
  X,
  Check
} from "lucide-react";
import { useBarangay } from "@/contexts/BarangayContext";

export function BarangaySelection() {
  const { availableBarangays, setSelectedBarangay, getBarangayStats, loading } =
    useBarangay();
  const [selectedId, setSelectedId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query with 1 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter barangays based on debounced search query
  const filteredBarangays = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return availableBarangays;
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    return availableBarangays.filter(barangay => 
      barangay.name.toLowerCase().includes(query) ||
      (barangay.code && barangay.code.toLowerCase().includes(query)) ||
      (barangay.captain && barangay.captain.toLowerCase().includes(query)) ||
      (barangay.address && barangay.address.toLowerCase().includes(query))
    );
  }, [availableBarangays, debouncedSearchQuery]);

  const selectedBarangayData = availableBarangays.find(
    (b) => b.id === selectedId
  );

  const handleConfirmSelection = () => {
    if (selectedBarangayData) {
      setSelectedBarangay(selectedBarangayData);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-3 sm:p-4">
        <div className="text-center">
          <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary mx-auto mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            Loading Barangay Data
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Please wait while we fetch the latest information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      {/* Fixed Header with Selection Info */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 shadow-sm">
        <div className="w-full max-w-7xl mx-auto p-3 sm:p-4">
          {/* Header */}
          <div className="text-center mb-3 sm:mb-4 animate-fade-in">
            <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-3 sm:mb-4">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="text-xs sm:text-sm font-medium">
                Barangay Selection Required
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
              Welcome to Your Digital Barangay
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Please select your barangay to access personalized services and
              information
            </p>
          </div>

          {/* Search and Filter Section */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-center max-w-2xl mx-auto mb-3 sm:mb-4">
            <div className="relative flex-1 w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 sm:w-4 sm:h-4" />
              <Input
                type="text"
                placeholder="Search by name, code, captain, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 w-full text-xs sm:text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 p-1 h-5 w-5 sm:h-6 sm:w-6"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              )}
            </div>
            

          </div>

          {/* Results Count */}
          <div className="text-xs sm:text-sm text-muted-foreground text-center mb-3 sm:mb-4">
            Showing {filteredBarangays.length} of {availableBarangays.length} barangays
            {debouncedSearchQuery && (
              <span className="ml-2 text-primary">
                for "{debouncedSearchQuery}"
              </span>
            )}
            {searchQuery !== debouncedSearchQuery && searchQuery && (
              <span className="ml-2 text-muted-foreground">
                (searching...)
              </span>
            )}
          </div>

          {/* Selected Barangay Info - Fixed at Top */}
          {selectedBarangayData && (
            <div className="animate-slide-up mb-3 sm:mb-4">
              <Card className="p-3 sm:p-4 bg-gradient-card border-primary/20">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">
                        {selectedBarangayData.name}
                      </h3>
                      {selectedBarangayData.code && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedBarangayData.code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleConfirmSelection}
                    className="px-4 sm:px-6 text-xs sm:text-sm"
                  >
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">Continue to {selectedBarangayData.name}</span>
                    <span className="sm:hidden">Continue</span>
                  </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                  {(() => {
                    const stats = getBarangayStats(selectedBarangayData.id);
                    return (
                      <>
                        <div>
                          <div className="text-sm sm:text-lg font-bold text-primary">
                            {stats.residents.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Residents
                          </div>
                        </div>
                        <div>
                          <div className="text-sm sm:text-lg font-bold text-primary">
                            {stats.households.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Households
                          </div>
                        </div>
                        <div>
                          <div className="text-sm sm:text-lg font-bold text-primary">
                            {stats.families.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Families
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    {selectedBarangayData.captain && (
                      <>
                        <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                        <span className="text-muted-foreground">Captain:</span>
                        <span className="text-foreground">{selectedBarangayData.captain}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedBarangayData.contactNumber && (
                      <>
                        <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="text-foreground">{selectedBarangayData.contactNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* No Selection State */}
          {!selectedBarangayData && (
            <div className="text-center py-3 sm:py-4 mb-3 sm:mb-4">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Select a barangay to continue
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="p-3 sm:p-4">
        <div className="w-full max-w-7xl mx-auto">
          {/* No Results */}
          {filteredBarangays.length === 0 && debouncedSearchQuery && (
            <div className="text-center py-8 sm:py-12 animate-fade-in">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-muted flex items-center justify-center">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                No barangays found
              </h3>
              <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">
                Try searching with different keywords or clear your search
              </p>
              <Button variant="outline" onClick={clearSearch} className="text-xs sm:text-sm">
                Clear Search
              </Button>
            </div>
          )}

          {/* Loading State for Search */}
          {searchQuery !== debouncedSearchQuery && searchQuery && (
            <div className="text-center py-8 sm:py-12 animate-fade-in">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground animate-spin" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                Searching...
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                Please wait while we find matching barangays
              </p>
            </div>
          )}

          {/* Barangay Cards */}
          {filteredBarangays.length > 0 && !(searchQuery !== debouncedSearchQuery && searchQuery) && (
            <div className="space-y-3 sm:space-y-4 animate-slide-up">
              {filteredBarangays.map((barangay, index) => {
                const stats = getBarangayStats(barangay.id);
                const isSelected = selectedId === barangay.id;
                
                return (
                  <Card
                    key={barangay.id}
                    className={`p-3 sm:p-4 cursor-pointer transition-all duration-300 hover-lift ${
                      isSelected
                        ? "ring-2 ring-primary bg-primary/5 border-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedId(barangay.id)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <MapPin className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">
                            {barangay.name}
                          </h3>
                          {barangay.code && (
                            <Badge variant="outline" className="text-xs">
                              {barangay.code}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>{stats.residents.toLocaleString()} residents</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Home className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>{stats.households.toLocaleString()} households</span>
                          </div>
                          {barangay.captain && (
                            <div className="flex items-center gap-1">
                              <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span>Capt. {barangay.captain}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <span className="text-xs">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
