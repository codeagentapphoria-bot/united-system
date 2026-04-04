import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import ReactSelect from "react-select";
import api from "@/utils/api";
import { handleError, handleErrorSilently } from "@/utils/errorHandler";
import logger from "@/utils/logger";

// Schema for household details
const householdDetailsSchema = z.object({
  houseHead: z.string().min(1, "House head is required"),
  housingType: z.string().optional(),
  structureType: z.string().optional(),
  electricity: z.string().min(1, "Electricity status is required"),
  waterSource: z.string().optional(),
  toiletFacility: z.string().optional(),
});

const HouseholdDetailsForm = ({
  household,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [residents, setResidents] = useState([]);
  const [residentSearchTerm, setResidentSearchTerm] = useState("");
  const [residentSearchLoading, setResidentSearchLoading] = useState(false);
  const [residentSearchTimeout, setResidentSearchTimeout] = useState(null);

  const form = useForm({
    resolver: zodResolver(householdDetailsSchema),
    defaultValues: {
      houseHead: "",
      housingType: "",
      structureType: "",
      electricity: "",
      waterSource: "",
      toiletFacility: "",
    },
    mode: "onSubmit",
  });

  // Fetch residents for house head selection
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        
        // Always fetch all residents for the dropdown, but prioritize the house head
        let allResidents = [];
        
        // First, try to get all residents
        try {
          const response = await api.get("/list/residents", {
            params: {
              page: 1,
              perPage: 100, // Get more residents for better selection
            },
          });
          allResidents = response.data.data?.data || response.data.data || [];
        } catch (error) {
        }
        
        // If we have a house head ID, make sure that resident is included
        if (household?.house_head_id) {
          const houseHeadResident = allResidents.find(r => {
            const residentId = r.id || r.resident_id;
            return String(residentId) === String(household.house_head_id);
          });
          
          if (!houseHeadResident) {
            // If house head is not in the list, fetch them specifically
            try {
              const response = await api.get(`/${household.house_head_id}/resident`);
              const specificResident = response.data.data;
              
              // Normalize the resident structure to match other residents
              const normalizedResident = {
                ...specificResident,
                id: specificResident.id || specificResident.resident_id
              };
              
              allResidents.unshift(normalizedResident); // Add to beginning
            } catch (error) {
              
              // Fallback: try to find by name if ID fetch fails
              if (household.house_head) {
                try {
                  const response = await api.get("/list/residents", {
                    params: {
                      search: household.house_head.trim(),
                      page: 1,
                      perPage: 10,
                    },
                  });
                  const residentsData = response.data.data?.data || response.data.data || [];
                  
                  // Find the exact match by name
                  const houseHeadResident = residentsData.find((r) => {
                    const fullName = `${r.first_name}${
                      r.middle_name ? " " + r.middle_name : ""
                    } ${r.last_name}${r.suffix ? " " + r.suffix : ""}`.trim();
                    const shortName = `${r.first_name} ${r.last_name}`.trim();
                    const lastNameFirst = `${r.last_name}, ${r.first_name}`.trim();
                    return fullName === household.house_head || 
                           shortName === household.house_head || 
                           lastNameFirst === household.house_head;
                  });
                  
                  if (houseHeadResident) {
                    allResidents.unshift(houseHeadResident);
                  }
                } catch (nameError) {
                  // Silently handle name fallback error
                }
              }
            }
          }
        }
        
        setResidents(allResidents);
      } catch (error) {
        setResidents([]);
      }
    };

    if (household) {
      fetchResidents();
    }
  }, [household]);

  // Search residents with debouncing
  const searchResidents = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      // Don't clear residents if we have a house head loaded
      if (household?.house_head_id || household?.house_head) {
        // Keep the current house head resident in the list
        return;
      }
      setResidents([]);
      return;
    }

    setResidentSearchLoading(true);
    try {
      const response = await api.get("/list/residents", {
        params: {
          search: searchTerm.trim(),
          page: 1,
          perPage: 50, // Limit results for better performance
        },
      });
      const residentsData = response.data.data?.data || response.data.data || [];
      
      // If we have a current house head, make sure they're included in the results
      if (household?.house_head_id) {
        const currentHouseHead = residents.find(r => r.id === household.house_head_id);
        if (currentHouseHead && !residentsData.find(r => r.id === household.house_head_id)) {
          residentsData.unshift(currentHouseHead);
        }
      } else if (household?.house_head && residents.length > 0) {
        // If we have a house head by name, include them in search results
        const currentHouseHead = residents[0]; // Should be the pre-loaded house head
        if (currentHouseHead && !residentsData.find(r => r.id === currentHouseHead.id)) {
          residentsData.unshift(currentHouseHead);
        }
      }
      
      setResidents(residentsData);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to search residents:", error);
}
      setResidents([]);
    } finally {
      setResidentSearchLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (residentSearchTimeout) {
      clearTimeout(residentSearchTimeout);
    }

    if (residentSearchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchResidents(residentSearchTerm);
      }, 300); // 300ms debounce
      setResidentSearchTimeout(timeout);
    } else if (residentSearchTerm.trim().length === 0) {
      setResidents([]);
    }

    return () => {
      if (residentSearchTimeout) {
        clearTimeout(residentSearchTimeout);
      }
    };
  }, [residentSearchTerm]);

  // Populate form with household data when both household and residents are available
  useEffect(() => {
    if (household) {
      
      // Convert electricity boolean to string
      const electricityValue =
        household.electricity === true
          ? "Yes"
          : household.electricity === false
          ? "No"
          : household.electricity || "";

      // Find house head value
      let houseHeadValue = "";
      
      if (household.house_head_id && residents.length > 0) {
        const matchingResident = residents.find((r) => {
          const residentId = r.id || r.resident_id;
          return String(residentId) === String(household.house_head_id);
        });
        if (matchingResident) {
          const residentId = matchingResident.id || matchingResident.resident_id;
          houseHeadValue = String(residentId);
        }
      } else if (household.house_head && residents.length > 0) {
        const houseHeadName = household.house_head;
        const matchingResident = residents.find((r) => {
          const fullName = `${r.first_name}${
            r.middle_name ? " " + r.middle_name : ""
          } ${r.last_name}${r.suffix ? " " + r.suffix : ""}`.trim();
          const shortName = `${r.first_name} ${r.last_name}`.trim();
          const lastNameFirst = `${r.last_name}, ${r.first_name}`.trim();
          return fullName === houseHeadName || 
                 shortName === houseHeadName || 
                 lastNameFirst === houseHeadName;
        });
        if (matchingResident) {
          const residentId = matchingResident.id || matchingResident.resident_id;
          houseHeadValue = String(residentId);
        }
      }

      // Initialize form with all household data including house head
      const formData = {
        houseHead: houseHeadValue,
        housingType: household.housing_type || "",
        structureType: household.structure_type || "",
        electricity: electricityValue,
        waterSource: household.water_source || "",
        toiletFacility: household.toilet_facility || "",
      };
      
      form.reset(formData);
    }
  }, [household, residents, form]);


  // Resident options for ReactSelect
  const residentOptions = residents.map((r) => ({
    value: r.id || r.resident_id,
    label: `${r.last_name}, ${r.first_name}${
      r.middle_name ? " " + r.middle_name : ""
    }`,
  }));

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      logger.debug("Form submission data:", data);

      // Transform data for API
      const transformedData = {
        house_head: data.houseHead,
        housing_type: data.housingType,
        structure_type: data.structureType,
        electricity: data.electricity,
        water_source: data.waterSource,
        toilet_facility: data.toiletFacility,
      };

      logger.debug("Calling onSubmit with transformed data:", transformedData);
      const result = await onSubmit(transformedData);
      logger.debug("onSubmit result:", result);
      
      if (result === false) {
        logger.debug("onSubmit returned false - update failed");
        toast({
          title: "Error",
          description: "Failed to update household details. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Success",
        description: "Household details updated successfully!",
      });
    } catch (error) {
      handleError("Failed to update household details:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* House Head */}
        <div className="space-y-2 flex flex-col justify-end">
          <Label htmlFor="houseHead" className="flex items-center">
            House Head
          </Label>
          <ReactSelect
            key={`househead-${form.watch("houseHead")}-${residentOptions.length}`}
            id="houseHead"
            name="houseHead"
            options={residentOptions}
            value={residentOptions.find(opt => String(opt.value) === String(form.watch("houseHead"))) || null}
            onChange={(selectedOption) => {
              const newValue = selectedOption?.value || "";
              form.setValue("houseHead", newValue, {
                shouldValidate: true,
                shouldDirty: true,
              });
              form.clearErrors("houseHead");
            }}
            onInputChange={(newValue, { action }) => {
              if (action === "input-change") {
                setResidentSearchTerm(newValue);
              }
            }}
            inputValue={residentSearchTerm}
            isClearable
            isSearchable
            isLoading={residentSearchLoading}
            placeholder={
              residentSearchLoading
                ? "Searching residents..."
                : "Search resident"
            }
            noOptionsMessage={() => 
              residentSearchTerm.trim().length < 2 
                ? "Search resident" 
                : "No residents found"
            }
            styles={{
              control: (provided, state) => ({
                ...provided,
                backgroundColor: "transparent",
                borderColor: form.formState.errors.houseHead
                  ? "#ef4444"
                  : state.isFocused
                  ? "#d1d5db"
                  : "#e5e7eb",
                boxShadow: "none",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                paddingLeft: "0.5rem",
                paddingRight: "0.5rem",
              }),
              menu: (provided) => ({
                ...provided,
                zIndex: 20,
              }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isSelected
                  ? "#f3f4f6"
                  : state.isFocused
                  ? "#f9fafb"
                  : "transparent",
                color: "#111827",
                cursor: "pointer",
              }),
              singleValue: (provided) => ({
                ...provided,
                color: "#111827",
              }),
              placeholder: (provided) => ({
                ...provided,
                color: "#6b7280",
              }),
              indicatorSeparator: () => ({
                display: "none",
              }),
            }}
          />
          {form.formState.errors.houseHead && (
            <span className="text-xs text-red-500">
              {form.formState.errors.houseHead.message}
            </span>
          )}
        </div>

        {/* Housing Type */}
        <div className="space-y-2">
          <Label htmlFor="housingType">Housing Type</Label>
          <Select
            value={form.watch("housingType")}
            onValueChange={(value) => form.setValue("housingType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select housing type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Owned">Owned</SelectItem>
              <SelectItem value="Rented">Rented</SelectItem>
              <SelectItem value="Shared">Shared</SelectItem>
              <SelectItem value="Caretaker">Caretaker</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Structure Type */}
        <div className="space-y-2">
          <Label htmlFor="structureType">Structure Type</Label>
          <Select
            value={form.watch("structureType")}
            onValueChange={(value) => form.setValue("structureType", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select structure type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Concrete">Concrete</SelectItem>
              <SelectItem value="Wood">Wood</SelectItem>
              <SelectItem value="Bamboo">Bamboo</SelectItem>
              <SelectItem value="Mixed">Mixed</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Electricity */}
        <div className="space-y-2">
          <Label htmlFor="electricity">Electricity</Label>
          <Select
            value={form.watch("electricity")}
            onValueChange={(value) => form.setValue("electricity", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select electricity status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Water Source */}
        <div className="space-y-2">
          <Label htmlFor="waterSource">Water Source</Label>
          <Input
            id="waterSource"
            placeholder="Enter water source"
            {...form.register("waterSource")}
          />
        </div>

        {/* Toilet Facility */}
        <div className="space-y-2">
          <Label htmlFor="toiletFacility">Toilet Facility</Label>
          <Input
            id="toiletFacility"
            placeholder="Enter toilet facility type"
            {...form.register("toiletFacility")}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" variant="hero" disabled={isSubmitting || loading}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default HouseholdDetailsForm;
