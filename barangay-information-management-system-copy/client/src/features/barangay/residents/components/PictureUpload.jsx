import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Upload, X, Camera, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function PictureUpload({
  pictureFile,
  picturePreview,
  setPictureFile,
  setPicturePreview,
  onBack,
  onSave,
  onCancel,
  isSubmitting = false,
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPictureFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPicturePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === "https:";
      if (!isSecure) {
        alert("Camera access requires HTTPS. Please use the HTTPS development server.");
        return;
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Your browser doesn't support camera access. Please use Chrome, Firefox, or Edge.");
        return;
      }

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
          setPictureFile(file);
          
          // Create object URL with error handling
          try {
            const objectUrl = URL.createObjectURL(blob);
            setPicturePreview(objectUrl);
          } catch (error) {
            console.error("Error creating object URL:", error);
            // Fallback to data URL
            const reader = new FileReader();
            reader.onload = (e) => setPicturePreview(e.target.result);
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
    setPictureFile(null);
    setPicturePreview(null);
  };

  return (
    <>
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
              {picturePreview ? (
                <div className="relative">
                  <img
                    src={picturePreview}
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
      <div className="flex justify-between gap-2 mt-6">
        <div>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
          <Button 
            variant="hero" 
            onClick={onSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Adding Resident...
              </div>
            ) : (
              "Save Resident"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
