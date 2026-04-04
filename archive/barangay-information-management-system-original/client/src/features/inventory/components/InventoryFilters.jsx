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

const InventoryFilters = ({
  searchTerm,
  setSearchTerm,
  itemTypeFilter,
  setItemTypeFilter,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const itemTypes = [
    "Office Supplies",
    "Equipments",
    "Furnitures",
    "Maintenance",
    "Medicals",
    "Sports",
    "Events",
    "Others"
  ];

  const hasActiveFilters = searchTerm || (itemTypeFilter && itemTypeFilter !== "all");

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Items</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or description..."
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Item Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="itemType">Item Type</Label>
            <Select
              value={itemTypeFilter}
              onValueChange={setItemTypeFilter}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
                             <SelectContent>
                 <SelectItem value="all">All types</SelectItem>
                 {itemTypes.map((type) => (
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
                             {itemTypeFilter && itemTypeFilter !== "all" && (
                 <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                   Type: {itemTypeFilter}
                 </span>
               )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryFilters;
