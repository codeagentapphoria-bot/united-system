import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import logger from "@/utils/logger";
import { useCacheManager } from "@/hooks/useCacheManager";
import CacheRefreshHandler from "@/components/common/CacheRefreshHandler";
import CacheRefreshButton from "@/components/common/CacheRefreshButton";
import RefreshControls from "@/components/common/RefreshControls";
import { useCrudRefresh } from "@/hooks/useCrudRefresh";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Filter,
  Phone,
  Mail,
  Copy,
  User,
  Calendar,
  Briefcase,
  Home,
  BadgeCheck,
  MapPin,
  Info,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "@/utils/api";
import { mockBarangays } from "@/features/municipality/barangays/mockBarangays";
import { residentSchema } from "@/utils/residentSchema";
import AddResidentDialog from "@/features/barangay/residents/AddResidentDialog";
import useAuth from "@/hooks/useAuth";
import { residentStatusOptions } from "@/features/barangay/residents/constant/options";
import { useClassificationTypes } from "@/hooks/useClassificationTypes";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ClassificationGuide from "@/components/ui/ClassificationGuide";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ResidentsTable from "@/features/barangay/residents/components/ResidentsTable";
import ResidentsFilters from "@/features/barangay/residents/components/ResidentsFilters";
import ResidentViewDialog from "@/features/barangay/residents/components/ResidentViewDialog";
import ResidentClassificationsForm from "@/features/barangay/residents/components/ResidentClassificationsForm";
import ResidentInfoForm from "@/features/barangay/residents/components/ResidentInfoForm";
import ResidentImageForm from "@/features/barangay/residents/components/ResidentImageForm";
import ResidentStats from "@/features/barangay/residents/components/ResidentStats";
import {
  capitalize,
  formatDateLong,
  getAge,
  formatLabel,
  getDetailLabel,
} from "@/features/barangay/residents/components/utils";
import DeleteConfirmationDialog from "@/features/household/components/DeleteConfirmationDialog";
import { useHouseholds } from "@/features/household/hooks/useHouseholds";
import {
  sexOptions,
  civilStatusOptions,
  employmentStatusOptions,
  educationAttainmentOptions,
  indigenousPersonOptions,
} from "@/features/barangay/residents/constant/options";

const residentSteps = [
  { key: "info", label: "Resident Info" },
  { key: "classifications", label: "Classifications" },
  { key: "picture", label: "Picture" },
];
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

