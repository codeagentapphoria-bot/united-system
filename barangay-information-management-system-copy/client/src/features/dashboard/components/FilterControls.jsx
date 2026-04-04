import React from "react";
import ReactSelect from "@/components/ui/react-select";

const FilterControls = ({
  role,
  selectedBarangay,
  setSelectedBarangay,
  barangays,
}) => {
  const barangayOptions = [{ value: "all", label: "All Barangays" }];

  if (Array.isArray(barangays)) {
    barangays.forEach((barangay) => {
      barangayOptions.push({
        value: barangay.id.toString(),
        label: barangay.barangay_name,
      });
    });
  }

  if (role !== "municipality") return null;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="w-56">
        <ReactSelect
          value={barangayOptions.find(
            (option) => option.value === (selectedBarangay || "all")
          )}
          onChange={(selectedOption) => {
            setSelectedBarangay(
              selectedOption.value === "all" ? null : selectedOption.value
            );
          }}
          options={barangayOptions}
          placeholder="Select barangay"
          isClearable={false}
        />
      </div>
    </div>
  );
};

export default FilterControls;
