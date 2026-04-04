import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import logger from "@/utils/logger";
import { Input } from "@/components/ui/input";
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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { residentSchema } from "@/utils/residentSchema";
import {
  sexOptions,
  civilStatusOptions,
  employmentStatusOptions,
  educationAttainmentOptions,
  residentStatusOptions,
  indigenousPersonOptions,
  residentSteps,
} from "./constant/options";
import { useClassificationTypes } from "@/hooks/useClassificationTypes";
import ResidentInfoForm from "./components/ResidentInfoForm";
import ClassificationGuide from "@/components/ui/ClassificationGuide";
import ClassificationForm from "./components/ClassificationForm";
import PictureUpload from "./components/PictureUpload";
import api from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";

export default function AddResidentDialog({ role, onSuccess }) {
  logger.debug("AddResidentDialog rendered");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [classifications, setClassifications] = useState({});
  // Add this state to track the current step
  const [addStep, setAddStep] = useState(0);
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState(null);
  const [residentInfo, setResidentInfo] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set up unified auto refresh for resident creation
  const { handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'resident',
    successMessage: 'Resident created successfully!',
    autoRefresh: true,
    refreshDelay: 100
  });
  
  // Use dynamic classification types
  const { classificationTypes, loading: typesLoading } = useClassificationTypes();
  const [classificationOptions, setClassificationOptions] = useState([]);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      lastName: "",
      firstName: "",
      middleName: "",
      suffix: "",
      sex: "",
      civilStatus: "",
      birthdate: "",
      birthplace: "",
      contactNumber: "",
      email: "",
      occupation: "",
      monthlyIncome: "",
      employmentStatus: "",
      educationAttainment: "",
      residentStatus: "",
      indigenousPerson: "",
    },
    mode: "onTouched",
  });
  const totalFields = 11 + classificationOptions.length;
  const filledFields =
    Object.values(watch()).filter(Boolean).length +
    Object.values(classifications).filter(Boolean).length;
  const progressValue = Math.round((filledFields / totalFields) * 100);

  // Populate classification options from dynamic data
  useEffect(() => {
    logger.debug('AddResidentDialog - classificationTypes:', classificationTypes);
    logger.debug('AddResidentDialog - typesLoading:', typesLoading);
    
    if (classificationTypes && classificationTypes.length > 0) {
      const options = classificationTypes.map(type => ({
        key: type.name.toLowerCase().replace(/\s+/g, '_'),
        label: type.name,
        color: type.color,
        description: type.description,
        details: type.details || [],
      }));
            logger.debug('AddResidentDialog - Setting dynamic options:', options);
      setClassificationOptions(options);
    }
  }, [classificationTypes, typesLoading]);

  // Handler for moving to the next step after validation in Step 1
  const handleNextStep1 = async (data) => {
    setResidentInfo(data);
    setAddStep((prev) => prev + 1);
  };

  // Add this mapping function before handleSubmitResident
  function toCamelCase(obj) {
    const map = {
      first_name: "firstName",
      last_name: "lastName",
      middle_name: "middleName",
      sex: "sex",
      birthdate: "birthdate",
      civil_status: "civilStatus",
      contact_number: "contactNumber",
      email: "email",
      occupation: "occupation",
      employment_status: "employmentStatus",
      education_attainment: "educationAttainment",
      resident_status: "residentStatus",
      indigenous_person: "indigenousPerson",
      purok_id: "purokId",
    };
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[map[key] || key] = value;
    }
    return result;
  }

  // Handler for final submission (Step 3)
  const handleSubmitResident = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Use the unified auto refresh system for create operation
      await handleCRUDOperation(
        async (data) => {
          const formData = new FormData();
          // Map residentInfo to camelCase for backend
          const camelResidentInfo = toCamelCase(data.residentInfo);
          Object.entries(camelResidentInfo).forEach(([key, value]) => {
            formData.append(key, value);
          });
          // Transform classifications object to array for backend
          const classificationTypeMap = Object.fromEntries(
            data.classificationOptions.map((opt) => [opt.key, opt.label])
          );
          const classificationArray = Object.entries(data.classifications)
            .filter(([type, details]) => {
              const label = classificationTypeMap[type];
              return label && details && Object.keys(details).length > 0;
            })
            .map(([type, details]) => {
              const label = classificationTypeMap[type];
              const detailStr = Object.values(details).filter(Boolean).join(" | ");
              const obj = { type: label };
              if (detailStr) obj.details = detailStr;
              return obj;
            });
          formData.append("classifications", JSON.stringify(classificationArray));
          // Add picture file as 'picturePath'
          if (data.pictureFile) {
            formData.append("picturePath", data.pictureFile);
          }
          
          return await api.post("/resident", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        },
        { 
          residentInfo,
          classifications,
          classificationOptions,
          pictureFile
        }
      );
      
      toast({ title: "Resident added successfully!" });
      setIsAddDialogOpen(false);
      // Call the onSuccess callback to refresh parent data
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({ title: "Failed to add resident", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form state when dialog closes
  const handleDialogChange = (open) => {
    setIsAddDialogOpen(open);
    if (!open) {
      // Reset all form state when dialog closes
      setAddStep(0);
      setClassifications({});
      setPictureFile(null);
      setPicturePreview(null);
      setResidentInfo({});
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isAddDialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Resident
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Resident</DialogTitle>
          <DialogDescription>
            Enter the resident's information below
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4">
          <Progress value={((addStep + 1) / residentSteps.length) * 100} />
          <div className="flex justify-between text-xs mt-1">
            {residentSteps.map((step, idx) => (
              <span
                key={step.key}
                className={
                  addStep === idx ? "font-bold" : "text-muted-foreground"
                }
              >
                {step.label}
              </span>
            ))}
          </div>
        </div>
        {/* Step 1: Resident Info */}
        {addStep === 0 && (
          <ResidentInfoForm
            resident={residentInfo}
            onSubmit={handleNextStep1}
            onCancel={() => setIsAddDialogOpen(false)}
            stepMode={true}
            nextLabel="Next"
            sexOptions={sexOptions}
            civilStatusOptions={civilStatusOptions}
            employmentStatusOptions={employmentStatusOptions}
            educationAttainmentOptions={educationAttainmentOptions}
            residentStatusOptions={residentStatusOptions}
            indigenousPersonOptions={indigenousPersonOptions}
          />
        )}
        {/* Step 2: Classifications */}
        {addStep === 1 && (
          <ClassificationForm
            classificationOptions={classificationOptions}
            classifications={classifications}
            setClassifications={setClassifications}
            onBack={() => setAddStep(addStep - 1)}
            onNext={() => setAddStep(addStep + 1)}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        )}
        {/* Step 3: Picture */}
        {addStep === 2 && (
          <PictureUpload
            pictureFile={pictureFile}
            picturePreview={picturePreview}
            setPictureFile={setPictureFile}
            setPicturePreview={setPicturePreview}
            onBack={() => setAddStep(addStep - 1)}
            onSave={handleSubmitResident}
            onCancel={() => setIsAddDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
