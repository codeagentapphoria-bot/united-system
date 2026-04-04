import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { Image, Upload, Camera, X, Trash2 } from "lucide-react";

// Schema for images management
const imagesSchema = z.object({
  images: z.array(z.any()).optional(),
});

const HouseholdImagesForm = ({
  household,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(imagesSchema),
    defaultValues: {
      images: [],
    },
    mode: "onTouched",
  });

  // Populate form with household data
  useEffect(() => {
    if (household && household.household_image_path) {
      let householdImages = [];

      // Parse household_image_path if it's a string, or use as is if it's already an array
      if (typeof household.household_image_path === "string") {
        try {
          householdImages = JSON.parse(household.household_image_path);
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
  console.warn("Failed to parse household_image_path:", error);
}
          householdImages = [];
        }
      } else if (Array.isArray(household.household_image_path)) {
        householdImages = household.household_image_path;
      }

      // Transform existing images to the format expected by the form
      const transformedImages = householdImages.map((image, index) => ({
        id: `existing-${index}`,
        filename:
          typeof image === "string"
            ? image
            : image.filename || image.path || image,
        preview: `${
          import.meta.env.VITE_SERVER_URL || "localhost:5000"
        }/uploads/households/${
          typeof image === "string"
            ? image
            : image.filename || image.path || image
        }`,
        isNew: false,
        isExisting: true,
      }));

      setImages(transformedImages);
      form.setValue("images", transformedImages);
    }
  }, [household, form]);

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

    if (
      validFiles.length + images.filter((img) => !img.isRemoved).length >
      10
    ) {
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
      isNew: true,
    }));

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    form.setValue("images", updatedImages);
  };

  const handleRemoveImage = (imageId) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === imageId);
      if (imageToRemove && imageToRemove.preview && imageToRemove.isNew) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      // For existing images, mark as removed instead of filtering out
      if (imageToRemove && imageToRemove.isExisting) {
        const updated = prev.map((img) =>
          img.id === imageId ? { ...img, isRemoved: true } : img
        );
        form.setValue("images", updated);
        return updated;
      } else {
        // For new images, filter out completely
        const updated = prev.filter((img) => img.id !== imageId);
        form.setValue("images", updated);
        return updated;
      }
    });
  };

  const handleRestoreImage = (imageId) => {
    setImages((prev) => {
      const updated = prev.map((img) =>
        img.id === imageId ? { ...img, isRemoved: false } : img
      );
      form.setValue("images", updated);
      return updated;
    });
  };

  // Camera functions
  const startCamera = async () => {
    try {
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === "https:";
      if (!isSecure) {
        toast({
          title: "HTTPS Required",
          description: "Camera access requires HTTPS. Please use the HTTPS development server.",
          variant: "destructive",
        });
        return;
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Camera Not Supported",
          description: "Your browser doesn't support camera access. Please use Chrome, Firefox, or Edge.",
          variant: "destructive",
        });
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", // Use back camera if available
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
      
      let errorMessage = "Unable to access camera. Please check permissions.";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found. Please connect a camera and try again.";
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "Camera not supported. Please use a different browser.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is in use by another application. Please close other camera apps.";
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
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

            if (images.filter((img) => !img.isRemoved).length >= 10) {
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
                  isNew: true,
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
              isNew: true,
            };

            const updatedImages = [...images, newImage];
            setImages(updatedImages);
            form.setValue("images", updatedImages);
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

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.preview && img.isNew) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, []);

  const handleSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Transform data for API - preserve existing images that weren't removed
      const newFiles = images
        .filter((img) => img.isNew && img.file)
        .map((img) => img.file);
      const existingImages = images
        .filter((img) => img.isExisting && !img.isRemoved) // Only include existing images that weren't removed
        .map((img) => img.filename);

      // If we have new files, we need to handle them separately
      if (newFiles.length > 0) {
        // Create FormData for file upload
        const formData = new FormData();

        // Add existing images as JSON string
        formData.append("existing_images", JSON.stringify(existingImages));

        // Add new files
        newFiles.forEach((file) => {
          formData.append("household_image_path", file);
        });

        // Add metadata to indicate this is a partial update
        formData.append(
          "_metadata",
          JSON.stringify({
            updateType: "partial",
            changedFields: ["household_image_path"],
          })
        );

        // Call onSubmit with FormData
        await onSubmit(formData);
      } else {
        // No new files, just update existing images
        const transformedData = {
          household_image_path: existingImages,
        };
        await onSubmit(transformedData);
      }

      toast({
        title: "Success",
        description: "Household images updated successfully!",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to update household images:", error);
}
      toast({
        title: "Error",
        description: "Failed to update household images",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Household Images</Label>
          <div className="text-sm text-muted-foreground">
            {images.filter((img) => !img.isRemoved).length}/10 images
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
          <div className="grid grid-cols-2 gap-4">
            {/* Image Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={images.filter((img) => !img.isRemoved).length >= 10}
              />
              <label
                htmlFor="image-upload"
                className={`cursor-pointer flex flex-col items-center space-y-2 ${
                  images.filter((img) => !img.isRemoved).length >= 10
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
                disabled={images.filter((img) => !img.isRemoved).length >= 10}
                className={`w-full h-full flex flex-col items-center justify-center space-y-2 ${
                  images.filter((img) => !img.isRemoved).length >= 10
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <Camera className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Take Photo
                  </p>
                  <p className="text-xs text-gray-500">Use camera to capture</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Image Preview Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className={`relative group ${
                  image.isRemoved ? "opacity-50" : ""
                }`}
              >
                <img
                  src={image.preview}
                  alt="Household"
                  className={`w-full h-32 object-cover rounded-lg border ${
                    image.isRemoved ? "grayscale" : ""
                  }`}
                />
                {!image.isRemoved && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(image.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                {image.isRemoved && (
                  <>
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      Removed
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreImage(image.id)}
                      className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  </>
                )}
                {image.isNew && !image.isRemoved && (
                  <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    New
                  </div>
                )}
                {image.isExisting && !image.isRemoved && (
                  <div className="absolute top-2 left-2 bg-gray-500 text-white text-xs px-2 py-1 rounded">
                    Existing
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

export default HouseholdImagesForm;
