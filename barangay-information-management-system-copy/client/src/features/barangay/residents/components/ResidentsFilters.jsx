import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import ReactSelect from "@/components/ui/react-select";

const ResidentsFilters = ({
  searchInput,
  setSearchInput,
  filterBarangay,
  setFilterBarangay,
  filterClassification,
  setFilterClassification,
  classificationOptions,
  setPage,
  barangays,
  role,
}) => {
  const [debouncedSearchInput, setDebouncedSearchInput] = useState(searchInput);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchInput(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSearchInput(debouncedSearchInput);
  }, [debouncedSearchInput, setSearchInput]);

  const locationOptions = [{ value: "all", label: "All Barangays" }];
  barangays.forEach((barangay) => {
    locationOptions.push({
      value: String(barangay.id),
      label: barangay.barangay_name || barangay.barangayName,
    });
  });

  const classificationSelectOptions = [{ value: "all", label: "All Classifications" }];
  classificationOptions.forEach((opt) => {
    classificationSelectOptions.push({
      value: opt.label,
      label: opt.label,
      color: opt.color || "#4CAF50",
    });
  });

  const ClassificationOption = ({ data, ...props }) => (
    <div
      {...props.innerProps}
      className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
    >
      {data.value !== "all" && (
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: data.color || "#4CAF50" }}
        />
      )}
      <span className="flex-1">{data.label}</span>
    </div>
  );

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
        <Input
          placeholder="Search by name or ID…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 pl-9"
        />
      </div>

      {role === "municipality" && (
        <div className="w-48">
          <ReactSelect
            value={locationOptions.find(
              (option) => option.value === (filterBarangay || "all")
            )}
            onChange={(selectedOption) => {
              setFilterBarangay(selectedOption.value);
              setPage(1);
            }}
            options={locationOptions}
            placeholder="All Barangays"
          />
        </div>
      )}

      <div className="w-52">
        <ReactSelect
          value={classificationSelectOptions.find(
            (option) => option.value === filterClassification
          )}
          onChange={(selectedOption) => {
            setFilterClassification(selectedOption.value);
            setPage(1);
          }}
          options={classificationSelectOptions}
          placeholder="All Classifications"
          components={{ Option: ClassificationOption }}
        />
      </div>
    </div>
  );
};

export default ResidentsFilters;
