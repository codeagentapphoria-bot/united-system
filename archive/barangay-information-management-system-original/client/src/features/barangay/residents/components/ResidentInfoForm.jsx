import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import logger from "@/utils/logger";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { User, Phone, Mail, Calendar, MapPin } from "lucide-react";

// Schema for basic resident info
const residentInfoSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  middle_name: z.string().optional(),
  sex: z.string().min(1, "Sex is required"),
  birthdate: z.string().min(1, "Birthdate is required"),
  birthplace: z.string().optional(),
  civil_status: z.string().min(1, "Civil status is required"),
  contact_number: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  occupation: z.string().optional(),
  monthly_income: z.string().optional(),
  employment_status: z.string().min(1, "Employment status is required"),
  education_attainment: z.string().min(1, "Education attainment is required"),
  resident_status: z.string().min(1, "Resident status is required"),
  indigenous_person: z.string().min(1, "Indigent person status is required"),
});

const ResidentInfoForm = ({
  resident,
  onSubmit,
  onCancel,
  loading = false,

  stepMode = false,
  nextLabel = "",
  sexOptions = [],
  civilStatusOptions = [],
  employmentStatusOptions = [],
  educationAttainmentOptions = [],
  residentStatusOptions = [],
  indigenousPersonOptions = [],
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to normalize field values to match options
  const normalizeFieldValue = (value, options) => {
    if (!value) return "";
    const normalizedValue = String(value).toLowerCase();
    const matchingOption = options.find(
      (opt) =>
        String(opt.value).toLowerCase() === normalizedValue ||
        String(opt.label).toLowerCase() === normalizedValue
    );
    return matchingOption ? String(matchingOption.value) : "";
  };

  const form = useForm({
    resolver: zodResolver(residentInfoSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      middle_name: "",
      sex: "",
      birthdate: "",
      civil_status: "",
      contact_number: "",
      email: "",
      occupation: "",
      employment_status: "",
      education_attainment: "",
      resident_status: "",
      indigenous_person: "No",
      birthplace: "",
      monthly_income: "",
    },
    mode: "onTouched",
  });

  // Populate form with resident data or set defaults
  useEffect(() => {
    if (resident) {
      // Initialize form with resident data
      form.reset({
        first_name: resident.first_name || "",
        last_name: resident.last_name || "",
        middle_name: resident.middle_name || "",
        sex: normalizeFieldValue(resident.sex, sexOptions),
        birthdate: resident.birthdate ? resident.birthdate.split("T")[0] : "",
        civil_status: normalizeFieldValue(
          resident.civil_status,
          civilStatusOptions
        ),
        contact_number: resident.contact_number || "",
        email: resident.email || "",
        occupation: resident.occupation || "",
        employment_status: normalizeFieldValue(
          resident.employment_status,
          employmentStatusOptions
        ),
        education_attainment: normalizeFieldValue(
          resident.education_attainment,
          educationAttainmentOptions
        ),
        resident_status: normalizeFieldValue(
          resident.resident_status,
          residentStatusOptions
        ),
        indigenous_person: normalizeFieldValue(
          resident.indigenous_person === true || resident.indigenous_person === "True"
            ? "Yes"
            : "No",
          indigenousPersonOptions
        ),
        birthplace: resident.birthplace || "",
        monthly_income: resident.monthly_income || "",
      });
    } else {
      // Set default values for new resident
      form.reset({
        first_name: "",
        last_name: "",
        middle_name: "",
        sex: "",
        birthdate: "",
        civil_status: "single",
        contact_number: "",
        email: "",
        occupation: "",
        employment_status: "",
        education_attainment: "",
        resident_status: "",
        indigenous_person: "No",
        birthplace: "",
        monthly_income: "",
      });
    }
  }, [
    resident,
    form,
    sexOptions,
    civilStatusOptions,
    employmentStatusOptions,
    educationAttainmentOptions,
    residentStatusOptions,
    indigenousPersonOptions,
  ]);

  const handleSubmit = async (data) => {
    logger.debug("ResidentInfoForm handleSubmit called, data:", data);
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      // Only show toast if not in step mode and not in edit mode (when resident prop is provided)
      if (!stepMode && !resident) {
        toast({
          title: "Success",
          description: "Resident information updated successfully!",
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to update resident info:", error);
}
      if (!stepMode && !resident) {
        toast({
          title: "Error",
          description: "Failed to update resident information",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                placeholder="Enter first name"
                {...form.register("first_name")}
              />
              {form.formState.errors.first_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.first_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                placeholder="Enter last name"
                {...form.register("last_name")}
              />
              {form.formState.errors.last_name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.last_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name (optional)</Label>
              <Input
                id="middle_name"
                placeholder="Enter middle name"
                {...form.register("middle_name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">Sex</Label>
              <Select
                value={form.watch("sex") || resident?.sex || ""}
                onValueChange={(value) => form.setValue("sex", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sex" />
                </SelectTrigger>
                <SelectContent>
                  {sexOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.sex && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.sex.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthdate">Birthdate</Label>
              <Input
                id="birthdate"
                type="date"
                {...form.register("birthdate")}
              />
              {form.formState.errors.birthdate && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.birthdate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthplace">Birthplace (optional)</Label>
              <Input
                id="birthplace"
                placeholder="Enter birthplace"
                {...form.register("birthplace")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="civil_status">Civil Status</Label>
              <Select
                value={form.watch("civil_status") || resident?.civil_status}
                onValueChange={(value) => form.setValue("civil_status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select civil status" />
                </SelectTrigger>
                <SelectContent>
                  {civilStatusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.civil_status && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.civil_status.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number (optional)</Label>
              <Input
                id="contact_number"
                placeholder="Enter contact number"
                {...form.register("contact_number")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment & Education */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Employment & Education
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation (optional)</Label>
              <Input
                id="occupation"
                placeholder="Enter occupation"
                {...form.register("occupation")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employment_status">Employment Status</Label>
              <Select
                value={
                  form.watch("employment_status") || resident?.employment_status
                }
                onValueChange={(value) =>
                  form.setValue("employment_status", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employment status" />
                </SelectTrigger>
                <SelectContent>
                  {employmentStatusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.employment_status && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.employment_status.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="education_attainment">Education Attainment</Label>
              <Select
                value={
                  form.watch("education_attainment") ||
                  resident?.education_attainment
                }
                onValueChange={(value) =>
                  form.setValue("education_attainment", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select education level" />
                </SelectTrigger>
                <SelectContent>
                  {educationAttainmentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.education_attainment && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.education_attainment.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_income">Monthly Income (optional)</Label>
              <Input
                id="monthly_income"
                placeholder="Enter monthly income"
                {...form.register("monthly_income")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status & Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Status & Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resident_status">Resident Status</Label>
              <Select
                value={
                  form.watch("resident_status") || resident?.resident_status
                }
                onValueChange={(value) =>
                  form.setValue("resident_status", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select resident status" />
                </SelectTrigger>
                <SelectContent>
                  {residentStatusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.resident_status && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.resident_status.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="indigenous_person">Indigent Person</Label>
              <Select
                value={
                  form.watch("indigenous_person") ||
                  (resident?.indigenous_person === true || resident?.indigenous_person === "True"
                    ? "Yes"
                    : "No")
                }
                onValueChange={(value) =>
                  form.setValue("indigenous_person", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select indigent status" />
                </SelectTrigger>
                <SelectContent>
                  {indigenousPersonOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.indigenous_person && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.indigenous_person.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="hero"
            disabled={isSubmitting || loading}
          >
            {stepMode
              ? nextLabel || "Next"
              : isSubmitting
              ? "Saving..."
              : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ResidentInfoForm;
