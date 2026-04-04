import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Upload, X, Camera, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResidentImageForm = ({
  resident,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Set initial image preview if resident has an image
  useEffect(() => {
    if (resident?.picture_path) {
      const SERVER_URL =
        import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
      setImagePreview(
        `${SERVER_URL}/${resident.picture_path.replace(/\\/g, "/")}`
      );
    }
  }, [resident]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
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
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions and try again.",
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "resident-photo.jpg", {
            type: "image/jpeg",
          });
          setSelectedImage(file);
          
          // Create object URL with error handling
          try {
            const objectUrl = URL.createObjectURL(blob);
            setImagePreview(objectUrl);
          } catch (error) {
            console.error("Error creating object URL:", error);
            // Fallback to data URL
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(blob);
          }
        }
        
        setShowCamera(false);
        if (stream) {
          stream.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
          setStream(null);
        }
      }, "image/jpeg", 0.8);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedImage) {
      toast({
        title: "Error",
        description: "Please select or capture an image",
        variant: "destructive",
      });
      return;
    }

    // Create FormData for file upload
    const submitData = new FormData();

    // Add image if selected
    if (selectedImage) {
      submitData.append("picturePath", selectedImage);
    }

    // Add metadata to indicate this is a partial update for image only
    submitData.append(
      "_metadata",
      JSON.stringify({
        updateType: "partial",
        changedFields: ["picturePath"],
      })
    );

    onSubmit(submitData);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Resident Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Image Preview */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-center block">
              Current Image
            </Label>
            <div className="flex justify-center">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Resident preview"
                    className="w-48 h-48 object-cover rounded-lg border shadow-sm"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-48 h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/20">
                  <div className="text-center">
                    <User className="h-16 w-16 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No image uploaded
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload and Capture Buttons */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Upload or Capture Image
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById("image").click()}
                className="flex items-center gap-2 flex-1"
              >
                <Upload className="h-4 w-4" />
                Upload Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCameraCapture}
                className="flex items-center gap-2 flex-1"
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
            </div>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground text-center">
              Supported formats: JPG, PNG, GIF. Max size: 5MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-96 h-72 object-cover rounded"
                style={{ display: 'block', width: '100%', height: 'auto' }}
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex gap-2 mt-4 justify-center">
              <Button onClick={capturePhoto}>Capture</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCamera(false);
                  if (stream) {
                    stream.getTracks().forEach((track) => {
                      track.stop();
                      track.enabled = false;
                    });
                    setStream(null);
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Updating...
            </div>
          ) : (
            "Update Picture"
          )}
        </Button>
      </div>
    </div>
  );
};

export default ResidentImageForm;
