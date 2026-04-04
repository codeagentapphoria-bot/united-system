import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { MapPin, Navigation, Locate, Crosshair } from "lucide-react";
import ReactSelect from "react-select";
import BarangayBoundaryMap from "@/components/common/BarangayBoundaryMap";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/utils/api";
import { handleError, handleErrorSilently } from "@/utils/errorHandler";
import logger from "@/utils/logger";

// ReactSelect styles to match the design
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
};

// Schema for location management
const locationSchema = z.object({
  houseNumber: z.string().optional(),
  street: z.string().optional(),
  purokId: z.string().min(1, "Purok is required"),
  area: z.string().optional(),
  geom: z
    .object({
      lat: z.string().optional(),
      lng: z.string().optional(),
    })
    .optional(),
});

const HouseholdLocationForm = ({
  household,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [puroks, setPuroks] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState([11.6081, 125.4311]); // Default to Borongan City
  const { user } = useAuth();

  const form = useForm({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      houseNumber: "",
      street: "",
      purokId: "",
      area: "",
      geom: { lat: "", lng: "" },
    },
    mode: "onTouched",
  });

  // Fetch puroks
  useEffect(() => {
    const fetchPuroks = async () => {
      try {
        const response = await api.get(`/list/${user.target_id}/purok`);
        setPuroks(response.data.data || []);
      } catch (error) {
        handleErrorSilently("Failed to fetch puroks:", error);
      }
    };

    fetchPuroks();
  }, [user.target_id]);

  // Populate form with household data
  useEffect(() => {
    if (household) {
      // Parse geometry if it's a string or GeoJSON
      let geom = null;
      if (household.geom) {
        if (typeof household.geom === "string") {
          // Handle GeoJSON format
          try {
            const geoJson = JSON.parse(household.geom);
            if (geoJson.type === "Point" && geoJson.coordinates) {
              const [lng, lat] = geoJson.coordinates;
              geom = { lat: lat.toString(), lng: lng.toString() };
              setSelectedLocation([lat, lng]);
              setMapCenter([lat, lng]);
            }
          } catch (e) {
            // Fallback to POINT format
            const match = household.geom.match(/POINT\(([^)]+)\)/);
            if (match) {
              const [lng, lat] = match[1].split(" ").map(Number);
              geom = { lat: lat.toString(), lng: lng.toString() };
              setSelectedLocation([lat, lng]);
              setMapCenter([lat, lng]);
            }
          }
        } else if (household.geom.lat && household.geom.lng) {
          geom = {
            lat: household.geom.lat.toString(),
            lng: household.geom.lng.toString(),
          };
          setSelectedLocation([
            Number(household.geom.lat),
            Number(household.geom.lng),
          ]);
          setMapCenter([
            Number(household.geom.lat),
            Number(household.geom.lng),
          ]);
        }
      }

      form.reset({
        houseNumber: household.house_number || "",
        street: household.street || "",
        purokId: "", // Will be set after puroks load
        area: household.area || "",
        geom: geom || { lat: "", lng: "" },
      });
    }
  }, [household, form]);

  // Populate purok after puroks are loaded
  useEffect(() => {
    if (household && household.purok_id && puroks.length > 0) {
      logger.debug("Setting purokId:", household.purok_id);
      logger.debug("Available puroks:", puroks);
      form.setValue("purokId", String(household.purok_id));
    }
  }, [household, puroks, form]);

  const getPurokOptions = () => {
    return puroks.map((purok) => ({
      value: String(purok.purok_id),
      label: purok.purok_name,
    }));
  };

  const handleMapClick = (latlng) => {
    // Handle both array format [lat, lng] and object format {lat, lng}
    const lat = Array.isArray(latlng) ? latlng[0] : latlng.lat;
    const lng = Array.isArray(latlng) ? latlng[1] : latlng.lng;

    setSelectedLocation([lat, lng]);
    setMapCenter([lat, lng]); // Center map on selected location
    form.setValue("geom", {
      lat: lat.toString(),
      lng: lng.toString(),
    });
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
            
            setSelectedLocation([finalLat, finalLng]);
            setMapCenter([finalLat, finalLng]);
            form.setValue("geom", {
              lat: finalLat.toString(),
              lng: finalLng.toString(),
            });
            
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
          handleErrorSilently("Error getting location:", error);
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

  const handleClearLocation = () => {
    setSelectedLocation(null);
    form.setValue("geom", { lat: "", lng: "" });
    toast({
      title: "Info",
      description: "Location cleared",
    });
  };

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Transform data for API - preserve existing data that's not being updated
      const transformedData = {
        house_number: data.houseNumber,
        street: data.street,
        purok_id: data.purokId,
        area: data.area,
        geom:
          data.geom.lat && data.geom.lng
            ? {
                lat: parseFloat(data.geom.lat),
                lng: parseFloat(data.geom.lng),
              }
            : household?.geom || null, // Preserve existing geom if not provided
      };

      await onSubmit(transformedData);
      toast({
        title: "Success",
        description: "Location updated successfully!",
      });
    } catch (error) {
      handleError("Failed to update location:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* House Number */}
        <div className="space-y-2">
          <Label htmlFor="houseNumber">House Number</Label>
          <Input
            id="houseNumber"
            placeholder="Enter house number"
            {...form.register("houseNumber")}
          />
        </div>

        {/* Street */}
        <div className="space-y-2">
          <Label htmlFor="street">Street</Label>
          <Input
            id="street"
            placeholder="Enter street name"
            {...form.register("street")}
          />
        </div>

        {/* Purok */}
        <div className="space-y-2">
          <Label htmlFor="purokId">Purok</Label>
          <ReactSelect
            id="purokId"
            name="purokId"
            options={getPurokOptions()}
            value={
              form.watch("purokId")
                ? getPurokOptions().find(
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

        {/* Area */}
        <div className="space-y-2">
          <Label htmlFor="area">Area (sqm)</Label>
          <Input
            id="area"
            type="number"
            placeholder="Enter area in square meters"
            {...form.register("area")}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Click on the map to set the household location or use the location
          button to get your current position.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetMyLocation}
            disabled={isGettingLocation}
            className="flex items-center gap-2"
          >
            <Locate className="h-4 w-4" />
            {isGettingLocation ? "Getting..." : "Get My Location"}
          </Button>
          {selectedLocation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearLocation}
              className="flex items-center gap-2"
            >
              <Crosshair className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Map Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location on Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Coordinates Display */}
            {selectedLocation &&
              selectedLocation.length === 2 &&
              selectedLocation[0] !== null &&
              selectedLocation[1] !== null && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-blue-600" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Latitude:
                      </span>
                      <span className="text-sm text-gray-900 ml-2 font-mono">
                        {Number(selectedLocation[0]).toFixed(6)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-green-600" />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Longitude:
                      </span>
                      <span className="text-sm text-gray-900 ml-2 font-mono">
                        {Number(selectedLocation[1]).toFixed(6)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            {/* Map */}
            <div className="h-64 rounded-md overflow-hidden border">
              {logger.debug(
                "Rendering map with selectedLocation:",
                selectedLocation
              )}
              <BarangayBoundaryMap
                center={mapCenter}
                onSelect={handleMapClick}
                area={parseFloat(form.watch("area")) || undefined}
                popupData={{
                  houseHead: household?.house_head || "",
                  houseNumber: form.watch("houseNumber"),
                  purok: (() => {
                    const purokId = form.watch("purokId");
                    const purok = puroks.find(
                      (p) => String(p.purok_id) === String(purokId)
                    );
                    return purok ? purok.purok_name : "";
                  })(),
                }}
                barangayId={household?.barangay_id || user.target_id}
                readOnly={false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

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

export default HouseholdLocationForm;
