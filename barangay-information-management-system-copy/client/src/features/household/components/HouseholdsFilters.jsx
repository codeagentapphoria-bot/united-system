import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import ReactSelect from "@/components/ui/react-select";

const HouseholdsFilters = ({
  searchInput,
  setSearchInput,
  filterPurok,
  setFilterPurok,
  filterHousingType,
  setFilterHousingType,
  setPage,
  barangays,
  role,
}) => {
  const [localSearchInput, setLocalSearchInput] = useState(searchInput);

  useEffect(() => {
    setLocalSearchInput(searchInput);
  }, [searchInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchInput(localSearchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchInput, setSearchInput, setPage]);

  const locationOptions = [{ value: "all", label: "All Barangays" }];
  barangays.forEach((barangay) => {
    locationOptions.push({
      value: String(barangay.id),
      label: barangay.barangay_name || barangay.barangayName,
    });
  });

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
        <Input
          placeholder="Search by house head or address…"
          value={localSearchInput}
          onChange={(e) => setLocalSearchInput(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      <div className="w-48">
        <ReactSelect
          value={locationOptions.find(
            (option) => option.value === (filterPurok || "all")
          )}
          onChange={(selectedOption) => {
            setFilterPurok(selectedOption.value);
            setPage(1);
          }}
          options={locationOptions}
          placeholder="All Barangays"
        />
      </div>
    </div>
  );
};

export default HouseholdsFilters;
