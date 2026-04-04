import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

const ArchivesFilters = ({
  searchTerm,
  setSearchTerm,
  filters,
  onFilterChange,
  documentTypes = [],
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Debounce search input - update parent after 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchTerm, setSearchTerm]);


  const handleFilterChange = (key, value) => {
    // Convert "all" to empty string for filtering
    const filterValue = value === "all" ? "" : value;
    // Preserve existing filters when updating one
    onFilterChange({ ...filters, [key]: filterValue });
  };

  const hasActiveFilters = searchTerm || (filters.documentType && filters.documentType !== "");

  // Debounce effect for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [localSearchTerm, setSearchTerm]);

  // Update local search term when prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters & Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative space-y-2">
            <Label htmlFor="searchTerm">Search</Label>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search archives by title, description, or content..."
              value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Document Type Filter */}
          <div className="space-y-2 md:w-48">
            <Label htmlFor="documentType">Document Type</Label>
            <Select
              value={filters.documentType || "all"}
              onValueChange={(val) => handleFilterChange('documentType', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {documentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Active filters:</span>
              {searchTerm && (
                <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                  Search: "{searchTerm}"
                </span>
              )}
              {filters.documentType && filters.documentType !== "" && (
                <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                  Type: {filters.documentType}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArchivesFilters;
