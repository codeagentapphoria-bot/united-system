import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Filter, Search, Home } from "lucide-react";
import React, { useState, useEffect } from "react";
import ReactSelect from "@/components/ui/react-select";

const HouseholdsFilters = ({
  searchInput,
  setSearchInput,
  filterPurok,
  setFilterPurok,
  filterHousingType,
  setFilterHousingType,
  puroks,
  setPage,
  barangays,
  role,
}) => {
  const [localSearchInput, setLocalSearchInput] = useState(searchInput);

  // Initialize local search input when prop changes
  useEffect(() => {
    setLocalSearchInput(searchInput);
  }, [searchInput]);

  // Debounce search input - update parent after 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchInput(localSearchInput);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchInput, setSearchInput, setPage]);

  // Prepare housing type options for React Select
  const housingTypeOptions = [
    { value: "all", label: "All Housing Types" },
    { value: "Single Family", label: "Single Family" },
    { value: "Multi Family", label: "Multi Family" },
    { value: "Apartment", label: "Apartment" },
    { value: "Condo", label: "Condo" },
    { value: "Townhouse", label: "Townhouse" },
    { value: "Duplex", label: "Duplex" },
    { value: "Other", label: "Other" }
  ];

  // Prepare purok/barangay options for React Select
  const locationOptions = [
    { value: "all", label: `All ${role === "barangay" ? "Purok" : "Barangay"}` }
  ];

  if (role === "barangay") {
    puroks.forEach((purok) => {
      locationOptions.push({
        value: String(purok.purok_id || purok.id),
        label: purok.purok_name || purok.purokName
      });
    });
  } else {
    barangays.forEach((barangay) => {
      locationOptions.push({
        value: String(barangay.id),
        label: barangay.barangay_name || barangay.barangayName
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search & Filter</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search by house head or address..."
              value={localSearchInput}
              onChange={(e) => setLocalSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
            <ReactSelect
              value={locationOptions.find(option => option.value === (filterPurok || "all"))}
              onChange={(selectedOption) => {
                setFilterPurok(selectedOption.value);
                setPage(1);
              }}
              options={locationOptions}
              placeholder={`Filter by ${role === "barangay" ? "purok" : "barangay"}`}
              customStyles={{
                control: (provided, state) => ({
                  ...provided,
                  paddingLeft: '2.5rem'
                })
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HouseholdsFilters;
