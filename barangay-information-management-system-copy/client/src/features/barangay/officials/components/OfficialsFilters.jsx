import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";

const OfficialsFilters = ({
  searchTerm,
  setSearchTerm,
  filterPosition,
  setFilterPosition,
  positions,
  isSearching = false,
}) => {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Update parent search term when debounced value changes
  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm, setSearchTerm]);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin z-10" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
        )}
        <Input
          placeholder="Search by name, position, or committee…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      {/* Position Filter */}
      <Select value={filterPosition} onValueChange={setFilterPosition}>
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="All Positions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Positions</SelectItem>
          {positions.map((position) => (
            <SelectItem key={position} value={position}>
              {position}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default OfficialsFilters;
