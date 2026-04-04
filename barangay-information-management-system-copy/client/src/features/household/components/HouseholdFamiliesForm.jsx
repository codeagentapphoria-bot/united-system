import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import ReactSelect from "react-select";
import api from "@/utils/api";

// Schema for family management
const familySchema = z.object({
  families: z
    .array(
      z.object({
        head: z.string().min(1, "Family head is required"),
        members: z.array(z.string().min(1, "Family member is required")),
      })
    )
    .min(1, "At least one family is required"),
});

const HouseholdFamiliesForm = ({
  household,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [residents, setResidents] = useState([]);
  const [families, setFamilies] = useState([{ head: "", members: [] }]);
  const [residentOptions, setResidentOptions] = useState([]);
  const [householdCheckCache, setHouseholdCheckCache] = useState({});
  const [checkingHousehold, setCheckingHousehold] = useState(false);
  const [residentSearchTerm, setResidentSearchTerm] = useState("");
  const [residentSearchLoading, setResidentSearchLoading] = useState(false);
  const [residentSearchTimeout, setResidentSearchTimeout] = useState(null);
  
  // Separate search terms for each ReactSelect to prevent interference
  const [familyHeadSearchTerms, setFamilyHeadSearchTerms] = useState({});
  const [familyMemberSearchTerms, setFamilyMemberSearchTerms] = useState({});
  
  // Family suggestions based on house head
  const [suggestedFamilyHeads, setSuggestedFamilyHeads] = useState([]);
  const [suggestedFamilyMembers, setSuggestedFamilyMembers] = useState([]);

  const form = useForm({
    resolver: zodResolver(familySchema),
    defaultValues: {
      families: [{ head: "", members: [] }],
    },
    mode: "onTouched",
  });

  // Generate family suggestions based on house head's last name and middle name
  const generateFamilySuggestions = useCallback(async (houseHeadData) => {
    if (!houseHeadData) {
      setSuggestedFamilyHeads([]);
      setSuggestedFamilyMembers([]);
      return;
    }

    const houseHeadLastName = houseHeadData.last_name?.toLowerCase() || '';
    const houseHeadMiddleName = houseHeadData.middle_name?.toLowerCase() || '';

    // If we don't have enough data to make suggestions, return empty
    if (!houseHeadLastName && !houseHeadMiddleName) {
      setSuggestedFamilyHeads([]);
      setSuggestedFamilyMembers([]);
      return;
    }

    try {
      // Search for residents with matching last name or middle name
      const searchTerms = [houseHeadLastName, houseHeadMiddleName].filter(term => term && term.length >= 2);
      
      if (searchTerms.length === 0) {
        setSuggestedFamilyHeads([]);
        setSuggestedFamilyMembers([]);
        return;
      }

      // Use the first search term to find potential family members
      const searchTerm = searchTerms[0];
      const response = await api.get("/list/residents", {
        params: {
          search: searchTerm,
          page: 1,
          perPage: 100, // Get more results for better suggestions
        },
      });
      
      const allResidents = response.data.data?.data || response.data.data || [];
      
      // Filter residents who share the same last name or middle name with house head
      const suggestedResidents = allResidents.filter(resident => {
        // Don't include the house head themselves
        if (resident.id === houseHeadData.id) return false;
        
        const residentLastName = resident.last_name?.toLowerCase() || '';
        const residentMiddleName = resident.middle_name?.toLowerCase() || '';

        // Match by last name or middle name
        const matches = (residentLastName === houseHeadLastName && residentLastName !== '') ||
                (residentMiddleName === houseHeadMiddleName && houseHeadMiddleName !== '') ||
                (residentLastName === houseHeadMiddleName && houseHeadMiddleName !== '');

        return matches;
      });

      // Separate into potential family heads and family members
      // Family heads are typically adults (older than 18, or have certain roles)
      const familyHeads = suggestedResidents.filter(resident => {
        // Simple age estimation based on birthdate
        const birthYear = new Date(resident.birthdate).getFullYear();
        const currentYear = new Date().getFullYear();
        const age = currentYear - birthYear;

        return age >= 18; // Consider adults as potential family heads
      });

      // Family members are all suggested residents
      const familyMembers = suggestedResidents;

      setSuggestedFamilyHeads(familyHeads);
      setSuggestedFamilyMembers(familyMembers);
    } catch (error) {
      setSuggestedFamilyHeads([]);
      setSuggestedFamilyMembers([]);
    }
  }, []);

  // Check if a resident already has a household (excluding current household)
  const checkResidentHousehold = async (residentId) => {
    if (!residentId) return null;

    // Check cache first
    if (householdCheckCache[residentId] !== undefined) {
      return householdCheckCache[residentId];
    }

    setCheckingHousehold(true);
    try {
      const response = await api.get(`/check-household/${residentId}`);
      const result = response.data.data;

      // If the resident is in the current household being edited, don't consider it as "already in another household"

      // Check if this resident is in the current household being edited
      const isInCurrentHousehold = result && (
        result.household_id === household?.household_id || 
        result.household_id === household?.id ||
        result.household_id === String(household?.household_id) ||
        result.household_id === String(household?.id)
      );

      if (isInCurrentHousehold) {
        const modifiedResult = {
          ...result,
          hasHousehold: false, // Don't treat current household as a conflict
        };

        // Cache the modified result
        setHouseholdCheckCache((prev) => ({
          ...prev,
          [residentId]: modifiedResult,
        }));

        return modifiedResult;
      }

      // Cache the result
      setHouseholdCheckCache((prev) => ({
        ...prev,
        [residentId]: result,
      }));

      return result;
    } catch (error) {
      return null;
    } finally {
      setCheckingHousehold(false);
    }
  };

  // Fetch residents for selection
  useEffect(() => {
    const fetchResidents = async () => {
      try {
        // Don't fetch all residents initially - wait for search
        setResidents([]);
      } catch (error) {
      }
    };

    fetchResidents();
    
    // Clear cache when component mounts to ensure fresh data
    setHouseholdCheckCache({});
  }, []);


  // Search residents with debouncing
  const searchResidents = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
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
      setResidents(residentsData);
    } catch (error) {
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

  // Update resident options with household status
  useEffect(() => {
    const updateResidentOptions = async () => {
      const options = await Promise.all(
        residents.map(async (r) => {
          const householdCheck = await checkResidentHousehold(r.id);
          const hasHousehold = householdCheck && householdCheck.hasHousehold;
          const role = householdCheck?.role || null;

          return {
            value: r.id,
            label: `${r.last_name}, ${r.first_name}${
              r.middle_name ? " " + r.middle_name : ""
            }${
              hasHousehold
                ? ` (${
                    role === "house_head"
                      ? "House Head"
                      : role === "family_head"
                      ? "Family Head"
                      : "Family Member"
                  })`
                : ""
            }`,
            hasHousehold,
            role,
            isDisabled: hasHousehold,
          };
        })
      );
      setResidentOptions(options);
    };

    if (residents.length > 0) {
      updateResidentOptions();
    }
  }, [residents]);

  // Populate form with household data
  useEffect(() => {
    if (household && household.families && household.families.length > 0) {
      // Process families data directly from the household object
      const familiesData = household.families.map((family) => {
        // Use family_head_id directly from the API response
        const familyHeadId = family.family_head_id || family.familyHeadId;

        // Process family members - they come as an array from the API
        const familyMembers = family.members
          ? family.members.map((member) => {
              return member.fm_member_id;
            })
          : [];

        const processedFamily = {
          head: familyHeadId || "",
          members: familyMembers,
        };

        return processedFamily;
      });

      // Filter out families that have no valid data
      const validFamilies = familiesData.filter(
        (family) =>
          family.head || family.members.some((member) => member !== "")
      );

      if (validFamilies.length > 0) {
        setFamilies(validFamilies);
        form.reset({ families: validFamilies });
      } else {
        // If no valid families found, set a default empty family
        setFamilies([{ head: "", members: [] }]);
        form.reset({ families: [{ head: "", members: [] }] });
      }
    } else if (household && (!household.families || household.families.length === 0)) {
      // If household has no families data
      setFamilies([{ head: "", members: [] }]);
      form.reset({ families: [{ head: "", members: [] }] });
    }
  }, [household]);


  // Generate family suggestions when house head is selected
  useEffect(() => {
    const loadSuggestions = async () => {
      if (household && household.house_head_id) {
        // First, try to find house head in current residents
        let houseHeadData = residents.find(r => r.id === household.house_head_id);

        if (!houseHeadData && household.house_head_last_name) {
          // If house head not in residents but we have name data from household, create a temporary object
          houseHeadData = {
            id: household.house_head_id,
            last_name: household.house_head_last_name,
            middle_name: household.house_head_middle_name || null,
            first_name: household.house_head_first_name || 'Unknown'
          };
        }

        if (houseHeadData) {
          // Generate suggestions directly using API call
          await generateFamilySuggestions(houseHeadData);
        } else {
          setSuggestedFamilyHeads([]);
          setSuggestedFamilyMembers([]);
        }
      } else {
        setSuggestedFamilyHeads([]);
        setSuggestedFamilyMembers([]);
      }
    };

    loadSuggestions();
  }, [household, generateFamilySuggestions]);

  // Force form to sync with household data when it changes
  useEffect(() => {
    if (household && household.families && household.families.length > 0) {
      const currentFormValues = form.getValues("families");
      const householdFamilyIds = household.families.map(f => f.family_head_id);
      const formFamilyIds = currentFormValues.map(f => f.head);
      
      // If the form values don't match the household data, force a reset
      if (JSON.stringify(householdFamilyIds) !== JSON.stringify(formFamilyIds)) {
        const familiesData = household.families.map((family) => {
          const familyHeadId = family.family_head_id || family.familyHeadId;
          const familyMembers = family.members
            ? family.members.map((member) => member.fm_member_id)
            : [];
          return {
            head: familyHeadId || "",
            members: familyMembers,
          };
        });
        setFamilies(familiesData);
        form.reset({ families: familiesData });
      }
    }
  }, [household, form]);

  const getFilteredResidentOptions = useCallback((currentValue) => {
    
    // Get all selected IDs from both form state and local families state
    // This ensures we catch all selections even if form state is not fully synchronized
    const formFamilies = form.watch("families") || [];
    const localFamilies = families || [];
    
    // Combine both sources to get the most complete list of selected IDs
    const selectedIds = [
      ...formFamilies.flatMap((fam) => [fam.head, ...(fam.members || [])]),
      ...localFamilies.flatMap((fam) => [fam.head, ...(fam.members || [])])
    ].filter((id) => id && id !== currentValue);

    // Remove duplicates
    const uniqueSelectedIds = [...new Set(selectedIds)];

    // Start with current residentOptions (search results)
    let options = [...residentOptions];

    // Always include the current value if it exists, even if not in search results
    if (currentValue) {
      const alreadyIncluded = options.some(opt => opt.value === currentValue);
      if (!alreadyIncluded) {
        // First try to find in current residents (search results)
        let residentData = residents.find(r => r.id === currentValue);
        
        // If not found in search results, try to get from household data
        if (!residentData && household && household.families) {
          for (const family of household.families) {
            // Check if this is a family head
            if (family.family_head_id === currentValue) {
              residentData = {
                id: family.family_head_id,
                first_name: family.family_head_first_name || family.family_head?.split(' ')[0] || 'Unknown',
                last_name: family.family_head_last_name || family.family_head?.split(' ').slice(-1)[0] || 'Unknown',
                middle_name: family.family_head_middle_name || family.family_head?.split(' ').slice(1, -1).join(' ') || '',
              };
              break;
            }

            // Check if this is a family member
            if (family.members) {
              for (const member of family.members) {
                if (member.fm_member_id === currentValue) {
                  residentData = {
                    id: member.fm_member_id,
                    first_name: member.fm_member_first_name || member.fm_member?.split(' ')[0] || 'Unknown',
                    last_name: member.fm_member_last_name || member.fm_member?.split(' ').slice(-1)[0] || 'Unknown',
                    middle_name: member.fm_member_middle_name || member.fm_member?.split(' ').slice(1, -1).join(' ') || '',
                  };
                  break;
                }
              }
            }
          }
        }

        // If still no data found, create a placeholder to prevent empty display
        if (!residentData) {
          residentData = {
            id: currentValue,
            first_name: 'Loading...',
            last_name: 'Loading...',
            middle_name: '',
          };
        }

        if (residentData) {
          // Check household status for this resident
          const householdCheck = householdCheckCache[currentValue];
          const hasHousehold = householdCheck && householdCheck.hasHousehold;
          const role = householdCheck?.role || null;

          const isAlreadySelected = uniqueSelectedIds.includes(residentData.id);
          const option = {
            value: residentData.id,
            label: `${residentData.last_name}, ${residentData.first_name}${
              residentData.middle_name ? " " + residentData.middle_name : ""
            }${
              hasHousehold
                ? ` (${
                    role === "house_head"
                      ? "House Head"
                      : role === "family_head"
                      ? "Family Head"
                      : "Family Member"
                  })`
                : ""
            }${
              isAlreadySelected && residentData.id !== currentValue
                ? " (Already Selected)"
                : ""
            }`,
            hasHousehold,
            role,
            isDisabled: hasHousehold || (isAlreadySelected && residentData.id !== currentValue),
          };
          options.push(option);
        }
      }
    }

    // Ensure all selected residents are included, even if not in current search results
    selectedIds.forEach(selectedId => {
      const alreadyIncluded = options.some(opt => opt.value === selectedId);
      if (!alreadyIncluded) {
        // First try to find in current residents (search results)
        let residentData = residents.find(r => r.id === selectedId);
        
        // If not found in search results, try to get from household data
        if (!residentData && household && household.families) {
          for (const family of household.families) {
            // Check if this is a family head
            if (family.family_head_id === selectedId) {
              residentData = {
                id: family.family_head_id,
                first_name: family.family_head_first_name || family.family_head?.split(' ')[0] || 'Unknown',
                last_name: family.family_head_last_name || family.family_head?.split(' ').slice(-1)[0] || 'Unknown',
                middle_name: family.family_head_middle_name || family.family_head?.split(' ').slice(1, -1).join(' ') || '',
              };
              break;
            }

            // Check if this is a family member
            if (family.members) {
              for (const member of family.members) {
                if (member.fm_member_id === selectedId) {
                  residentData = {
                    id: member.fm_member_id,
                    first_name: member.fm_member_first_name || member.fm_member?.split(' ')[0] || 'Unknown',
                    last_name: member.fm_member_last_name || member.fm_member?.split(' ').slice(-1)[0] || 'Unknown',
                    middle_name: member.fm_member_middle_name || member.fm_member?.split(' ').slice(1, -1).join(' ') || '',
                  };
                  break;
                }
              }
            }
          }
        }

        // If still no data found, create a placeholder to prevent empty display
        if (!residentData) {
          residentData = {
            id: selectedId,
            first_name: 'Loading...',
            last_name: 'Loading...',
            middle_name: '',
          };
        }

        if (residentData) {
          // Check household status for this resident
          const householdCheck = householdCheckCache[selectedId];
          const hasHousehold = householdCheck && householdCheck.hasHousehold;
          const role = householdCheck?.role || null;

          const isAlreadySelected = uniqueSelectedIds.includes(residentData.id);
          const option = {
            value: residentData.id,
            label: `${residentData.last_name}, ${residentData.first_name}${
              residentData.middle_name ? " " + residentData.middle_name : ""
            }${
              hasHousehold
                ? ` (${
                    role === "house_head"
                      ? "House Head"
                      : role === "family_head"
                      ? "Family Head"
                      : "Family Member"
                  })`
                : ""
            }${
              isAlreadySelected && residentData.id !== currentValue
                ? " (Already Selected)"
                : ""
            }`,
            hasHousehold,
            role,
            isDisabled: hasHousehold || (isAlreadySelected && residentData.id !== currentValue),
          };
          options.push(option);
        }
      }
    });

    // Add suggested residents based on house head
    const addSuggestedResidents = (suggestedResidents, labelPrefix = "") => {
      suggestedResidents.forEach(resident => {
        const alreadyIncluded = options.some(opt => opt.value === resident.id);
        const isAlreadySelected = uniqueSelectedIds.includes(resident.id);

        // Only add if not already included AND not already selected in current form
        if (!alreadyIncluded && !isAlreadySelected) {
          // Check household status for this resident
          const householdCheck = householdCheckCache[resident.id];
          const hasHousehold = householdCheck && householdCheck.hasHousehold;
          const role = householdCheck?.role || null;

          const option = {
            value: resident.id,
            label: `${labelPrefix}${resident.last_name}, ${resident.first_name}${
              resident.middle_name ? " " + resident.middle_name : ""
            }${
              hasHousehold
                ? ` (${
                    role === "house_head"
                      ? "House Head"
                      : role === "family_head"
                      ? "Family Head"
                      : "Family Member"
                  })`
                : ""
            }`,
            hasHousehold,
            role,
            isDisabled: hasHousehold,
          };
          options.push(option);
        }
      });
    };

    // Add suggested family heads and members
    if (suggestedFamilyHeads.length > 0) {
      addSuggestedResidents(suggestedFamilyHeads, "💡 Suggested Family Head: ");
    }
    if (suggestedFamilyMembers.length > 0) {
      addSuggestedResidents(suggestedFamilyMembers, "💡 Suggested Member: ");
    }

    // Apply filtering logic
    return options.map((opt) => ({
      ...opt,
      // Disable if already selected elsewhere in this form (unless it's the current value)
      // OR if already registered in another household (based on actual database data)
      isDisabled: (uniqueSelectedIds.includes(opt.value) && opt.value !== currentValue) || opt.hasHousehold
    }));
  }, [form, families, residentOptions, residents, householdCheckCache, household, suggestedFamilyHeads, suggestedFamilyMembers]);

  const addFamily = () => {
    const newFamilies = [...families, { head: "", members: [] }];
    setFamilies(newFamilies);
    form.setValue("families", newFamilies);
  };

  const removeFamily = (index) => {
    if (families.length > 1) {
      const newFamilies = families.filter((_, i) => i !== index);
      setFamilies(newFamilies);
      form.setValue("families", newFamilies);
    }
  };

  const addMember = (familyIndex) => {
    const newFamilies = [...families];
    newFamilies[familyIndex].members.push("");
    setFamilies(newFamilies);
    form.setValue("families", newFamilies);
  };

  const removeMember = (familyIndex, memberIndex) => {
    const newFamilies = [...families];
    newFamilies[familyIndex].members = newFamilies[familyIndex].members.filter(
      (_, i) => i !== memberIndex
    );
    setFamilies(newFamilies);
    form.setValue("families", newFamilies);
  };

  const updateFamilyHead = (index, value) => {
    const newFamilies = [...families];
    newFamilies[index].head = value;
    setFamilies(newFamilies);
    form.setValue("families", newFamilies);
  };

  const updateFamilyMember = (familyIndex, memberIndex, value) => {
    const newFamilies = [...families];
    newFamilies[familyIndex].members[memberIndex] = value;
    setFamilies(newFamilies);
    form.setValue("families", newFamilies);
  };

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Check if any selected resident already has a household
      const allResidentIds = new Set();

      // Add family heads and members
      if (Array.isArray(data.families)) {
        data.families.forEach((family) => {
          if (family.head) {
            allResidentIds.add(family.head);
          }
          if (Array.isArray(family.members)) {
            family.members.forEach((memberId) => {
              if (memberId) {
                allResidentIds.add(memberId);
              }
            });
          }
        });
      }

             // Check each resident
       for (const residentId of allResidentIds) {
         const householdCheck = await checkResidentHousehold(residentId);

         if (householdCheck && householdCheck.hasHousehold) {
          const residentName = residents.find((r) => r.id === residentId);
          const residentDisplayName = residentName
            ? `${residentName.last_name}, ${residentName.first_name}`
            : "This resident";

          const roleText =
            householdCheck.role === "house_head"
              ? "house head"
              : householdCheck.role === "family_head"
              ? "family head"
              : householdCheck.role === "family_member"
              ? "family member"
              : "member";

          toast({
            title: "Error",
            description: `${residentDisplayName} is already a ${roleText} in another household (House #${
              householdCheck.household.house_number || "N/A"
            }, ${
              householdCheck.household.street || "N/A"
            }). Please select a different resident.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
       }

      // Transform data for API
      const transformedData = {
        // Include the existing household head to preserve it
        house_head: household.house_head_id || household.house_head,
        families: data.families.map((family, index) => {
          // Transform members array to array format expected by transformDataForAPI
          const familyMembers = family.members
            .filter((memberId) => memberId) // Filter out empty values
            .map((memberId) => ({
              memberId: memberId,
              relationshipToHead: "Family Member", // Default relationship
            }));

          return {
            head: family.head, // Use 'head' instead of 'family_head' for validation
            familyHeadId: family.head, // Also include familyHeadId for compatibility
            familyMembers: familyMembers, // Send as array for transformDataForAPI
          };
        }),
      };

      await onSubmit(transformedData);
      toast({
        title: "Success",
        description: "Family groups updated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update family groups",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Label>Families (optional)</Label>
            {checkingHousehold && (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            )}
          </div>
          <Button type="button" variant="secondary" onClick={addFamily}>
            + Add Family Group
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Residents already registered in other households will be disabled and cannot be selected. 
          Residents already selected as family heads or members in this form will also be disabled to prevent duplicates.
        </p>
      <div className="pr-2 space-y-4">
        {families.map((family, famIdx) => {
          return (
          <div key={famIdx} className="border rounded p-4 bg-muted/50 relative">
            <div className="flex items-center gap-2 mb-2">
              <Label className="flex-1">Family Head</Label>
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-xs border border-gray-300"
                aria-label="Remove family group"
                onClick={() => removeFamily(famIdx)}
              >
                <span
                  style={{
                    fontWeight: "bold",
                    fontSize: "1rem",
                    lineHeight: 1,
                  }}
                >
                  ×
                </span>
              </button>
            </div>
                         <ReactSelect
                           key={`family-head-${famIdx}-${family.head}`}
                           options={getFilteredResidentOptions(family.head)}
                           value={(() => {
                             const options = getFilteredResidentOptions(family.head);
                             const selectedValue = family.head ? options.find((opt) => opt.value === family.head) || null : null;
                             return selectedValue;
                           })()}
               onChange={(opt) => {
                 updateFamilyHead(famIdx, opt ? opt.value : "");
                 // Clear search term after selection
                 setFamilyHeadSearchTerms(prev => ({ ...prev, [famIdx]: "" }));
               }}
               onInputChange={(newValue, { action }) => {
                 if (action === "input-change") {
                   setFamilyHeadSearchTerms(prev => ({ ...prev, [famIdx]: newValue }));
                   // Also update the main search term for API calls
                   setResidentSearchTerm(newValue);
                 }
               }}
               inputValue={familyHeadSearchTerms[famIdx] || ""}
               isClearable
               isSearchable
               placeholder={
                 residentSearchLoading
                   ? "Searching residents..."
                   : "Type to search for family head (min 2 characters)"
               }
               noOptionsMessage={() => 
                 residentSearchTerm.trim().length < 2 
                   ? "Type at least 2 characters to search" 
                   : "No residents found"
               }
               isLoading={residentSearchLoading || checkingHousehold}
               styles={{
                 control: (provided, state) => ({
                   ...provided,
                   backgroundColor: "transparent",
                   borderColor: state.isFocused ? "#d1d5db" : "#e5e7eb",
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
                   color: state.isDisabled ? "#9ca3af" : "#111827",
                   cursor: state.isDisabled ? "not-allowed" : "pointer",
                   opacity: state.isDisabled ? 0.6 : 1,
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
            {form.formState.errors.families?.[famIdx]?.head && (
              <span className="text-xs text-red-500">
                {form.formState.errors.families[famIdx].head.message}
              </span>
            )}
            <div className="mb-2 mt-4 flex items-center justify-between">
              <Label>Family Members</Label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => addMember(famIdx)}
              >
                + Add Member
              </Button>
            </div>
            {family.members.length > 0 &&
              family.members.map((member, memIdx) => (
                <div key={memIdx} className="flex gap-2 items-center mb-2">
                                     <ReactSelect
                     key={`family-member-${famIdx}-${memIdx}-${member}`}
                     className="w-full"
                     options={getFilteredResidentOptions(member)}
                     value={
                       member ? getFilteredResidentOptions(member).find(
                         (opt) => opt.value === member
                       ) || null : null
                     }
                     onChange={(opt) => {
                       updateFamilyMember(famIdx, memIdx, opt ? opt.value : "");
                       // Clear search term after selection
                       setFamilyMemberSearchTerms(prev => ({ ...prev, [`${famIdx}-${memIdx}`]: "" }));
                     }}
                     onInputChange={(newValue, { action }) => {
                       if (action === "input-change") {
                         setFamilyMemberSearchTerms(prev => ({ ...prev, [`${famIdx}-${memIdx}`]: newValue }));
                         // Also update the main search term for API calls
                         setResidentSearchTerm(newValue);
                       }
                     }}
                     inputValue={familyMemberSearchTerms[`${famIdx}-${memIdx}`] || ""}
                     isClearable
                     isSearchable
                     placeholder={
                       residentSearchLoading
                         ? "Searching residents..."
                         : `Type to search for family member ${memIdx + 1} (min 2 characters)`
                     }
                     noOptionsMessage={() => 
                       residentSearchTerm.trim().length < 2 
                         ? "Type at least 2 characters to search" 
                         : "No residents found"
                     }
                     isLoading={residentSearchLoading || checkingHousehold}
                     styles={{
                       control: (provided, state) => ({
                         ...provided,
                         backgroundColor: "transparent",
                         borderColor: state.isFocused ? "#d1d5db" : "#e5e7eb",
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
                         color: state.isDisabled ? "#9ca3af" : "#111827",
                         cursor: state.isDisabled ? "not-allowed" : "pointer",
                         opacity: state.isDisabled ? 0.6 : 1,
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
                  <button
                    type="button"
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-xs border border-gray-300"
                    aria-label="Remove member"
                    onClick={() => removeMember(famIdx, memIdx)}
                  >
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "1rem",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </span>
                  </button>
                </div>
              ))}
            {form.formState.errors.families?.[famIdx]?.members && (
              <span className="text-xs text-red-500">
                {form.formState.errors.families[famIdx].members.message}
              </span>
            )}
          </div>
          );
        })}
      </div>
      {form.formState.errors.families &&
        typeof form.formState.errors.families.message === "string" && (
          <span className="text-xs text-red-500">
            {form.formState.errors.families.message}
          </span>
        )}

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

export default HouseholdFamiliesForm;