const ResidentsPage = ({ role }) => {
  const { user } = useAuth();
  const { clearAllCaches } = useCacheManager();
  // Set up unified auto refresh for residents data
  const { registerRefreshCallback, handleCRUDOperation, executeRefresh } = useUnifiedAutoRefresh({
    entityType: 'resident',
    successMessage: 'Resident operation completed successfully!',
    autoRefresh: true,
    refreshDelay: 100
  });
  
  // Use dynamic classification types
  const { classificationTypes, loading: typesLoading } = useClassificationTypes();
  const [classificationOptions, setClassificationOptions] = useState([]);
  const barangayId = user?.target_id;
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClassification, setFilterClassification] = useState("all");
  const [filterPurok, setFilterPurok] = useState("");
  const [puroks, setPuroks] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const searchDebounceRef = useRef();
  const [viewResident, setViewResident] = useState(null);
  const [viewResidentLoading, setViewResidentLoading] = useState(false);
  const [viewResidentError, setViewResidentError] = useState("");
  const [activeTab, setActiveTab] = useState("info");
  const [idTabLoading, setIdTabLoading] = useState(false);
  const [idTabError, setIdTabError] = useState("");
  const [punongBarangay, setPunongBarangay] = useState(null);
  const [punongBarangayLoading, setPunongBarangayLoading] = useState(false);
  const [barangayData, setBarangayData] = useState(null);
  const [municipalityData, setMunicipalityData] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editResident, setEditResident] = useState(null);
  const [editResidentLoading, setEditResidentLoading] = useState(false);
  const [editResidentError, setEditResidentError] = useState("");
  const [householdInfo, setHouseholdInfo] = useState(null);
  const { fetchHousehold } = useHouseholds();

  // Separate edit dialogs for different groups
  const [editInfoDialogOpen, setEditInfoDialogOpen] = useState(false);
  const [editClassificationsDialogOpen, setEditClassificationsDialogOpen] =
    useState(false);
  const [editImageDialogOpen, setEditImageDialogOpen] = useState(false);
  const [editIdCardDialogOpen, setEditIdCardDialogOpen] = useState(false);

  // Export/Import states
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Print and download loading states
  const [printLoading, setPrintLoading] = useState(false);
  const [downloadImageLoading, setDownloadImageLoading] = useState(false);
  const [downloadPDFLoading, setDownloadPDFLoading] = useState(false);

  // Helper: encrypt resident ID (simple base64 for demo, replace with real encryption if needed)
  const encryptId = (id) => btoa(id);

  // Populate classification options from dynamic data
  useEffect(() => {
    if (classificationTypes && classificationTypes.length > 0) {
      const options = classificationTypes.map(type => ({
        key: type.name.toLowerCase().replace(/\s+/g, '_'),
        label: type.name,
        color: type.color,
        description: type.description,
        details: type.details || [],
      }));
      setClassificationOptions(options);
    }
  }, [classificationTypes, typesLoading]);

  // Fetch barangay, municipality, and generate QR code when ID tab is opened
  useEffect(() => {
    if (activeTab !== "residentid" || !viewResident) return;
    setIdTabLoading(true);
    setIdTabError("");
    setBarangayData(null);
    setMunicipalityData(null);
    setQrCodeUrl("");
    setPunongBarangay(null);
    (async () => {
      try {
        // Fetch barangay
        const barangayRes = await api.get(
          `/${viewResident.barangay_id}/barangay`
        );
        let barangay = null;
        if (barangayRes.data && barangayRes.data.data) {
          barangay = barangayRes.data.data;
        } else if (barangayRes.data) {
          barangay = barangayRes.data;
        }
        setBarangayData(barangay);

        // Fetch municipality
        let municipalityId = null;
        if (barangay && (barangay.municipality_id || barangay.municipalityId)) {
          municipalityId = barangay.municipality_id || barangay.municipalityId;
        }
        if (municipalityId) {
          try {
            // Use the new endpoint to get municipality by ID
            const muniRes = await api.get(`/municipality/${municipalityId}`);
            let muni = null;
            if (muniRes.data && muniRes.data.data) {
              muni = muniRes.data.data;
            } else if (muniRes.data) {
              muni = muniRes.data;
            }
            setMunicipalityData(muni);
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching municipality:", error);
}
            setMunicipalityData(null);
          }
        } else {
          setMunicipalityData(null);
        }

        // Find punong barangay from officials
        setPunongBarangayLoading(true);
        try {
          const officialsRes = await api.get(
            `/list/${viewResident.barangay_id}/official`
          );
          let pb = null;
          if (officialsRes.data && officialsRes.data.data) {
            // Try exact match first
            pb = officialsRes.data.data.find(
              (official) =>
                official.position === "Barangay Captain (Punong Barangay)"
            );

            // If not found, try partial match
            if (!pb) {
              pb = officialsRes.data.data.find(
                (official) =>
                  official.position &&
                  official.position.toLowerCase().includes("punong barangay")
              );
            }

          }
          setPunongBarangay(pb);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching punong barangay:", error);
}
          setPunongBarangay(null);
        } finally {
          setPunongBarangayLoading(false);
        }

        // Generate QR code
        const encryptedId = encryptId(viewResident.resident_id);
        const qr = await QRCode.toDataURL(encryptedId, {
          width: 120,
          margin: 1,
        });
        setQrCodeUrl(qr);
      } catch (err) {
        setIdTabError("Failed to load ID data.");
        setBarangayData(null);
        setMunicipalityData(null);
      } finally {
        setIdTabLoading(false);
      }
    })();
  }, [activeTab, viewResident]);

  // Debounce search input and update searchTerm
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchInput]);

  // Fetch puroks for filter
  useEffect(() => {
    if (!barangayId) return;
    api
      .get(`/list/${barangayId}/purok`)
      .then((res) => {
        setPuroks(res.data.data || []);
      })
      .catch(() => setPuroks([]));
  }, [barangayId]);

  // Fetch barangays for filter

  useEffect(() => {
    api
      .get(`/list/barangay`)
      .then((res) => {
        setBarangays(res.data.data || []);
      })
      .catch(() => setBarangays([]));
  }, []);

  // Function to fetch residents data
  const fetchResidents = useCallback(async () => {
    if (!barangayId) {
      return;
    }
    setLoading(true);
    setError(null);

    // Prepare params
    const params = {
      ...(role === "barangay"
        ? {
            purokId:
              filterPurok === "all" ? undefined : filterPurok || undefined,
          }
        : {
            barangayId:
              filterPurok === "all" ? undefined : filterPurok || undefined,
          }),
      classificationType:
        filterClassification === "all" ? undefined : filterClassification,
      search: searchTerm || undefined,
      page,
      perPage,
    };

    // Only add barangayId if user.target_type is 'barangay'
    if (user?.target_type === "barangay") {
      params.barangayId = barangayId;
    }

    try {
      const res = await api.get("/list/residents", { params });
      const data = res.data.data;
      setResidents(data.data || data || []);
      setTotal(data.pagination?.totalRecords || data.total || 0);
      if (data.pagination) {
        setPage(data.pagination.page || 1);
        setPerPage(data.pagination.perPage || 10);
      }
    } catch (err) {
      console.error('❌ fetchResidents: API call failed:', err);
      setError("Failed to fetch residents");
      setResidents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [barangayId, role, filterPurok, filterClassification, searchTerm, page, perPage, user?.target_type]);

  // Create a stable refresh function that doesn't change
  const stableRefresh = useCallback(async () => {
    console.log('🔄 stableRefresh called - triggering fetchResidents');
    if (!barangayId) {
      console.log('❌ stableRefresh: No barangayId, skipping fetch');
      return;
    }
    setLoading(true);
    setError(null);

    // Prepare params
    const params = {
      ...(role === "barangay"
        ? {
            purokId:
              filterPurok === "all" ? undefined : filterPurok || undefined,
          }
        : {
            barangayId:
              filterPurok === "all" ? undefined : filterPurok || undefined,
          }),
      classificationType:
        filterClassification === "all" ? undefined : filterClassification,
      search: searchTerm || undefined,
      page,
      perPage,
    };

    // Only add barangayId if user.target_type is 'barangay'
    if (user?.target_type === "barangay") {
      params.barangayId = barangayId;
    }

    try {
      console.log('🌐 stableRefresh: Making API call with params:', params);
      const res = await api.get("/list/residents", { params });
      const data = res.data.data;
      console.log('📊 stableRefresh: API response data:', data);
      setResidents(data.data || data || []);
      setTotal(data.pagination?.totalRecords || data.total || 0);
      if (data.pagination) {
        setPage(data.pagination.page || 1);
        setPerPage(data.pagination.perPage || 10);
      }
      console.log('✅ stableRefresh: Data updated successfully');
    } catch (err) {
      console.error('❌ stableRefresh: API call failed:', err);
      setError("Failed to fetch residents");
      setResidents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [barangayId, role, filterPurok, filterClassification, searchTerm, page, perPage, user?.target_type]);

  // Register refresh callback for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(stableRefresh);
    return () => {
      unregister();
    };
  }, [registerRefreshCallback, stableRefresh]);

  // Fetch residents
  useEffect(() => {
    fetchResidents();
  }, [
    barangayId,
    filterPurok,
    filterClassification,
    searchTerm,
    page,
    perPage,
    user?.target_type, // Add user dependency
    refreshTrigger, // Add refresh trigger
  ]);

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "active":
        return "default";
      case "deceased":
        return "destructive";
      case "moved out":
      case "moved_out":
        return "secondary";
      case "temporarily away":
      case "temporarily_away":
        return "outline";
      default:
        return "secondary";
    }
  };

  const handleViewHousehold = async (householdId) => {
    if (!householdId) {
      setHouseholdInfo(null);
      return;
    }
    try {
      const householdData = await fetchHousehold(householdId);
      if (householdData) {
        setHouseholdInfo(householdData);
      }
    } catch (error) {
      logger.error("Error fetching household:", error);
      // Set household info to null if household doesn't exist (404 error)
      if (error.response?.status === 404) {
        setHouseholdInfo(null);
        logger.warn("Household not found, likely deleted. Clearing household info.");
      }
    }
  };

  // Pagination controls
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // Handler for opening view dialog and fetching full info
  const handleView = async (resident) => {
    setViewResidentLoading(true);
    setViewResidentError("");
    setActiveTab("info");
    setViewResident(null);
    try {
      const res = await api.get(`/${resident.id}/resident`);
      setViewResident(res.data.data);
      handleViewHousehold(res.data.data.household_id);
    } catch (err) {
              logger.error("Error", err);
      setViewResidentError("Failed to fetch resident info.");
    } finally {
      setViewResidentLoading(false);
    }
  };

  // Handler for edit functionality
  const handleEdit = async (resident) => {
    setViewResidentLoading(true);
    setViewResidentError("");
    setActiveTab("info");
    setViewResident(null);
    try {
      const res = await api.get(`/${resident.resident_id}/resident`);
      setViewResident(res.data.data);
      // Open view dialog, edit functionality will be handled within it
    } catch (err) {
      setViewResidentError("Failed to fetch resident info.");
    } finally {
      setViewResidentLoading(false);
    }
  };

  // Handler for editing specific groups
  const handleEditInfo = async (resident) => {
    setEditResidentLoading(true);
    setEditResidentError("");
    setEditResident(null);
    try {
      const res = await api.get(`/${resident.resident_id}/resident`);
      setEditResident(res.data.data);
      setEditInfoDialogOpen(true);
      // Close the view dialog when opening edit dialog
      setViewResident(null);
    } catch (err) {
      setEditResidentError("Failed to fetch resident info.");
    } finally {
      setEditResidentLoading(false);
    }
  };

  const handleEditClassifications = async (resident) => {
    setEditResidentLoading(true);
    setEditResidentError("");
    setEditResident(null);
    try {
      const res = await api.get(`/${resident.resident_id}/resident`);
      setEditResident(res.data.data);
      setEditClassificationsDialogOpen(true);
      // Close the view dialog when opening edit dialog
      setViewResident(null);
    } catch (err) {
      setEditResidentError("Failed to fetch resident info.");
    } finally {
      setEditResidentLoading(false);
    }
  };

  const handleEditImage = async (resident) => {
    setEditResidentLoading(true);
    setEditResidentError("");
    setEditResident(null);
    try {
      const res = await api.get(`/${resident.resident_id}/resident`);
      setEditResident(res.data.data);
      setEditImageDialogOpen(true);
      // Close the view dialog when opening edit dialog
      setViewResident(null);
    } catch (err) {
      setEditResidentError("Failed to fetch resident info.");
    } finally {
      setEditResidentLoading(false);
    }
  };

  // Handler for saving edit
  const handleEditSave = async (formValues, dialogType = "info", resident) => {
    setEditResidentLoading(true);
    setEditResidentError("");

    let payload;

    if (dialogType === "classifications") {
      // For classifications dialog, swap: use resident for personal info, formValues for classifications/indigenousPerson
      const formattedClassifications = (formValues.classifications || []).map(
        ({ type, details }) => ({
          type: type,
          details: details || "",
        })
      );

      payload = {
        barangayId: resident.barangay_id,
        lastName: resident.last_name,
        firstName: resident.first_name,
        middleName: resident.middle_name,
        suffix: resident.suffix,
        sex: resident.sex,
        civilStatus: resident.civil_status,
        birthdate: resident.birthdate,
        birthplace: resident.birthplace,
        contactNumber: resident.contact_number,
        email: resident.email,
        occupation: resident.occupation,
        monthlyIncome: resident.monthly_income,
        employmentStatus: resident.employment_status,
        educationAttainment: resident.education_attainment,
        residentStatus: resident.resident_status,
        indigenousPerson: formValues.indigenous_person,
        classifications: formattedClassifications,
        picturePath: resident.picture_path, // Preserve existing image
      };
    } else if (dialogType === "image") {
      // For image dialog, use resident for all data, formValues for image
      const formattedClassifications = editResident.classifications.map(
        ({
          classification_id,
          classification_type,
          classification_details,
        }) => ({
          type: classification_type,
          details: classification_details || "",
        })
      );

      payload = {
        barangayId: editResident.barangay_id,
        lastName: editResident.last_name,
        firstName: editResident.first_name,
        middleName: editResident.middle_name,
        suffix: editResident.suffix,
        sex: editResident.sex,
        civilStatus: editResident.civil_status,
        birthdate: editResident.birthdate,
        birthplace: editResident.birthplace,
        contactNumber: editResident.contact_number,
        email: editResident.email,
        occupation: editResident.occupation,
        monthlyIncome: editResident.monthly_income,
        employmentStatus: editResident.employment_status,
        educationAttainment: editResident.education_attainment,
        residentStatus: editResident.resident_status,
        indigenousPerson: editResident.indigenous_person,
        classifications: formattedClassifications,
        picturePath: editResident.picture_path, // Will be updated with new image
      };
    } else {
      // For info dialog, use formValues for personal info, resident for classifications
      const formattedClassifications = resident.classifications.map(
        ({
          classification_id,
          classification_type,
          classification_details,
        }) => ({
          type: classification_type,
          details: classification_details || "",
        })
      );

      payload = {
        barangayId: editResident.barangay_id,
        lastName: formValues.last_name,
        firstName: formValues.first_name,
        middleName: formValues.middle_name,
        suffix: formValues.suffix,
        sex: formValues.sex,
        civilStatus: formValues.civil_status,
        birthdate: formValues.birthdate,
        birthplace: formValues.birthplace,
        contactNumber: formValues.contact_number,
        email: formValues.email,
        occupation: formValues.occupation,
        monthlyIncome: formValues.monthly_income,
        employmentStatus: formValues.employment_status,
        educationAttainment: formValues.education_attainment,
        residentStatus: formValues.resident_status,
        indigenousPerson: formValues.indigenous_person,
        classifications: formattedClassifications,
        picturePath: editResident.picture_path, // Preserve existing image
      };
    }

    try {
              logger.debug("Payload", payload);

      // Use the unified auto refresh system for update operation
      await handleCRUDOperation(
        async (data) => {
          if (dialogType === "image") {
            // For image updates, create FormData with both payload and image
            const formData = new FormData();

            // Add all the resident data to FormData
            Object.keys(data.payload).forEach((key) => {
              if (key === "classifications") {
                formData.append(key, JSON.stringify(data.payload[key]));
              } else {
                formData.append(key, data.payload[key] || "");
              }
            });

            // Add the image file if it exists
            if (data.formValues instanceof FormData) {
              const imageFile = data.formValues.get("picturePath");
              if (imageFile) {
                formData.append("picturePath", imageFile);
              }
            }

            return await api.put(`/${data.resident_id}/resident`, formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            });
          } else {
            // For other updates, use JSON payload
            return await api.put(`/${data.resident_id}/resident`, data.payload);
          }
        },
        { 
          resident_id: editResident.resident_id,
          payload,
          formValues,
          dialogType
        }
      );

      // Close the appropriate dialog based on type
      if (dialogType === "info") {
        setEditInfoDialogOpen(false);
      } else if (dialogType === "classifications") {
        setEditClassificationsDialogOpen(false);
      } else if (dialogType === "image") {
        setEditImageDialogOpen(false);
      }
      setEditResident(null);
      
      toast({
        title: "Resident Updated Successfully!",
        description: `Resident ${editResident?.first_name || editResident?.last_name || 'information'} has been updated successfully`,
      });

      setSearchInput("");
      setSearchTerm("");
    } catch (err) {
      handleCrudError(err, 'update');
      setEditResidentError("Failed to update resident.");
    } finally {
      setEditResidentLoading(false);
    }
  };

  // Print and download handlers
  const handlePrint = async () => {
    setPrintLoading(true);
    try {
      // Convert front card to image
      const frontCard = document.querySelector(".id-card-front");
      const backCard = document.querySelector(".id-card-back");
      
      if (!frontCard || !backCard) {
        toast({
          title: "Print Error",
          description: "ID card elements not found. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Convert both cards to canvas images with high quality
      const frontCanvas = await html2canvas(frontCard, {
        scale: 4, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        foreignObjectRendering: false,
        // Remove width and height to use natural element size
      });

      const backCanvas = await html2canvas(backCard, {
        scale: 4, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        foreignObjectRendering: false,
        // Remove width and height to use natural element size
      });

      // Convert canvas to image data URLs with maximum quality
      const frontImageDataUrl = frontCanvas.toDataURL('image/png', 1.0);
      const backImageDataUrl = backCanvas.toDataURL('image/png', 1.0);

      // Create print window with the images
      const win = window.open("", "", "width=900,height=600");
      
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Resident ID Card - Print</title>
            <style>
              @page {
                size: A4;
                margin: 10mm;
              }
              
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
              }
              
              .print-container {
                display: flex;
                flex-direction: row;
                gap: 10mm;
                align-items: flex-start;
                padding: 0;
                position: absolute;
                top: 10mm;
                left: 10mm;
              }
              
              .card-image {
                width: 54mm;
                height: 85.6mm;
                object-fit: contain;
                border: 1px solid #ccc;
                page-break-inside: avoid;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
              }
              
              @media print {
                @page {
                  size: A4;
                  margin: 10mm;
                }
                
                body {
                  margin: 0;
                  padding: 0;
                }
                
                .print-container {
                  display: flex;
                  flex-direction: row;
                  gap: 10mm;
                  align-items: flex-start;
                  padding: 0;
                  position: absolute;
                  top: 10mm;
                  left: 10mm;
                }
                
                .card-image {
                  width: 54mm !important;
                  height: 85.6mm !important;
                  object-fit: contain;
                  border: 1px solid #ccc;
                  page-break-inside: avoid;
                  image-rendering: -webkit-optimize-contrast;
                  image-rendering: crisp-edges;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <img src="${frontImageDataUrl}" alt="Resident ID Card Front" class="card-image" />
              <img src="${backImageDataUrl}" alt="Resident ID Card Back" class="card-image" />
            </div>
          </body>
        </html>
      `;
      
      win.document.write(printHTML);
      win.document.close();
      win.focus();
      
      // Wait for images to load, then print
      setTimeout(() => {
        win.print();
        win.close();
      }, 1000);
      
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error('Error generating print images:', error);
}
      toast({
        title: "Print Error",
        description: "Failed to generate print images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPrintLoading(false);
    }
  };
  const handleDownloadImage = async () => {
    setDownloadImageLoading(true);
    try {
      const frontCard = document.querySelector(".id-card-front");
      const backCard = document.querySelector(".id-card-back");
      
      if (!frontCard || !backCard) {
        toast({
          title: "Download Error",
          description: "ID card elements not found. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Convert front card to image with high quality
      const frontCanvas = await html2canvas(frontCard, {
        scale: 4, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        foreignObjectRendering: false,
        // Remove width and height to use natural element size
      });

      // Download front card with maximum quality
      const frontLink = document.createElement("a");
      frontLink.download = `resident-id-${viewResident.resident_id}-front.png`;
      frontLink.href = frontCanvas.toDataURL('image/png', 1.0);
      frontLink.click();

      // Convert back card to image with high quality
      const backCanvas = await html2canvas(backCard, {
        scale: 4, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        foreignObjectRendering: false,
        // Remove width and height to use natural element size
      });

      // Download back card with maximum quality
      const backLink = document.createElement("a");
      backLink.download = `resident-id-${viewResident.resident_id}-back.png`;
      backLink.href = backCanvas.toDataURL('image/png', 1.0);
      backLink.click();

      toast({
        title: "Download Successful",
        description: "Both ID card images have been downloaded.",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error('Error downloading images:', error);
}
      toast({
        title: "Download Error",
        description: "Failed to download images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadImageLoading(false);
    }
  };
  const handleDownloadPDF = async () => {
    setDownloadPDFLoading(true);
    try {
      const frontCard = document.querySelector(".id-card-front");
      const backCard = document.querySelector(".id-card-back");
      
      if (!frontCard || !backCard) {
        toast({
          title: "PDF Error",
          description: "ID card elements not found. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Convert both cards to canvas images with high quality
      const frontCanvas = await html2canvas(frontCard, {
        scale: 4, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        foreignObjectRendering: false,
        // Remove width and height to use natural element size
      });

      const backCanvas = await html2canvas(backCard, {
        scale: 4, // Higher scale for better quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: true,
        foreignObjectRendering: false,
        // Remove width and height to use natural element size
      });

      // Convert canvas to image data URLs with maximum quality
      const frontImgData = frontCanvas.toDataURL("image/png", 1.0);
      const backImgData = backCanvas.toDataURL("image/png", 1.0);

      // Create PDF with both cards
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate card dimensions in mm (54mm x 85.6mm)
      const cardWidth = 54;
      const cardHeight = 85.6;
      
      // Center the cards on the page
      const frontX = (pageWidth - cardWidth) / 2;
      const frontY = 20;
      const backX = (pageWidth - cardWidth) / 2;
      const backY = frontY + cardHeight + 20;

      // Add front card with high quality
      pdf.addImage(frontImgData, "PNG", frontX, frontY, cardWidth, cardHeight);
      
      // Add back card with high quality
      pdf.addImage(backImgData, "PNG", backX, backY, cardWidth, cardHeight);

      // Add labels
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("FRONT SIDE", pageWidth / 2, frontY - 5, { align: "center" });
      pdf.text("BACK SIDE", pageWidth / 2, backY - 5, { align: "center" });

      pdf.save(`resident-id-${viewResident.resident_id}.pdf`);

      toast({
        title: "PDF Download Successful",
        description: "ID card PDF has been downloaded.",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error('Error generating PDF:', error);
}
      toast({
        title: "PDF Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadPDFLoading(false);
    }
  };

  const [deleteResidentDialogOpen, setDeleteResidentDialogOpen] =
    useState(false);
  const [residentToDelete, setResidentToDelete] = useState(null);

  const handleDeleteResident = (resident) => {
    setResidentToDelete(resident);
    setDeleteResidentDialogOpen(true);
    setViewResident(null);
  };

  const handleDeleteResidentConfirm = async () => {
    if (!residentToDelete) return;
    console.log('🗑️ Starting delete operation for resident:', residentToDelete.resident_id);
    try {
      // Use the unified auto refresh system for delete operation
      await handleCRUDOperation(
        async (data) => {
          console.log('🚀 Making API delete call for resident:', data.resident_id);
          return await api.delete(`/${data.resident_id}/resident`);
        },
        { resident_id: residentToDelete.resident_id }
      );
      
      console.log('✅ Delete operation completed successfully');
      toast({
        title: "Resident Deleted Successfully!",
        description: `Resident ${residentToDelete.first_name} ${residentToDelete.last_name} has been deleted`,
      });

      setDeleteResidentDialogOpen(false);
      setResidentToDelete(null);
      setSearchInput("");
      setSearchTerm("");
    } catch (err) {
      console.error('❌ Delete operation failed:', err);
      toast({
        title: "Delete Failed",
        description: "Failed to delete resident. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Export residents function
  const handleExportResidents = async () => {
    try {
      setExportLoading(true);

      // Prepare filter parameters
      const params = {
        ...(role === "barangay"
          ? {
              purokId:
                filterPurok === "all" ? undefined : filterPurok || undefined,
            }
          : {
              barangayId:
                filterPurok === "all" ? undefined : filterPurok || undefined,
            }),
        classificationType:
          filterClassification === "all" ? undefined : filterClassification,
        search: searchTerm || undefined,
      };

      // Determine the export URL based on user role
      let exportUrl;
      if (role === "municipality") {
        exportUrl = "/export/residents";
      } else {
        exportUrl = `/export/${barangayId}/residents`;
      }

      const response = await api.get(exportUrl, {
        params,
        responseType: "blob",
      });

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Set filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const prefix =
        role === "municipality" ? "municipality-residents" : "residents";
      link.setAttribute("download", `${prefix}-export-${timestamp}.xlsx`);

      // Trigger download
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Residents data has been exported successfully.",
      });

      setIsExportDialogOpen(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Export error:", error);
}
      toast({
        title: "Export Failed",
        description: "Failed to export residents data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Import residents function
  const handleImportResidents = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to import.",
        variant: "destructive",
      });
      return;
    }

    try {
      setImportLoading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("barangayId", barangayId);

      const response = await api.post(
        `/import/${barangayId}/residents`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Use the unified auto refresh system for import operation
      await handleCRUDOperation(
        async (data) => {
          return response; // The API call was already made above
        },
        { response }
      );
      
      toast({
        title: "Import Successful!",
        description: `${response.data.importedCount} residents imported successfully`,
      });

      setSearchInput("");
      setSearchTerm("");
      setIsImportDialogOpen(false);
      setSelectedFile(null); // Reset selected file
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Import error:", error);
}
      handleCrudError(error, 'import');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Cache refresh handler for residents page */}
      <CacheRefreshHandler page="residents" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Residents Management</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage and track all barangay residents
          </p>
        </div>
        {role !== "municipality" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <RefreshControls 
              variant="outline"
              size="sm"
            />
            <CacheRefreshButton 
              patterns={['residents:*', 'resident:*']}
              variant="outline"
              size="sm"
              children="Refresh Cache"
            />
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(true)}
              disabled={exportLoading}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              {exportLoading ? (
                <LoadingSpinner message="Exporting..." variant="default" size="sm" compact={true} />
              ) : (
                "Export"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              disabled={importLoading}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
              {importLoading ? (
                <LoadingSpinner message="Importing..." variant="default" size="sm" compact={true} />
              ) : (
                "Import"
              )}
            </Button>
            <AddResidentDialog
              role={role}
              onSuccess={async () => {
                // Handle successful creation with auto-refresh
                await executeRefresh();

                setSearchInput("");
                setSearchTerm("");
              }}
            />
          </div>
        )}
        {role === "municipality" && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setIsExportDialogOpen(true)}
              disabled={exportLoading}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              {exportLoading ? (
                <LoadingSpinner message="Exporting..." variant="default" size="sm" compact={true} />
              ) : (
                "Export"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <ResidentsFilters
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        filterPurok={filterPurok}
        setFilterPurok={setFilterPurok}
        puroks={puroks}
        filterClassification={filterClassification}
        setFilterClassification={setFilterClassification}
        classificationOptions={classificationOptions}
        setPage={setPage}
        barangays={barangays.data || []}
        role={role}
      />

      {/* Resident Stats */}
      <ResidentStats
        residents={residents}
        filterPurok={filterPurok}
        filterClassification={filterClassification}
        classificationOptions={classificationOptions}
      />

      {/* Residents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Residents List</CardTitle>
          <CardDescription>Total residents: {total}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResidentsTable
            residents={residents}
            loading={loading}
            error={error}
            page={page}
            totalPages={totalPages}
            perPage={perPage}
            total={total}
            handlePrev={handlePrev}
            handleNext={handleNext}
            setPerPage={setPerPage}
            role={role}
            handleView={handleView}
            handleEdit={handleEdit}
          />
        </CardContent>
      </Card>
      {/* Resident View/Edit Dialog */}
      <ResidentViewDialog
        householdInfo={householdInfo}
        open={!!(viewResident || viewResidentLoading || viewResidentError)}
        onOpenChange={(open) => {
          if (!open) {
            setViewResident(null);
            setViewResidentError("");
            setActiveTab("info");
          }
        }}
        viewResident={viewResident}
        viewResidentLoading={viewResidentLoading}
        viewResidentError={viewResidentError}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        idTabLoading={idTabLoading}
        idTabError={idTabError}
        formatLabel={formatLabel}
        formatDateLong={formatDateLong}
        getAge={getAge}
        getStatusColor={getStatusColor}
        classificationOptions={classificationOptions}
        getDetailLabel={(type, key) =>
          getDetailLabel(type, key, classificationOptions)
        }
        role={role}
        sexOptions={sexOptions}
        civilStatusOptions={civilStatusOptions}
        employmentStatusOptions={employmentStatusOptions}
        educationAttainmentOptions={educationAttainmentOptions}
        residentStatusOptions={residentStatusOptions}
        indigenousPersonOptions={indigenousPersonOptions}
        onResidentUpdated={({ updated, payload }) => {
          if (updated) {
            // Auto refresh will be triggered by the backend cache invalidation
            setSearchInput("");
            setSearchTerm("");
          }
        }}
        onEditInfo={handleEditInfo}
        onEditClassifications={handleEditClassifications}
        onEditImage={handleEditImage}
        onEditHouseholds={() => {}} // Removed as per edit hint
        barangayData={barangayData}
        municipalityData={municipalityData}
        qrCodeUrl={qrCodeUrl}
        punongBarangay={punongBarangay}
        punongBarangayLoading={punongBarangayLoading}
                 handlePrint={handlePrint}
         handleDownloadImage={handleDownloadImage}
         handleDownloadPDF={handleDownloadPDF}
         printLoading={printLoading}
         downloadImageLoading={downloadImageLoading}
         downloadPDFLoading={downloadPDFLoading}
         onDelete={handleDeleteResident}
         hideActions={user?.target_type === "municipality"}
      />

      {/* Resident Edit Dialogs */}

             {/* Edit Info Dialog */}
       <Dialog open={editInfoDialogOpen} onOpenChange={setEditInfoDialogOpen}>
         <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Resident Information</DialogTitle>
            <DialogDescription>
              Update basic resident information
            </DialogDescription>
          </DialogHeader>
          {editResidentLoading ? (
            <LoadingSpinner 
              message="Loading resident data..." 
              variant="default"
              size="sm"
            />
          ) : editResidentError ? (
            <div className="text-center text-destructive py-8">
              {editResidentError}
            </div>
          ) : editResident ? (
            (logger.debug("Edit Resident", editResident),
            (
              <ResidentInfoForm
                resident={editResident}
                onSubmit={(formValues) =>
                  handleEditSave(formValues, "info", editResident)
                }
                onCancel={() => {
                  setEditInfoDialogOpen(false);
                  setEditResident(null);
                }}
                loading={editResidentLoading}
                sexOptions={sexOptions}
                civilStatusOptions={civilStatusOptions}
                employmentStatusOptions={employmentStatusOptions}
                educationAttainmentOptions={educationAttainmentOptions}
                residentStatusOptions={residentStatusOptions}
                indigenousPersonOptions={indigenousPersonOptions}
              />
            ))
          ) : null}
        </DialogContent>
      </Dialog>

             {/* Edit Classifications Dialog */}
       <Dialog
         open={editClassificationsDialogOpen}
         onOpenChange={setEditClassificationsDialogOpen}
       >
         <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Classifications</DialogTitle>
            <DialogDescription>
              Update resident classifications and details
            </DialogDescription>
          </DialogHeader>
          {editResidentLoading ? (
            <LoadingSpinner 
              message="Loading classifications..." 
              variant="default"
              size="sm"
            />
          ) : editResidentError ? (
            <div className="text-center text-destructive py-8">
              {editResidentError}
            </div>
          ) : editResident ? (
              <div className="space-y-4">
                {/* Tip Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-blue-900">Quick Tips</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Select multiple classifications if needed</li>
                        <li>• Missing a classification? Add it in Settings → Classification tab</li>
                        <li>• Some classifications have additional details to fill</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <ResidentClassificationsForm
                  resident={editResident}
                  onSubmit={(formValues) =>
                    handleEditSave(formValues, "classifications", editResident)
                  }
                  onCancel={() => {
                    setEditClassificationsDialogOpen(false);
                    setEditResident(null);
                  }}
                  loading={editResidentLoading}
                  role={role}
                  classificationOptions={classificationOptions}
                />
              </div>
          ) : null}
        </DialogContent>
      </Dialog>

             {/* Edit Image Dialog */}
       <Dialog open={editImageDialogOpen} onOpenChange={setEditImageDialogOpen}>
         <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Resident Image</DialogTitle>
            <DialogDescription>
              Update resident's profile picture
            </DialogDescription>
          </DialogHeader>
          {editResidentLoading ? (
            <LoadingSpinner 
              message="Loading image data..." 
              variant="default"
              size="sm"
            />
          ) : editResidentError ? (
            <div className="text-center text-destructive py-8">
              {editResidentError}
            </div>
          ) : editResident ? (
            <ResidentImageForm
              resident={editResident}
              onSubmit={(formValues) =>
                handleEditSave(formValues, "image", editResident)
              }
              onCancel={() => {
                setEditImageDialogOpen(false);
                setEditResident(null);
              }}
              loading={editResidentLoading}
            />
          ) : null}
        </DialogContent>
      </Dialog>

             {/* Edit Households Dialog */}
       <Dialog open={false} onOpenChange={() => {}}>
         <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Household Associations</DialogTitle>
            <DialogDescription>
              Update resident's household associations
            </DialogDescription>
          </DialogHeader>
          {/* This dialog is removed as per the edit hint */}
        </DialogContent>
      </Dialog>

             {/* Export Residents Dialog */}
       <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
         <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-blue-600" />
              <span>Export Residents</span>
            </DialogTitle>
            <DialogDescription>
              Download all residents data in Excel format for backup or
              analysis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                📊 Data Included in Export
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>• Complete resident information</p>
                <p>• Personal details and contact info</p>
                <p>• Classifications and status</p>
                <p>• Household associations</p>
                <p>• Employment and education data</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>File Format:</strong> Excel (.xlsx) with organized
                worksheets
              </p>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Filename:</strong> residents-export-YYYY-MM-DD.xlsx
              </p>
            </div>

                           <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsExportDialogOpen(false)}
                disabled={exportLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportResidents}
                disabled={exportLoading}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                <span>
                  {exportLoading ? (
                    <LoadingSpinner message="Exporting..." variant="default" size="sm" compact={true} />
                  ) : (
                    "Export Residents"
                  )}
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

             {/* Import Residents Dialog */}
       <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
         <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-green-600" />
              <span>Import Residents</span>
            </DialogTitle>
            <DialogDescription>
              Import residents data from an Excel file. Follow the step-by-step process below.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Indicator - Similar to AddResidentDialog */}
          <div className="mb-6">
            <Progress value={selectedFile ? 66 : 33} />
            <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 text-xs mt-1">
              <span className={!selectedFile ? "font-bold" : "text-muted-foreground"}>
                Step 1: Review Requirements
              </span>
              <span className={selectedFile && !importLoading ? "font-bold" : "text-muted-foreground"}>
                Step 2: Select File
              </span>
              <span className={importLoading ? "font-bold" : "text-muted-foreground"}>
                Step 3: Import Data
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Step 1: Import Guide */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <span>Import Requirements & Format</span>
              </div>
              
                             <div className="grid grid-cols-1 gap-4 lg:gap-6">
                {/* Required Fields Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <h4 className="font-semibold text-red-700">Required Fields</h4>
                  </div>
                  <div className="space-y-2">
                    {[
                      { field: "first_name", label: "First Name", desc: "Resident's first name" },
                      { field: "last_name", label: "Last Name", desc: "Resident's last name" },
                      { field: "birth_date", label: "Birth Date", desc: "Date of birth (YYYY-MM-DD)" },
                      { field: "gender", label: "Gender", desc: "Male or Female" },
                      { field: "civil_status", label: "Civil Status", desc: "Single, Married, Widowed, Separated, Divorced" },
                      { field: "employment_status", label: "Employment Status", desc: "Employed, Unemployed, Self-employed, Student, Retired" }
                    ].map((item) => (
                      <div key={item.field} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-md">
                        <code className="text-xs font-mono bg-red-100 px-1 py-0.5 rounded text-red-700 min-w-[100px]">
                          {item.field}
                        </code>
                        <div className="text-xs">
                          <div className="font-medium text-red-800">{item.label}</div>
                          <div className="text-red-600">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Fields Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <h4 className="font-semibold text-blue-700">Optional Fields</h4>
                  </div>
                  <div className="space-y-2">
                    {[
                      { field: "middle_name", label: "Middle Name", desc: "Middle name" },
                      { field: "suffix", label: "Suffix", desc: "Name suffix (Jr., Sr., etc.)" },
                      { field: "birth_place", label: "Birth Place", desc: "Place of birth" },
                      { field: "occupation", label: "Occupation", desc: "Occupation" },
                      { field: "educational_attainment", label: "Education", desc: "Education level" },
                      { field: "contact_number", label: "Contact Number", desc: "Phone number" },
                      { field: "email", label: "Email", desc: "Email address" }
                    ].map((item) => (
                      <div key={item.field} className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <code className="text-xs font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-700 min-w-[100px]">
                          {item.field}
                        </code>
                        <div className="text-xs">
                          <div className="font-medium text-blue-800">{item.label}</div>
                          <div className="text-blue-600">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Valid Values Guide */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                  <div className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold">
                    !
                  </div>
                  Valid Values Guide
                </h4>
                                 <div className="grid grid-cols-1 gap-4 text-sm">
                  {[
                    { field: "gender", values: ["Male", "Female"], note: "case-insensitive" },
                    { field: "civil_status", values: ["Single", "Married", "Widowed", "Separated", "Divorced", "Live In"], note: "case-insensitive" },
                    { field: "employment_status", values: ["Employed", "Unemployed", "Self-employed", "Student", "Retired"], note: "case-insensitive" },
                    { field: "educational_attainment", values: ["Primary School", "Elementary Graduate", "High School Graduate", "Bachelor's Degree", "Master's Degree", "PhD"], note: "examples" }
                  ].map((item) => (
                    <div key={item.field} className="space-y-1">
                      <div className="font-medium text-amber-800">
                        <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-700">{item.field}</code>:
                      </div>
                      <div className="text-amber-700 text-xs">
                        {item.values.join(", ")} <span className="text-amber-600">({item.note})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* File Requirements */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-xs font-bold">
                    📄
                  </div>
                  File Requirements
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Excel format (.xlsx) only</li>
                  <li>• First row must contain column headers</li>
                  <li>• Dates must be in YYYY-MM-DD format</li>
                  <li>• Maximum 1000 residents per import</li>
                  <li>• All status values are case-insensitive</li>
                </ul>
              </div>
            </div>

            {/* Step 2: Download Template & File Upload */}
                         <div className="space-y-4">
               <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                 <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                   2
                 </div>
                 <span>Download Template & Select File</span>
               </div>

              {/* Download Template */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Template
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  Download our template to ensure your data is in the correct format.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Create and download template
                    const templateData = [
                      {
                        first_name: "Juan",
                        last_name: "Dela Cruz",
                        middle_name: "Santos",
                        suffix: "Jr.",
                        birth_date: "1990-01-15",
                        birth_place: "Manila",
                        gender: "Male",
                        civil_status: "Married",
                        employment_status: "Employed",
                        occupation: "Engineer",
                        educational_attainment: "Bachelor's Degree",
                        contact_number: "09123456789",
                        email: "juan.delacruz@email.com",
                      },
                    ];

                    const workbook = XLSX.utils.book_new();
                    const sheet = XLSX.utils.json_to_sheet(templateData);
                    XLSX.utils.book_append_sheet(workbook, sheet, "Template");

                    XLSX.writeFile(workbook, "residents-import-template.xlsx");
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-green-600" />
                  <Label htmlFor="import-file" className="text-base font-medium">Select Excel File</Label>
                </div>
                <Input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setSelectedFile(file);
                  }}
                  disabled={importLoading}
                  className="border-2 border-dashed border-green-200 hover:border-green-300 transition-colors"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Supported formats: .xlsx, .xls (Max size: 10MB)
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700 font-medium">
                      ✓ Selected: {selectedFile.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Import Action */}
                         <div className="space-y-4">
               <div className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                 <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold">
                   3
                 </div>
                 <span>Import Data</span>
               </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setSelectedFile(null);
                  }}
                  disabled={importLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportResidents}
                  disabled={importLoading || !selectedFile}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {importLoading ? (
                    <>
                      <LoadingSpinner 
                        message="Importing..." 
                        variant="default"
                        size="sm"
                      />
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Residents
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        type="resident"
        data={residentToDelete}
        open={deleteResidentDialogOpen}
        onOpenChange={setDeleteResidentDialogOpen}
        onConfirm={handleDeleteResidentConfirm}
        loading={false}
      />
    </div>
  );
};

export default ResidentsPage;
