import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

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
    "Others",
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchTerm, setSearchTerm]);

  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
        <Input
          placeholder="Search by name or description…"
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
        <SelectTrigger className="h-9 w-44">
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
  );
};

export default InventoryFilters;
