import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Filter, Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import ReactSelect from "@/components/ui/react-select";

const ResidentsFilters = ({
  searchInput,
  setSearchInput,
  filterPurok,
  setFilterPurok,
  puroks,
  filterClassification,
  setFilterClassification,
  classificationOptions,
  setPage,
  barangays,
  role,
}) => {
  const [debouncedSearchInput, setDebouncedSearchInput] = useState(searchInput);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchInput(searchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update parent search input when debounced value changes
  useEffect(() => {
    setSearchInput(debouncedSearchInput);
  }, [debouncedSearchInput, setSearchInput]);

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

  // Prepare classification options for React Select
  const classificationSelectOptions = [
    { value: "all", label: "All Classifications" }
  ];

  classificationOptions.forEach((opt) => {
    classificationSelectOptions.push({
      value: opt.label,
      label: opt.label,
      color: opt.color || '#4CAF50'
    });
  });

  // Custom option component for classifications with color dots
  const ClassificationOption = ({ data, ...props }) => (
    <div {...props.innerProps} className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
      {data.value !== "all" && (
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: data.color || '#4CAF50' }}
        />
      )}
      <span className="flex-1">{data.label}</span>
    </div>
  );

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
              placeholder="Search by name or ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
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

          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
            <ReactSelect
              value={classificationSelectOptions.find(option => option.value === filterClassification)}
              onChange={(selectedOption) => {
                setFilterClassification(selectedOption.value);
                setPage(1);
              }}
              options={classificationSelectOptions}
              placeholder="Filter by classification"
              components={{
                Option: ClassificationOption
              }}
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

export default ResidentsFilters;
