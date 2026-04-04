import api from "@/utils/api";
import { toast } from "@/hooks/use-toast";

class HouseholdUpdateService {
  constructor() {
    this.updateQueue = [];
    this.isProcessing = false;
    this.auditLog = [];
  }

  // Validate household data before update
  validateHouseholdData(data) {
    const errors = [];

    // For partial updates (like location updates, image updates), don't require house head
    // Only require house head for full household creation or when explicitly updating household details
    const houseHeadValue = data.houseHead || data.house_head;
    const isLocationUpdate =
      data.geom ||
      data.house_number ||
      data.houseNumber ||
      data.street ||
      data.purok_id ||
      data.purokId ||
      data.area;
    const isImageUpdate =
      data.household_image_path ||
      (data instanceof FormData && data.has("household_image_path")) ||
      (data instanceof FormData && data.has("existing_images"));

    // Only require house head for full updates, not partial updates (location, images)
    if (
      !houseHeadValue &&
      !data.household_id &&
      !isLocationUpdate &&
      !isImageUpdate
    ) {
      errors.push("Household head is required");
    }

    if (data.geom && (data.geom.lat || data.geom.lng)) {
      const lat = parseFloat(data.geom.lat);
      const lng = parseFloat(data.geom.lng);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push("Invalid latitude value");
      }

      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push("Invalid longitude value");
      }
    }

    // Family validation
    if (data.families) {
      if (Array.isArray(data.families)) {
        data.families.forEach((family, index) => {
          if (!family.familyHeadId && !family.head) {
            errors.push(`Family ${index + 1} must have a head`);
          }
        });
      } else if (typeof data.families === "object") {
        Object.values(data.families).forEach((family, index) => {
          if (!family.familyHeadId && !family.head) {
            errors.push(`Family ${index + 1} must have a head`);
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Transform data for API compatibility
  transformDataForAPI(data) {
    // Handle FormData - return as is since it's already in the correct format
    if (data instanceof FormData) {
      return data;
    }

    const transformed = { ...data };

    // Transform field names for API compatibility
    if (transformed.house_head !== undefined) {
      transformed.houseHead = transformed.house_head; // Convert to camelCase for backend
      delete transformed.house_head; // Remove snake_case
    }

    if (transformed.water_source !== undefined) {
      transformed.waterSource = transformed.water_source; // Convert to camelCase for backend
      delete transformed.water_source; // Remove snake_case
    }

    if (transformed.toilet_facility !== undefined) {
      transformed.toiletFacility = transformed.toilet_facility; // Convert to camelCase for backend
      delete transformed.toilet_facility; // Remove snake_case
    }

    if (transformed.housing_type !== undefined) {
      transformed.housingType = transformed.housing_type; // Convert to camelCase for backend
      delete transformed.housing_type; // Remove snake_case
    }

    if (transformed.structure_type !== undefined) {
      transformed.structureType = transformed.structure_type; // Convert to camelCase for backend
      delete transformed.structure_type; // Remove snake_case
    }

    if (transformed.purok_id !== undefined) {
      transformed.purokId = transformed.purok_id; // Convert to camelCase for backend
      delete transformed.purok_id; // Remove snake_case
    }

    if (transformed.house_number !== undefined) {
      transformed.houseNumber = transformed.house_number; // Convert to camelCase for backend
      delete transformed.house_number; // Remove snake_case
    }

    // Preserve household_image_path as is (no transformation needed)
    // The backend expects this field name as is

    // Transform families structure
    if (transformed.families) {
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
          familiesObj[i] = {
            ...fam,
            familyMembers: membersObj,
            familyHeadId: fam.familyHeadId || fam.head,
          };
        });
        transformed.families = familiesObj;
      }
    }

    // Transform coordinates
    if (transformed.geom) {
      if (transformed.geom.lat && transformed.geom.lng) {
        // Handle object format {lat, lng}
        transformed.geom = {
          lat: parseFloat(transformed.geom.lat),
          lng: parseFloat(transformed.geom.lng),
        };
      } else if (
        typeof transformed.geom === "string" &&
        transformed.geom.startsWith("POINT(")
      ) {
        // Handle WKT format "POINT(lng lat)"
        const match = transformed.geom.match(/POINT\(([^)]+)\)/);
        if (match) {
          const [lng, lat] = match[1].split(" ").map(Number);
          transformed.geom = {
            lat: lat,
            lng: lng,
          };
        }
      } else if (typeof transformed.geom === "string") {
        // Handle GeoJSON format from database (ST_AsGeoJSON)
        try {
          const geoJson = JSON.parse(transformed.geom);
          if (geoJson.type === "Point" && geoJson.coordinates) {
            const [lng, lat] = geoJson.coordinates;
            transformed.geom = {
              lat: lat,
              lng: lng,
            };
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            if (process.env.NODE_ENV === 'development') {
  console.warn("Failed to parse GeoJSON geom:", error);
}
          }
          // Keep the original geom if parsing fails
        }
      }
    }

    // Transform numeric fields
    const numericFields = ["purokId", "barangayId", "area"];
    numericFields.forEach((field) => {
      if (
        transformed[field] !== undefined &&
        transformed[field] !== null &&
        transformed[field] !== ""
      ) {
        // Only convert to number if it's a valid number
        const numValue = Number(transformed[field]);
        if (!isNaN(numValue)) {
          transformed[field] = numValue;
        }
      }
    });

    return transformed;
  }

  // Log update for audit trail
  logUpdate(action, data, result) {
    const logEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      data: { ...data },
      result,
      userId: localStorage.getItem("userId") || "unknown",
      userEmail: localStorage.getItem("userEmail") || "unknown",
    };

    this.auditLog.push(logEntry);

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  // Queue update for batch processing
  queueUpdate(updateData) {
    this.updateQueue.push(updateData);
    this.processQueue();
  }

  // Process queued updates
  async processQueue() {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.updateQueue.length > 0) {
        const update = this.updateQueue.shift();
        await this.processUpdate(update);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error processing update queue:", error);
}
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // Compute differences between old and new data
  computeDataDifferences(oldData, newData) {
    const differences = {};
    const changedFields = [];

    // Helper function to compare values
    const isEqual = (a, b) => {
      if (typeof a !== typeof b) return false;
      if (typeof a === "object" && a !== null && b !== null) {
        return JSON.stringify(a) === JSON.stringify(b);
      }
      return a === b;
    };

    // Compare each field
    for (const key in newData) {
      if (newData.hasOwnProperty(key) && oldData.hasOwnProperty(key)) {
        if (!isEqual(oldData[key], newData[key])) {
          differences[key] = newData[key];
          changedFields.push(key);
        }
      } else if (newData.hasOwnProperty(key)) {
        // New field
        differences[key] = newData[key];
        changedFields.push(key);
      }
    }

    return {
      differences,
      changedFields,
      hasChanges: changedFields.length > 0,
    };
  }

  // Transform data for API with old data inclusion
  transformDataForAPIWithOldData(newData, oldData = null) {
    // Handle FormData - return as is since it's already in the correct format
    if (newData instanceof FormData) {
      return newData;
    }

    const transformedData = this.transformDataForAPI(newData);

    if (oldData) {
      const { differences, changedFields, hasChanges } =
        this.computeDataDifferences(oldData, newData);

      // For partial updates, preserve ALL existing data and only update the changed fields
      const isLocationUpdate =
        newData.geom ||
        newData.house_number ||
        newData.houseNumber ||
        newData.street ||
        newData.purok_id ||
        newData.purokId ||
        newData.area;

      const isImageUpdate =
        newData.household_image_path ||
        (newData instanceof FormData && newData.has("household_image_path")) ||
        (newData instanceof FormData && newData.has("existing_images"));

      const isDetailsUpdate =
        newData.housing_type ||
        newData.housingType ||
        newData.structure_type ||
        newData.structureType ||
        newData.electricity ||
        newData.water_source ||
        newData.waterSource ||
        newData.toilet_facility ||
        newData.toiletFacility;

      // Start with ALL old data (preserve everything)
      const mergedData = { ...this.transformDataForAPI(oldData) };

      // Special handling for household_image_path - preserve old images if not updating
      if (!newData.household_image_path && oldData.household_image_path) {
        // If not updating images, preserve the old images
        // Handle both array and string formats
        if (Array.isArray(oldData.household_image_path)) {
          mergedData.household_image_path = oldData.household_image_path;
        } else if (typeof oldData.household_image_path === "string") {
          try {
            // Try to parse as JSON if it's a string
            mergedData.household_image_path = JSON.parse(
              oldData.household_image_path
            );
          } catch (error) {
            // If parsing fails, treat as single filename
            mergedData.household_image_path = [oldData.household_image_path];
          }
        } else {
          mergedData.household_image_path = oldData.household_image_path;
        }
      }

      // Override with new data (only the fields being updated)
      Object.assign(mergedData, transformedData);

      // Always use house_head_id (resident ID) for all updates
      if (oldData.house_head_id) {
        mergedData.houseHead = oldData.house_head_id; // Always use ID for all updates
      }

      // Ensure geom is preserved if not being updated
      if (!newData.geom && oldData.geom) {
        // If old data has geom but new data doesn't, preserve the original geom
        // The old data might be GeoJSON string from database, so we need to handle it properly
        if (typeof oldData.geom === "string") {
          // Keep the original GeoJSON string from database
          mergedData.geom = oldData.geom;
        } else if (oldData.geom && oldData.geom.lat && oldData.geom.lng) {
          // Convert back to GeoJSON format for database
          mergedData.geom = {
            lat: parseFloat(oldData.geom.lat),
            lng: parseFloat(oldData.geom.lng),
          };
        }
      }

      return {
        ...mergedData,
        _metadata: {
          oldData: this.transformDataForAPI(oldData),
          changedFields,
          hasChanges,
          updateType: "partial",
        },
      };
    }

    return {
      ...transformedData,
      _metadata: {
        updateType: "full",
      },
    };
  }

  // Process individual update
  async processUpdate(updateData) {
    const {
      action,
      householdId,
      data,
      oldData = null,
      options = {},
    } = updateData;

    try {
      // Skip validation for delete operations
      if (action !== "delete") {
        // Validate data
        const validation = this.validateHouseholdData(data);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
        }
      }

      // Transform data with old data inclusion
      const transformedData = this.transformDataForAPIWithOldData(
        data,
        oldData
      );

      // Perform update
      let result;
      switch (action) {
        case "create":
          // Handle file uploads with FormData
          // Check if there are actual File objects (not just filenames)
          const hasFileObjectsCreate =
            transformedData.household_image_path &&
            Array.isArray(transformedData.household_image_path) &&
            transformedData.household_image_path.some(
              (item) => item instanceof File
            );

          if (hasFileObjectsCreate) {
            const formData = new FormData();

            // Add all non-file data
            Object.keys(transformedData).forEach((key) => {
              if (key !== "household_image_path") {
                if (typeof transformedData[key] === "object") {
                  formData.append(key, JSON.stringify(transformedData[key]));
                } else {
                  formData.append(key, transformedData[key]);
                }
              }
            });

            // Add files - ensure household_image_path is an array
            if (
              transformedData.household_image_path &&
              Array.isArray(transformedData.household_image_path)
            ) {
              transformedData.household_image_path.forEach((file, index) => {
                formData.append("household_image_path", file);
              });
            }

            result = await api.post("/household", formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            });
          } else {
            result = await api.post("/household", transformedData);
          }
          break;
        case "update":
          // Handle file uploads with FormData
          // Check if there are actual File objects (not just filenames)
          const hasFileObjects =
            transformedData.household_image_path &&
            Array.isArray(transformedData.household_image_path) &&
            transformedData.household_image_path.some(
              (item) => item instanceof File
            );

          if (hasFileObjects) {
            const formData = new FormData();

            // Add all non-file data
            Object.keys(transformedData).forEach((key) => {
              if (key !== "household_image_path") {
                if (typeof transformedData[key] === "object") {
                  formData.append(key, JSON.stringify(transformedData[key]));
                } else {
                  formData.append(key, transformedData[key]);
                }
              }
            });

            // Add files - ensure household_image_path is an array
            if (
              transformedData.household_image_path &&
              Array.isArray(transformedData.household_image_path)
            ) {
              transformedData.household_image_path.forEach((file, index) => {
                formData.append("household_image_path", file);
              });
            }

            result = await api.put(`/${householdId}/household`, formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            });
          } else {
            result = await api.put(
              `/${householdId}/household`,
              transformedData
            );
          }
          break;
        case "delete":
          result = await api.delete(`/${householdId}/household`);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Log successful update
      this.logUpdate(
        action,
        { householdId, data: transformedData },
        result.data
      );

      // Show success message
      if (options.showToast !== false) {
        const messages = {
          create: "Household created successfully!",
          update: "Household updated successfully!",
          delete: "Household deleted successfully!",
        };
        toast({
          title: messages[action] || "Operation completed successfully!",
        });
      }

      return result.data;
    } catch (error) {
      // Log failed update
      this.logUpdate(action, { householdId, data }, { error: error.message });

      // Show error message
      if (options.showToast !== false) {
        toast({
          title: `Failed to ${action} household`,
          description: error.message,
          variant: "destructive",
        });
      }

      throw error;
    }
  }

  // Get audit log
  getAuditLog(limit = 50) {
    return this.auditLog.slice(-limit);
  }

  // Clear audit log
  clearAuditLog() {
    this.auditLog = [];
  }

  // Get update statistics
  getUpdateStats() {
    const stats = {
      total: this.auditLog.length,
      create: 0,
      update: 0,
      delete: 0,
      errors: 0,
    };

    this.auditLog.forEach((entry) => {
      stats[entry.action]++;
      if (entry.result.error) {
        stats.errors++;
      }
    });

    return stats;
  }

  // Export audit log
  exportAuditLog() {
    const dataStr = JSON.stringify(this.auditLog, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `household-audit-log-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();

    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const householdUpdateService = new HouseholdUpdateService();

export default householdUpdateService;
