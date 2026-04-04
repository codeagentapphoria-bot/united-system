import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import ReactSelect from "@/components/ui/react-select";

const PetFilters = ({
  searchInput,
  setSearchInput,
  filterSpecies,
  setFilterSpecies,
  filterPurok,
  setFilterPurok,
  barangays = [],
  role,
  setPage,
  species,
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
    { value: "Other", label: "Other" },
  ];

  const locationOptions = [{ value: "all", label: "All Barangays" }];
  (Array.isArray(barangays) ? barangays : []).forEach((barangay) => {
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
          placeholder="Search by pet name or owner…"
          value={localSearchInput}
          onChange={(e) => setLocalSearchInput(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      <div className="w-44">
        <ReactSelect
          value={speciesOptions.find(
            (option) => option.value === (filterSpecies || "all")
          )}
          onChange={(selectedOption) => {
            setFilterSpecies(selectedOption.value);
            setPage(1);
          }}
          options={speciesOptions}
          placeholder="All Species"
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

export default PetFilters;
