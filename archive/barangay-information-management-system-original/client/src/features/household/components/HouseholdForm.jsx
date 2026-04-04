import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Zap,
  Users as UsersIcon,
  Locate,
  Image,
  Upload,
  X,
  Camera,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { householdSchema } from "@/utils/householdSchema";
import LeafletMap from "@/components/common/LeafletMap";
import BarangayBoundaryMap from "@/components/common/BarangayBoundaryMap";
import ReactSelect from "react-select";
import api from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const steps = [
  { label: "Head & Details", icon: <User className="h-5 w-5" /> },
  { label: "Address", icon: <MapPin className="h-5 w-5" /> },
  { label: "Images", icon: <Image className="h-5 w-5" /> },
  { label: "Utilities", icon: <Zap className="h-5 w-5" /> },
  { label: "Families", icon: <UsersIcon className="h-5 w-5" /> },
];

// ReactSelect styles
const reactSelectStyles = {
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
};

const HouseholdForm = ({
  mode = "add",
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [step, setStep] = useState(0);
  const [residents, setResidents] = useState([]);
  const [puroks, setPuroks] = useState([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [images, setImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false);
  const [checkingHousehold, setCheckingHousehold] = useState(false);
  const [householdCheckCache, setHouseholdCheckCache] = useState({});
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [residentSearchTerm, setResidentSearchTerm] = useState("");
  const [residentSearchLoading, setResidentSearchLoading] = useState(false);
  const [residentSearchTimeout, setResidentSearchTimeout] = useState(null);
  
  // Separate search terms for each ReactSelect to prevent interference
  const [houseHeadSearchTerm, setHouseHeadSearchTerm] = useState("");
  const [familyHeadSearchTerms, setFamilyHeadSearchTerms] = useState({});
  const [familyMemberSearchTerms, setFamilyMemberSearchTerms] = useState({});
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { user } = useAuth();

  const form = useForm({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      houseNumber: "",
      street: "",
      purokId: null,
      houseHead: "",
      housingType: "",
      structureType: "",
      electricity: "",
      waterSource: "",
      toiletFacility: "",
      geom: { lat: "", lng: "" },
      area: "",
      families: [{ head: "", members: [] }],
      images: [],
    },
    mode: "onChange",
  });

  // Fetch residents and puroks
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch puroks
        const puroksRes = await api.get(`/list/${user.target_id}/purok`);
        setPuroks(puroksRes.data.data || []);
        
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
  console.error("Failed to fetch form data:", error);
}
      }
    };

    fetchData();
  }, [user.target_id]);

  // Pre-load house head resident for edit mode
  useEffect(() => {
    const preloadHouseHead = async () => {
      if (mode === "edit" && initialData?.house_head_id) {
        try {
          const response = await api.get(`/${initialData.house_head_id}/resident`);
          const houseHeadResident = response.data.data;
          setResidents([houseHeadResident]);
          console.log("Pre-loaded house head resident:", houseHeadResident);
        } catch (error) {
          console.warn("Failed to fetch house head resident:", error);
          setResidents([]);
        }
      }
    };

    preloadHouseHead();
  }, [mode, initialData?.house_head_id]);

  // Search residents with debouncing
  const searchResidents = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      // Don't clear residents if we have a house head loaded in edit mode
      if (mode === "edit" && initialData?.house_head_id) {
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
      
      // If we have a current house head in edit mode, make sure they're included in the results
      if (mode === "edit" && initialData?.house_head_id) {
        const currentHouseHead = residents.find(r => r.id === initialData.house_head_id);
        if (currentHouseHead && !residentsData.find(r => r.id === initialData.house_head_id)) {
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

  // Populate form with initial data for edit mode
  useEffect(() => {
    if (mode === "edit" && initialData) {
      // Parse geometry if it's a string
      let geom = null;
      if (initialData.geom) {
        if (typeof initialData.geom === "string") {
          const match = initialData.geom.match(/POINT\(([^)]+)\)/);
          if (match) {
            const [lng, lat] = match[1].split(" ").map(Number);
            geom = { lat: lat.toString(), lng: lng.toString() };
          }
        } else if (initialData.geom.lat && initialData.geom.lng) {
          geom = {
            lat: initialData.geom.lat.toString(),
            lng: initialData.geom.lng.toString(),
          };
        }
      }

      // Transform families data for the form
      let families = [{ head: "", members: [] }];
      if (initialData.families && initialData.families.length > 0) {
        families = initialData.families.map((family) => ({
          head: family.family_head || "",
          members: family.members
            ? family.members.map((member) => member.fm_member || "")
            : [],
        }));
      }

      // Reset form with household data
      form.reset({
        houseNumber: initialData.house_number || "",
        street: initialData.street || "",
        purokId: initialData.purok_id ? String(initialData.purok_id) : "",
        barangayId: initialData.barangay_id
          ? String(initialData.barangay_id)
          : "",
        houseHead: initialData.house_head_id || "",
        housingType: initialData.housing_type || "",
        structureType: initialData.structure_type || "",
        electricity: initialData.electricity || "",
        waterSource: initialData.water_source || "",
        toiletFacility: initialData.toilet_facility || "",
        geom: geom || { lat: "", lng: "" },
        area: initialData.area ? String(initialData.area) : "",
        families: families,
      });

      // Set hasSelectedLocation to true if there are existing coordinates
      if (geom && geom.lat && geom.lng) {
        setHasSelectedLocation(true);
      }
    }
  }, [mode, initialData]);

  const handleNext = async () => {
    // Validate current step using React Hook Form
    const currentStepFields = getStepFields(step);
    const isValid = await form.trigger(currentStepFields);

    if (isValid) {
      // Additional validation for family step
      if (step === 4) {
        // Families step
        const families = form.watch("families");
        const allResidentIds = new Set();

        // Collect all resident IDs from families
        families.forEach((family) => {
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
            return;
          }
        }
      }

      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    } else {
      // Show first error message
      const errors = form.formState.errors;
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
      }
    }
  };

  // Get fields for each step to validate
  const getStepFields = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        return ["houseHead"];
      case 1:
        return ["purokId"];
      case 2:
        return []; // Images are optional
      case 3:
        return ["electricity"];
      case 4:
        return ["families"]; // Families validation is handled by schema
      default:
        return [];
    }
  };

  const handleBack = () => setStep((s) => s - 1);

  const handleSubmit = form.handleSubmit(async (payload) => {
    // Check if any selected resident already has a household
    const allResidentIds = new Set();

    // Add house head
    if (payload.houseHead) {
      allResidentIds.add(payload.houseHead);
    }

    // Add family heads and members
    if (Array.isArray(payload.families)) {
      payload.families.forEach((family) => {
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
        return;
      }
    }

    // Transform IDs to numbers where needed
    const toNumber = (v) =>
      v !== undefined && v !== null && v !== "" ? Number(v) : undefined;
    const transformed = {
      houseNumber: payload.houseNumber || null,
      street: payload.street || null,
      purokId: toNumber(payload.purokId),
      barangayId: toNumber(payload.barangayId) || toNumber(user.target_id),
      houseHead: payload.houseHead,
      housingType: payload.housingType || null,
      structureType: payload.structureType || null,
      electricity: payload.electricity || null,
      waterSource: payload.waterSource || null,
      toiletFacility: payload.toiletFacility || null,
      geom:
        payload.geom && payload.geom.lat && payload.geom.lng
          ? {
              lat: parseFloat(payload.geom.lat),
              lng: parseFloat(payload.geom.lng),
            }
          : null,
      area: payload.area ? Number(payload.area) : null,
      household_image_path:
        images.length > 0 ? images.map((img) => img.file) : [], // Add images to the payload
      families: Array.isArray(payload.families)
        ? payload.families
            .filter((fam) => fam.head) // Only valid families
            .map((fam) => ({
              familyHeadId: fam.head,
              familyMembers: Array.isArray(fam.members)
                ? fam.members
                    .filter((m) => m) // Only non-empty
                    .map((m) => ({
                      memberId: m,
                      relationshipToHead: "", // TODO: Add relationship UI if needed
                    }))
                : [],
            }))
        : [],
    };

    // Transform families and familyMembers arrays to objects with numeric keys for backend compatibility
    if (Array.isArray(transformed.families)) {
      const familiesObj = {};
      transformed.families.forEach((fam, i) => {
        const membersObj = {};
        if (Array.isArray(fam.familyMembers)) {
          fam.familyMembers.forEach((m, j) => {
            if (m && m.memberId) {
              membersObj[j] = m;
            }
          });
        }
        familiesObj[i] = { ...fam, familyMembers: membersObj };
      });
      transformed.families = familiesObj;
    }

    onSubmit(transformed);
  });

  // Resident and purok options for ReactSelect
  const [residentOptions, setResidentOptions] = useState([]);
  
  // Get house head data for family suggestions
  const getHouseHeadData = useCallback(() => {
    const houseHeadId = form.watch("houseHead");
    if (houseHeadId && residents.length > 0) {
      return residents.find(r => r.id === houseHeadId);
    }
    return null;
  }, [form.watch("houseHead"), residents]);

  // Family suggestions state
  const [familySuggestions, setFamilySuggestions] = useState([]);

  // Load family suggestions when house head is selected
  useEffect(() => {
    const loadFamilySuggestions = async () => {
      const houseHeadId = form.watch("houseHead");
      if (!houseHeadId) {
        setFamilySuggestions([]);
        return;
      }

      try {
        console.log("Loading family suggestions for house head ID:", houseHeadId);
        
        // Find the house head data from current residents or search for it
        let houseHeadData = residents.find(r => r.id === houseHeadId);
        
        if (!houseHeadData) {
          // If not found in current residents, search for the house head
          const searchResponse = await api.get("/list/residents", {
            params: {
              search: houseHeadId, // Search by ID
              page: 1,
              perPage: 10,
            },
          });
          
          const searchResults = searchResponse.data?.data?.data || searchResponse.data?.data || [];
          houseHeadData = searchResults.find(r => r.id === houseHeadId);
        }
        
        if (!houseHeadData) {
          console.log("House head not found in residents list");
          setFamilySuggestions([]);
          return;
        }
        
        console.log("House head data:", houseHeadData);
        
        // Search for residents with matching last name or middle name
        const searchTerms = [
          houseHeadData.last_name?.toLowerCase(),
          houseHeadData.middle_name?.toLowerCase()
        ].filter(term => term && term.length >= 2);
        
        if (searchTerms.length === 0) {
          setFamilySuggestions([]);
          return;
        }
        
        // Use the first search term to find potential family members
        const searchTerm = searchTerms[0];
        const response = await api.get("/list/residents", {
          params: {
            search: searchTerm,
            page: 1,
            perPage: 100,
          },
        });
        
        const allResidents = response.data?.data?.data || response.data?.data || [];
        
        // Filter residents who share the same last name or middle name with house head
        const suggestedResidents = allResidents.filter(resident => {
          if (resident.id === houseHeadId) return false; // Don't include the house head themselves
          
          const residentLastName = resident.last_name?.toLowerCase() || '';
          const residentMiddleName = resident.middle_name?.toLowerCase() || '';
          const houseHeadLastName = houseHeadData.last_name?.toLowerCase() || '';
          const houseHeadMiddleName = houseHeadData.middle_name?.toLowerCase() || '';
          
          // Match by last name or middle name
          const matches = (residentLastName === houseHeadLastName && residentLastName !== '') ||
                         (residentMiddleName === houseHeadMiddleName && houseHeadMiddleName !== '') ||
                         (residentLastName === houseHeadMiddleName && houseHeadMiddleName !== '');
          
          return matches;
        });
        
        console.log("Found family suggestions:", suggestedResidents.length);
        console.log("Suggested residents:", suggestedResidents.map(r => `${r.first_name} ${r.last_name}`));
        
        setFamilySuggestions(suggestedResidents);
      } catch (error) {
        console.error("Error loading family suggestions:", error);
        setFamilySuggestions([]);
      }
    };

    loadFamilySuggestions();
  }, [form.watch("houseHead"), residents]);

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

  const purokOptions = puroks.map((p) => ({
    value: String(p.purok_id),
    label: p.purok_name,
  }));

  // Helper to get all selected resident ids in families (heads and members)
  const getSelectedResidentIds = () => {
    const fams = form.watch("families");
    const ids = new Set();
    fams.forEach((fam) => {
      if (fam.head) ids.add(fam.head);
      fam.members.forEach((m) => {
        if (m) ids.add(m);
      });
    });
    return ids;
  };

  // Helper to get filtered resident options for a dropdown
  const getFilteredResidentOptions = useCallback((currentValue) => {
    const selectedIds = getSelectedResidentIds();
    
    // Convert Set to Array and filter out the current value from selected IDs
    const filteredSelectedIds = Array.from(selectedIds).filter(id => id !== currentValue);

    // Start with current residents (search results)
    let options = residents.map((resident) => {
      const householdCheck = householdCheckCache[resident.id];
      const hasHousehold = householdCheck && householdCheck.hasHousehold;
      const role = householdCheck?.role || null;
      const isAlreadySelected = filteredSelectedIds.includes(resident.id);
      
      return {
        value: resident.id,
        label: `${resident.last_name}, ${resident.first_name}${
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
        }${
          isAlreadySelected && resident.id !== currentValue
            ? " (Already Selected)"
            : ""
        }`,
        hasHousehold,
        role,
        isDisabled: hasHousehold || (isAlreadySelected && resident.id !== currentValue),
      };
    });

    // Add family suggestions (only if not already included in search results and not already selected)
    familySuggestions.forEach((suggestedResident) => {
      const alreadyIncluded = options.some(opt => opt.value === suggestedResident.id);
      const isAlreadySelected = filteredSelectedIds.includes(suggestedResident.id);
      
      if (!alreadyIncluded && !isAlreadySelected) {
        const householdCheck = householdCheckCache[suggestedResident.id];
        const hasHousehold = householdCheck && householdCheck.hasHousehold;
        const role = householdCheck?.role || null;
        
        const option = {
          value: suggestedResident.id,
          label: `💡 Suggested Family: ${suggestedResident.last_name}, ${suggestedResident.first_name}${
            suggestedResident.middle_name ? " " + suggestedResident.middle_name : ""
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

    // Ensure all selected residents are included, even if not in current search results
    Array.from(selectedIds).forEach(selectedId => {
      const alreadyIncluded = options.some(opt => opt.value === selectedId);
      const isAlreadySelected = filteredSelectedIds.includes(selectedId);
      
      if (!alreadyIncluded) {
        // Find the resident data and create an option
        let residentData = residents.find(r => r.id === selectedId);

        // If not found in search results, try to get from household data (for edit mode)
        if (!residentData && mode === "edit" && initialData && initialData.families) {
          for (const family of initialData.families) {
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


    // Apply filtering logic
    return options.filter(
      (opt) =>
        // Include if not selected elsewhere in this form OR if it's the current value
        (!selectedIds.has(opt.value) || opt.value === currentValue) &&
        // AND if not already part of another household
        !opt.hasHousehold
    );
  }, [getSelectedResidentIds, residents, householdCheckCache, familySuggestions]);

  // Check if a resident already has a household
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

      // Cache the result
      setHouseholdCheckCache((prev) => ({
        ...prev,
        [residentId]: result,
      }));

      return result;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error checking resident household:", error);
}
      return null;
    } finally {
      setCheckingHousehold(false);
    }
  };

  // Validate a single resident selection
  const validateResidentSelection = async (
    residentId,
    context = "selected"
  ) => {
    if (!residentId) return true;

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
      return false;
    }
    return true;
  };

  const handleGetMyLocation = () => {
    setIsGettingLocation(true);

    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      setIsGettingLocation(false);
      return;
    }

    let attempts = 0;
    const maxAttempts = 5; // Increased attempts for better accuracy
    let bestPosition = null;
    let bestAccuracy = Infinity;

    const tryGetLocation = () => {
      attempts++;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Keep track of the most accurate position
          if (accuracy < bestAccuracy) {
            bestAccuracy = accuracy;
            bestPosition = { latitude, longitude, accuracy };
          }

          // If we have excellent accuracy (< 5 meters) or this is our last attempt, use the best position
          if (accuracy < 5 || attempts >= maxAttempts) {
            // Use the best position found, not necessarily the current one
            const finalLat = bestPosition.latitude;
            const finalLng = bestPosition.longitude;
            const finalAccuracy = bestPosition.accuracy;
            
            form.setValue("geom.lat", finalLat.toString());
            form.setValue("geom.lng", finalLng.toString());
            setHasSelectedLocation(true);
            
            const accuracyMessage = finalAccuracy < 5 
              ? `Location obtained with excellent accuracy (${finalAccuracy.toFixed(1)}m)!`
              : finalAccuracy < 10
              ? `Location obtained with good accuracy (${finalAccuracy.toFixed(1)}m)`
              : `Location obtained with accuracy of ${finalAccuracy.toFixed(1)}m`;
            
            toast({
              title: "Success",
              description: accuracyMessage,
            });
            setIsGettingLocation(false);
            return;
          }

          // Try again for better accuracy with longer delay
          setTimeout(tryGetLocation, 2000);
        },
        (error) => {
          if (process.env.NODE_ENV === 'development') {
  console.error("Error getting location:", error);
}
          let errorMessage = "Failed to get your location";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "Location access denied. Please enable location services.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Location information unavailable.";
              break;
            case error.TIMEOUT:
              errorMessage = "Location request timed out.";
              break;
          }

          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
          });
          setIsGettingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 45000, // Increased timeout for better accuracy
          maximumAge: 0, // Don't use cached position
        }
      );
    };

    tryGetLocation();
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter((file) => {
      const isValidType = file.type.startsWith("image/");
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB limit

      if (!isValidType) {
        toast({
          title: "Error",
          description: `${file.name} is not a valid image file`,
          variant: "destructive",
        });
      }
      if (!isValidSize) {
        toast({
          title: "Error",
          description: `${file.name} is too large. Maximum size is 5MB`,
          variant: "destructive",
        });
      }

      return isValidType && isValidSize;
    });

    if (validFiles.length + images.length > 10) {
      toast({
        title: "Error",
        description: "Maximum 10 images allowed",
        variant: "destructive",
      });
      return;
    }

    const newImages = validFiles.map((file) => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
    form.setValue("images", [...images, ...newImages]);
  };

  const handleRemoveImage = (imageId) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === imageId);
      if (imageToRemove && imageToRemove.preview) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      const updated = prev.filter((img) => img.id !== imageId);
      form.setValue("images", updated);
      return updated;
    });
  };

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  // Camera functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(err => {
            console.error("Error playing video:", err);
          });
        }
      }, 100);
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error accessing camera:", error);
      }
      toast({
        title: "Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      setStream(null);
    }
    setShowCamera(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `captured_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });

            if (images.length >= 10) {
              toast({
                title: "Error",
                description: "Maximum 10 images allowed",
                variant: "destructive",
              });
              return;
            }

            let previewUrl;
            try {
              previewUrl = URL.createObjectURL(blob);
            } catch (error) {
              console.error("Error creating object URL:", error);
              // Fallback to data URL
              const reader = new FileReader();
              reader.onload = (e) => {
                const newImage = {
                  file,
                  id: Date.now() + Math.random(),
                  preview: e.target.result,
                };
                setImages((prev) => [...prev, newImage]);
              };
              reader.readAsDataURL(blob);
              return;
            }
            
            const newImage = {
              file,
              id: Date.now() + Math.random(),
              preview: previewUrl,
            };

            setImages((prev) => [...prev, newImage]);
            form.setValue("images", [...images, newImage]);
            toast({
              title: "Success",
              description: "Image captured successfully!",
            });
          }
        },
        "image/jpeg",
        0.8
      );
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Prefill first family head with household head on dialog open or when household head changes
  useEffect(() => {
    const fams = form.getValues("families");
    const houseHead = form.getValues("houseHead");
    if (fams && fams[0] && !fams[0].head && houseHead) {
      form.setValue("families.0.head", houseHead, { shouldValidate: true });
    }
  }, []);

  // Force re-render when form values change to update validation indicators
  useEffect(() => {
    const subscription = form.watch(() => {
      // This will trigger re-render when any form field changes
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      {showInfoBanner && residentOptions.some((opt) => opt.hasHousehold) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-xs font-bold">i</span>
            </div>
            <div className="text-sm text-blue-800 flex-1">
              <span className="font-medium">Note:</span> Some residents are
              disabled because they are already part of other households.
            </div>
            <button
              type="button"
              onClick={() => setShowInfoBanner(false)}
              className="text-blue-400 hover:text-blue-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Linear Progress Bar and Step Labels */}
      <div className="mb-4">
        <Progress value={((step + 1) / steps.length) * 100} />
        <div className="flex justify-between text-xs mt-1">
          {steps.map((s, idx) => {
            const isCurrentStep = step === idx;
            const isCompleted = step > idx;
            const isStepValid = () => {
              switch (idx) {
                case 0:
                  return (
                    !form.formState.errors.houseHead &&
                    form.getValues("houseHead")
                  );
                case 1:
                  return (
                    !form.formState.errors.purokId && form.getValues("purokId")
                  );
                case 2:
                  return true; // Images are optional
                case 3:
                  return (
                    !form.formState.errors.electricity &&
                    form.getValues("electricity")
                  );
                case 4:
                  return !form.formState.errors.families; // Families validation is handled by schema
                default:
                  return false;
              }
            };

            return (
              <span
                key={s.label}
                className={`flex items-center gap-1 ${
                  isCurrentStep
                    ? "font-bold text-blue-600"
                    : isCompleted
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                {s.label}
                {isCompleted && <span className="text-green-500">✓</span>}
                {isCurrentStep && !isStepValid() && (
                  <span className="text-red-500 text-xs">*</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Form Steps */}
      <div>
        {step === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-2">
            <div className="space-y-2 flex flex-col justify-end">
              <Label htmlFor="houseHead" className="flex items-center gap-2">
                House Head
                {checkingHousehold && (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                )}
              </Label>
              <ReactSelect
                id="houseHead"
                name="houseHead"
                options={residentOptions}
                value={
                  getFilteredResidentOptions(form.watch("houseHead")).find(
                    (opt) => opt.value === form.watch("houseHead")
                  ) || null
                }
                onChange={(opt) => {
                  form.setValue("houseHead", opt?.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  // Clear search term after selection
                  setHouseHeadSearchTerm("");
                }}
                onInputChange={(newValue, { action }) => {
                  if (action === "input-change") {
                    setHouseHeadSearchTerm(newValue);
                    // Also update the main search term for API calls
                    setResidentSearchTerm(newValue);
                  }
                }}
                inputValue={houseHeadSearchTerm}
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
                  ...reactSelectStyles,
                  control: (provided, state) => ({
                    ...reactSelectStyles.control(provided, state),
                    borderColor: form.formState.errors.houseHead
                      ? "#ef4444"
                      : state.isFocused
                      ? "#d1d5db"
                      : "#e5e7eb",
                  }),
                }}
              />
              {form.formState.errors.houseHead && (
                <span className="text-xs text-red-500">
                  {form.formState.errors.houseHead.message}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="housingType">Housing Type (optional)</Label>
              <Select
                value={form.watch("housingType")}
                onValueChange={(v) =>
                  form.setValue("housingType", v, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
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
            <div className="space-y-2">
              <Label htmlFor="structureType">Structure Type (optional)</Label>
              <Select
                value={form.watch("structureType")}
                onValueChange={(v) =>
                  form.setValue("structureType", v, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
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
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-2">
            <div className="space-y-2 flex flex-col">
              <div className="space-y-2">
                <Label htmlFor="houseNumber">House Number (optional)</Label>
                <Input
                  id="houseNumber"
                  {...form.register("houseNumber")}
                  placeholder="Enter house number"
                />
                {form.formState.errors.houseNumber && (
                  <span className="text-xs text-red-500">
                    {form.formState.errors.houseNumber.message}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="street">Street (optional)</Label>
                <Input
                  id="street"
                  {...form.register("street")}
                  placeholder="Enter street name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purokId" className="flex items-center">
                  Purok
                </Label>
                <ReactSelect
                  id="purokId"
                  name="purokId"
                  options={purokOptions}
                  value={
                    form.watch("purokId")
                      ? purokOptions.find(
                          (opt) => opt.value === String(form.watch("purokId"))
                        ) || null
                      : null
                  }
                  onChange={(opt) =>
                    form.setValue("purokId", opt ? opt.value : null, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  isClearable
                  placeholder="Select purok"
                  styles={{
                    ...reactSelectStyles,
                    control: (provided, state) => ({
                      ...reactSelectStyles.control(provided, state),
                      borderColor: form.formState.errors.purokId
                        ? "#ef4444"
                        : state.isFocused
                        ? "#d1d5db"
                        : "#e5e7eb",
                    }),
                  }}
                />
                {form.formState.errors.purokId && (
                  <span className="text-xs text-red-500">
                    {form.formState.errors.purokId.message}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude (optional)</Label>
                <Input
                  id="lat"
                  value={form.watch("geom.lat")}
                  onChange={(e) => form.setValue("geom.lat", e.target.value)}
                  placeholder="e.g. 14.5995"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude (optional)</Label>
                <Input
                  id="lng"
                  value={form.watch("geom.lng")}
                  onChange={(e) => form.setValue("geom.lng", e.target.value)}
                  placeholder="e.g. 120.9842"
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGetMyLocation}
                  disabled={isGettingLocation}
                  className="w-full"
                >
                  <Locate className="h-4 w-4 mr-2" />
                  {isGettingLocation
                    ? "Getting Location..."
                    : "Get My Location"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area (sqm) (optional)</Label>
                <Input
                  id="area"
                  type="number"
                  {...form.register("area")}
                  placeholder="e.g. 80"
                />
              </div>
            </div>
            
            
            <div className="border border-gray-200 rounded-lg h-full bg-white min-h-[250px] flex items-center justify-center flex-col min-h-[400px]">
            {/* Map Guide */}
            <div className="lg:col-span-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                    💡
                  </div>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Map Location Guide:</p>
                    <ul className="text-xs space-y-1">
                      <li>• <strong>Click anywhere on the map</strong> to set the household location</li>
                      <li>• Use <strong>"Get My Location"</strong> button to automatically detect your current position</li>
                      <li>• Or manually enter <strong>latitude and longitude</strong> coordinates</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
              <BarangayBoundaryMap
                center={(() => {
                  const lat = parseFloat(form.watch("geom.lat"));
                  const lng = parseFloat(form.watch("geom.lng"));
                  if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
                  return undefined;
                })()}
                area={parseFloat(form.watch("area")) || undefined}
                popupData={{
                  houseHead: form.watch("houseHead"),
                  houseNumber: form.watch("houseNumber"),
                  purok: (() => {
                    const purokId = form.watch("purokId");
                    if (purokId === "1") return "Purok 1";
                    if (purokId === "2") return "Purok 2";
                    if (purokId === "3") return "Purok 3";
                    return "";
                  })(),
                }}
                onSelect={([lat, lng]) => {
                  form.setValue("geom.lat", lat.toString());
                  form.setValue("geom.lng", lng.toString());
                  setHasSelectedLocation(true);
                }}
                barangayId={user.target_id}
                marker={false}
                showMarker={hasSelectedLocation}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-2">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Household Images</Label>
                <div className="text-sm text-muted-foreground">
                  {images.length}/10 images
                </div>
              </div>

              {/* Camera Capture */}
              {showCamera ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-64 object-cover"
                      style={{ display: 'block', width: '100%', height: 'auto' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={stopCamera}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Close Camera
                    </Button>
                    <Button
                      type="button"
                      variant="hero"
                      onClick={captureImage}
                      className="flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Capture
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Image Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={images.length >= 10}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`cursor-pointer flex flex-col items-center space-y-2 ${
                        images.length >= 10
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <Upload className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Upload Images
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Camera Capture Button */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={images.length >= 10}
                      className={`w-full h-full flex flex-col items-center justify-center space-y-2 ${
                        images.length >= 10
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                    >
                      <Camera className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Take Photo
                        </p>
                        <p className="text-xs text-gray-500">
                          Use camera to capture
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Image Preview Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.preview}
                        alt="Household"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-2">
            <div className="space-y-2 flex flex-col justify-end">
              <Label htmlFor="electricity" className="flex items-center gap-1">
                Electricity
              </Label>
              <Select
                value={form.watch("electricity")}
                onValueChange={(v) =>
                  form.setValue("electricity", v, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger
                  className={
                    form.formState.errors.electricity ? "border-red-500" : ""
                  }
                >
                  <SelectValue placeholder="Select electricity status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.electricity && (
                <span className="text-xs text-red-500">
                  {form.formState.errors.electricity.message}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="waterSource">Water Source (optional)</Label>
              <Input
                id="waterSource"
                {...form.register("waterSource")}
                placeholder="e.g. Deep Well, Piped"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toiletFacility">Toilet Facility (optional)</Label>
              <Input
                id="toiletFacility"
                {...form.register("toiletFacility")}
                placeholder="e.g. Flush, Water Sealed"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 py-2">
            <div className="flex justify-between items-center mb-2">
              <Label>Families (optional)</Label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  form.setValue("families", [
                    ...form.watch("families"),
                    { head: "", members: [] },
                  ]);
                }}
              >
                + Add Family Group
              </Button>
            </div>
            <div className="pr-2 space-y-4">
              {form.watch("families").map((fam, famIdx) => (
                <div key={famIdx} className="border rounded p-4 bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="flex-1">Family Head</Label>
                    <button
                      type="button"
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-xs border border-gray-300"
                      aria-label="Remove family group"
                      onClick={() => {
                        const updated = form
                          .watch("families")
                          .filter((_, i) => i !== famIdx);
                        form.setValue("families", updated, {
                          shouldValidate: true,
                        });
                      }}
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
                    options={getFilteredResidentOptions(fam.head)}
                    value={
                      getFilteredResidentOptions(fam.head).find(
                        (opt) => opt.value === fam.head
                      ) || null
                    }
                    onChange={(opt) => {
                      const updated = [...form.watch("families")];
                      updated[famIdx].head = opt ? opt.value : null;
                      form.setValue("families", updated, {
                        shouldValidate: true,
                      });
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
                    isLoading={residentSearchLoading}
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
                    styles={reactSelectStyles}
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
                      onClick={() => {
                        const updated = [...form.watch("families")];
                        updated[famIdx].members.push("");
                        form.setValue("families", updated, {
                          shouldValidate: true,
                        });
                      }}
                    >
                      + Add Member
                    </Button>
                  </div>
                  {fam.members.length > 0 &&
                    fam.members.map((member, memIdx) => (
                      <div
                        key={memIdx}
                        className="flex gap-2 items-center mb-2"
                      >
                        <ReactSelect
                          className="w-full"
                          options={getFilteredResidentOptions(member)}
                          value={
                            getFilteredResidentOptions(member).find(
                              (opt) => opt.value === member
                            ) || null
                          }
                          onChange={(opt) => {
                            const updated = [...form.watch("families")];
                            updated[famIdx].members[memIdx] = opt
                              ? opt.value
                              : null;
                            form.setValue("families", updated, {
                              shouldValidate: true,
                            });
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
                          isLoading={residentSearchLoading}
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
                          styles={reactSelectStyles}
                        />
                        <button
                          type="button"
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-xs border border-gray-300"
                          aria-label="Remove member"
                          onClick={() => {
                            const updated = [...form.watch("families")];
                            updated[famIdx].members = updated[
                              famIdx
                            ].members.filter((_, i) => i !== memIdx);
                            form.setValue("families", updated, {
                              shouldValidate: true,
                            });
                          }}
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
              ))}
            </div>
            {form.formState.errors.families &&
              typeof form.formState.errors.families.message === "string" && (
                <span className="text-xs text-red-500">
                  {form.formState.errors.families.message}
                </span>
              )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="gap-1"
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {step < steps.length - 1 ? (
              <Button
                type="button"
                variant="hero"
                onClick={handleNext}
                className="gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="hero"
                className="gap-1"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {mode === "edit" ? "Updating..." : "Saving..."}
                  </div>
                ) : mode === "edit" ? (
                  "Update Household"
                ) : (
                  "Save Household"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseholdForm;
