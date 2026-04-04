import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Filter, Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import ReactSelect from "@/components/ui/react-select";

const PetFilters = ({
  searchInput,
  setSearchInput,
  filterSpecies,
  setFilterSpecies,
  filterPurok,
  setFilterPurok,
  puroks = [],
  barangays = [],
  role,
  setPage,
  species,
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

  // Prepare species options for React Select
  const speciesOptions = [
    { value: "all", label: "All Species" },
    { value: "Dog", label: "Dog" },
    { value: "Cat", label: "Cat" },
    { value: "Bird", label: "Bird" },
    { value: "Fish", label: "Fish" },
    { value: "Rabbit", label: "Rabbit" },
    { value: "Hamster", label: "Hamster" },
    { value: "Guinea Pig", label: "Guinea Pig" },
    { value: "Ferret", label: "Ferret" },
    { value: "Reptile", label: "Reptile" },
    { value: "Other", label: "Other" }
  ];

  // Prepare purok/barangay options for React Select
  const locationOptions = [
    { value: "all", label: `All ${role === "barangay" ? "Purok" : "Barangay"}` }
  ];

  if (role === "barangay") {
    (Array.isArray(puroks) ? puroks : []).forEach((purok) => {
      locationOptions.push({
        value: String(purok.purok_id || purok.id),
        label: purok.purok_name || purok.purokName
      });
    });
  } else {
    (Array.isArray(barangays) ? barangays : []).forEach((barangay) => {
      locationOptions.push({
        value: String(barangay.id),
        label: barangay.barangay_name || barangay.barangayName
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
            <Input
              placeholder="Search by pet name or owner..."
              value={localSearchInput}
              onChange={(e) => {
                setLocalSearchInput(e.target.value);
              }}
              className="pl-10"
            />
          </div>
          
          <ReactSelect
            value={speciesOptions.find(option => option.value === (filterSpecies || "all"))}
            onChange={(selectedOption) => {
              setFilterSpecies(selectedOption.value);
              setPage(1);
            }}
            options={speciesOptions}
            placeholder="Filter by species"
          />
          
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

export default PetFilters;
