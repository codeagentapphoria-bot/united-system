import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Filter } from "lucide-react";
import { months, years } from "@/constants/dashboardConstants";
import ReactSelect from "@/components/ui/react-select";

const FilterControls = ({
  role,
  selectedBarangay,
  setSelectedBarangay,
  selectedPurok,
  setSelectedPurok,
  barangays,
  puroks,
}) => {
  // Prepare barangay options for React Select
  const barangayOptions = [
    { value: "all", label: "All Barangays" }
  ];

  if (Array.isArray(barangays)) {
    barangays.forEach((barangay) => {
      barangayOptions.push({
        value: barangay.id.toString(),
        label: barangay.barangay_name
      });
    });
  }

  // Prepare purok options for React Select
  const purokOptions = [
    { value: "all", label: "All Puroks" }
  ];

  if (Array.isArray(puroks)) {
    puroks.forEach((purok) => {
      purokOptions.push({
        value: purok.purok_id.toString(),
        label: purok.purok_name
      });
    });
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Data Filters
        </CardTitle>
        <CardDescription>
          Customize your dashboard view with filters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 flex-wrap">
          {role === "municipality" && (
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Barangay</label>
              <ReactSelect
                value={barangayOptions.find(option => 
                  option.value === (selectedBarangay || "all")
                )}
                onChange={(selectedOption) => {
                  setSelectedBarangay(selectedOption.value === "all" ? null : selectedOption.value);
                  setSelectedPurok(null); // Reset purok when barangay changes
                }}
                options={barangayOptions}
                placeholder="Select barangay"
                isClearable={false}
              />
            </div>
          )}
          
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">
              Purok
              {role === "municipality" && !selectedBarangay && (
                <span className="text-xs text-muted-foreground ml-1">
                  (Select barangay first)
                </span>
              )}
            </label>
            <ReactSelect
              value={purokOptions.find(option => 
                option.value === (selectedPurok || "all")
              )}
              onChange={(selectedOption) => {
                setSelectedPurok(selectedOption.value === "all" ? null : selectedOption.value);
              }}
              options={purokOptions}
              placeholder={
                role === "municipality" && !selectedBarangay
                  ? "Select barangay first"
                  : "Select purok"
              }
              isDisabled={role === "municipality" && !selectedBarangay}
              isClearable={false}
              customStyles={{
                control: (provided, state) => ({
                  ...provided,
                  opacity: role === "municipality" && !selectedBarangay ? 0.5 : 1,
                  cursor: role === "municipality" && !selectedBarangay ? "not-allowed" : "default"
                })
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterControls;
