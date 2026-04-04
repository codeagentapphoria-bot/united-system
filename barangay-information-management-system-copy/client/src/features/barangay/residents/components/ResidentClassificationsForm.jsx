import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { BadgeCheck, User } from "lucide-react";
import api from "@/utils/api";
import { useClassificationTypes } from "@/hooks/useClassificationTypes";
import { handleError } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import ClassificationGuide from "@/components/ui/ClassificationGuide";

// Schema for resident classifications with details
const classificationsSchema = z.object({
  classifications: z.array(z.string()).optional(),
  classificationDetails: z.record(z.any()).optional(),
});

const ResidentClassificationsForm = ({
  resident,
  onSubmit,
  onCancel,
  loading = false,
  classificationOptions = [],
  municipalityId,
  showResidentInfo = true,
  showActions = true,
  formId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { classificationTypes, loading: typesLoading } = useClassificationTypes(municipalityId);
  const [localClassificationOptions, setLocalClassificationOptions] = useState(
    []
  );

  const form = useForm({
    resolver: zodResolver(classificationsSchema),
    defaultValues: {
      classifications: [],
      classificationDetails: {},
    },
    mode: "onTouched",
  });

  // Fetch classification options
  useEffect(() => {
    if (classificationOptions && classificationOptions.length > 0) {
      setLocalClassificationOptions(classificationOptions);
      return;
    }

    // Use dynamic classification types from the database
    if (classificationTypes && classificationTypes.length > 0) {
      const options = classificationTypes.map(type => ({
        key: type.name,
        label: type.name,
        color: type.color,
        description: type.description,
        details: type.details || [],
      }));
      setLocalClassificationOptions(options);
    }
  }, [classificationOptions, classificationTypes, typesLoading]);

  // Function to normalize classification values
  const normalizeClassificationValue = (value, options) => {
    if (!value) return "";
    const normalizedValue = value.toLowerCase();
    const matchingOption = options.find(
      (opt) =>
        opt.key.toLowerCase() === normalizedValue ||
        opt.label.toLowerCase() === normalizedValue
    );
    return matchingOption ? matchingOption.key : value;
  };

  // Populate form with resident data
  useEffect(() => {
    if (resident && resident.classifications && resident.classifications.length > 0) {
      logger.debug(
        "ResidentClassificationsForm - Resident classifications:",
        resident.classifications
      );

      const currentClassifications = resident.classifications.map((c) => {
        const classificationValue =
          c.classification_type || c.classification || c;
        return normalizeClassificationValue(
          classificationValue,
          localClassificationOptions
        );
      });

      // Extract classification details
      const classificationDetails = {};
      resident.classifications.forEach((c) => {
        const classificationKey =
          c.classification_type || c.classification || c;
        const normalizedKey = normalizeClassificationValue(
          classificationKey,
          localClassificationOptions
        );

        if (c.classification_details) {
          if (typeof c.classification_details === "string") {
            // Handle string format (pipe-separated)
            const detailsArray = c.classification_details
              .split("|")
              .map((s) => s.trim());
            const option = localClassificationOptions.find(
              (opt) => opt.key === normalizedKey
            );
            if (option && option.details) {
              option.details.forEach((detail, index) => {
                if (detailsArray[index]) {
                  if (!classificationDetails[normalizedKey]) {
                    classificationDetails[normalizedKey] = {};
                  }
                  classificationDetails[normalizedKey][detail.key] =
                    detailsArray[index];
                }
              });
            }
          } else if (typeof c.classification_details === "object") {
            // Handle object format
            if (!classificationDetails[normalizedKey]) {
              classificationDetails[normalizedKey] = {};
            }
            Object.assign(
              classificationDetails[normalizedKey],
              c.classification_details
            );
          }
        }
      });

      logger.debug(
        "ResidentClassificationsForm - Mapped classifications:",
        currentClassifications
      );
      logger.debug(
        "ResidentClassificationsForm - Classification details:",
        classificationDetails
      );

      form.reset({
        classifications: currentClassifications,
        classificationDetails: classificationDetails,
      });
    }
  }, [resident, form, localClassificationOptions]);

  const handleSubmit = async (data) => {
    logger.debug("Data", data);
    setIsSubmitting(true);
    try {
      // Transform data: keep details as a keyed object so labels can be shown in the UI
      const transformedData = {
        classifications: data.classifications.map((classification) => {
          const details = data.classificationDetails[classification] || {};
          const option = localClassificationOptions.find(
            (opt) => opt.key === classification
          );

          return {
            type: option ? option.label : classification,
            details: Object.keys(details).length > 0 ? details : null,
          };
        }),
      };
      logger.debug("Transformed Data", transformedData);
      await onSubmit(transformedData);
    } catch (error) {
      handleError("Failed to update classifications:", error);
      throw error; // Re-throw the error so parent can handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClassificationChange = (classification, checked) => {
    const currentClassifications = form.watch("classifications") || [];
    const currentDetails = form.watch("classificationDetails") || {};

    if (checked) {
      form.setValue("classifications", [
        ...currentClassifications,
        classification,
      ]);
      // Initialize empty details for new classification
      if (!currentDetails[classification]) {
        form.setValue("classificationDetails", {
          ...currentDetails,
          [classification]: {},
        });
      }
    } else {
      form.setValue(
        "classifications",
        currentClassifications.filter((c) => c !== classification)
      );
      // Remove details for unchecked classification
      const newDetails = { ...currentDetails };
      delete newDetails[classification];
      form.setValue("classificationDetails", newDetails);
    }
  };

  const handleDetailChange = (classification, detailKey, value) => {
    const currentDetails = form.watch("classificationDetails") || {};
    form.setValue("classificationDetails", {
      ...currentDetails,
      [classification]: {
        ...currentDetails[classification],
        [detailKey]: value,
      },
    });
  };

  const renderDetailField = (classification, detail) => {
    const currentDetails = form.watch("classificationDetails") || {};
    const currentValue = currentDetails[classification]?.[detail.key] || "";

    if (detail.type === "select" && detail.options) {
      return (
        <Select
          value={currentValue}
          onValueChange={(value) =>
            handleDetailChange(classification, detail.key, value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${detail.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {detail.options.map((option) => {
              const val = typeof option === "string" ? option : option.value;
              const lbl = typeof option === "string" ? option : option.label;
              return (
                <SelectItem key={val} value={val}>{lbl}</SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        placeholder={`Enter ${detail.label.toLowerCase()}`}
        value={currentValue}
        onChange={(e) =>
          handleDetailChange(classification, detail.key, e.target.value)
        }
      />
    );
  };

  return (
    <form id={formId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Resident Info Card — hidden when parent modal already shows the name */}
      {showResidentInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Resident Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Name</Label>
                <p className="font-medium">
                  {resident?.first_name} {resident?.middle_name ? resident.middle_name : ""} {resident?.last_name}{resident?.suffix ? ` ${resident.suffix}` : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classifications Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" />
            Resident Classifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Select the classifications that apply to this resident. You can
              select multiple classifications.
            </p>

            {/* Classification Checkboxes */}
            {localClassificationOptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localClassificationOptions.map((option) => {
                  const isChecked =
                    form.watch("classifications")?.includes(option.key) || false;

                  return (
                    <div key={option.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.key}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleClassificationChange(option.key, checked)
                        }
                      />
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: option.color || '#4CAF50' }}
                        />
                        <Label
                          htmlFor={option.key}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.label}
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !typesLoading ? (
              <ClassificationGuide />
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading classification types...</p>
              </div>
            )}

            {/* Classification Details */}
            {form.watch("classifications")?.map((classification) => {
              const option = localClassificationOptions.find(
                (opt) => opt.key === classification
              );
              if (!option || !option.details) return null;

              return (
                <Card key={classification} className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {option.label} Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {option.details.map((detail) => (
                        <div key={detail.key} className="space-y-2">
                          <Label htmlFor={`${classification}-${detail.key}`}>
                            {detail.label}
                          </Label>
                          {renderDetailField(classification, detail)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Selected Classifications Display */}
            {form.watch("classifications")?.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Selected Classifications:
                </Label>
                <div className="flex flex-wrap gap-2">
                  {form.watch("classifications").map((classification) => {
                    const option = localClassificationOptions.find(
                      (opt) => opt.key === classification
                    );
                    return option ? (
                      <Badge
                        key={classification}
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: option.color || '#4CAF50',
                          color: 'white',
                        }}
                      >
                        <BadgeCheck className="h-3 w-3 mr-1" />
                        {option.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {showActions && (
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
      )}
    </form>
  );
};

export default ResidentClassificationsForm;
