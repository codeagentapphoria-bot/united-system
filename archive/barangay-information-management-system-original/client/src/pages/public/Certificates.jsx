import { Layout } from "@/components/common/Layout";
import { handleError } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import { BarangaySelector } from "@/components/common/BarangaySelector";
import {
  FileText,
  QrCode,
  Filter,
  User,
  Mail,
  MapPin,
  Phone,
  Edit,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle,
  Download,
  Eye,
  X,
  Info,
  Camera,
  Copy,
} from "lucide-react";
import html2canvas from "html2canvas";
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { useBarangay } from "@/contexts/BarangayContext";
import { useRequest } from "@/contexts/RequestContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import api from "@/utils/api";
// import { debugCamera } from "@/utils/cameraTest";
import jsQR from "jsqr";

// Add custom styles for QR scanner (copied from pet scanner)
const qrScannerStyles = `
  #qr-reader {
    border: none !important;
    border-radius: 8px !important;
    overflow: hidden !important;
  }
  
  #qr-reader__scan_region {
    background: transparent !important;
  }
  
  #qr-reader__scan_region > img {
    display: none !important;
  }
  
  #qr-reader__camera_selection {
    background: #4CAF50 !important;
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 8px 12px !important;
    font-size: 14px !important;
    margin-bottom: 10px !important;
  }
  
  #qr-reader__camera_selection:hover {
    background: #45a049 !important;
  }
  
  #qr-reader__status_span {
    color: #4CAF50 !important;
    font-weight: 600 !important;
  }
  
  #qr-reader__dashboard {
    background: white !important;
    border-radius: 8px !important;
    padding: 16px !important;
    margin-bottom: 16px !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
  }
  
  #qr-reader__dashboard_section {
    margin-bottom: 12px !important;
  }
  
  #qr-reader__dashboard_section_csr {
    margin-bottom: 12px !important;
  }
  
  #qr-reader__dashboard_section_csr > span {
    color: #666 !important;
    font-size: 14px !important;
  }
  
  #qr-reader__dashboard_section_csr > select {
    background: white !important;
    border: 1px solid #ddd !important;
    border-radius: 4px !important;
    padding: 6px 8px !important;
    margin-left: 8px !important;
    font-size: 14px !important;
  }
  
  #qr-reader__dashboard_section_csr > button {
    background: #4CAF50 !important;
    color: white !important;
    border: none !important;
    border-radius: 4px !important;
    padding: 6px 12px !important;
    font-size: 14px !important;
    cursor: pointer !important;
    margin-left: 8px !important;
  }
  
  #qr-reader__dashboard_section_csr > button:hover {
    background: #45a049 !important;
  }
  
  #qr-reader__dashboard_section_csr > button:disabled {
    background: #ccc !important;
    cursor: not-allowed !important;
  }
  
  #qr-reader__scan_region_video {
    border-radius: 8px !important;
    overflow: hidden !important;
  }
  
  #qr-reader__scan_region_highlight {
    border: 2px solid #4CAF50 !important;
    border-radius: 8px !important;
  }
  
  /* Ensure video element is visible */
  #qr-reader video {
    display: block !important;
    width: 100% !important;
    height: auto !important;
    border-radius: 8px !important;
    background: #000 !important;
  }
  
  #qr-reader__scan_region {
    position: relative !important;
  }
  
  #qr-reader canvas {
    display: block !important;
    width: 100% !important;
    height: auto !important;
  }
  
  /* Hide any duplicate or flickering elements */
  #qr-reader video:nth-child(n+2) { 
    display: none !important; 
  }
  #qr-reader canvas:nth-child(n+2) { 
    display: none !important; 
  }
  #qr-reader img { 
    display: none !important; 
  }
  /* Hide any absolute positioned divs that might be flickering */
  #qr-reader div[style*="position: absolute"]:not(#qr-shaded-region):not([id*="qr-"]) { 
    display: none !important; 
  }
  
  /* Hide file upload button - only show camera */
  #qr-reader__dashboard_section_fsr {
    display: none !important;
  }
  
  #qr-reader__filescan_input {
    display: none !important;
  }
  
  /* Ensure camera section is always visible */
  #qr-reader__dashboard_section_csr {
    display: block !important;
  }
  
  /* Make sure video container is properly sized */
  #qr-reader__scan_region {
    min-height: 300px !important;
  }
`;

const Certificates = () => {
  const isMobile = useIsMobile();

  // Enhanced mobile detection - prioritize actual mobile devices over responsive design
  const isMobileDevice =
    isMobile ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    ("ontouchstart" in window && navigator.maxTouchPoints > 0) ||
    // Only use window width for mobile detection if it's a very small screen (actual mobile size)
    window.innerWidth <= 480;

  // Check if it's a real mobile device (not just responsive design)
  const isRealMobileDevice =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  // Check HTTPS and camera compatibility
  const checkCameraCompatibility = () => {
    const issues = [];

    // Check HTTPS
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      issues.push("HTTPS_REQUIRED");
    }

    // Check camera support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      issues.push("CAMERA_NOT_SUPPORTED");
    }

    // Check for secure context
    if (!window.isSecureContext) {
      issues.push("SECURE_CONTEXT_REQUIRED");
    }

    return issues;
  };

  const [serviceType, setServiceType] = useState("certificate");
  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "",
    email: "",
    address: "",
    certificateType: "",
    urgency: "normal",
    purpose: "",
  });

  // Search functionality state (for QR code results only)

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanner, setQrScanner] = useState(null);
  const [qrScannerLoading, setQrScannerLoading] = useState(false);
  const [qrScanInProgress, setQrScanInProgress] = useState(false);
  const [hasShownSuccessToast, setHasShownSuccessToast] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false);
  const [lastScannedQR, setLastScannedQR] = useState("");
  const qrScannerRef = useRef(null);

  // Camera switching state
  const [currentCamera, setCurrentCamera] = useState("environment"); // 'environment' (back) or 'user' (front)
  const [availableCameras, setAvailableCameras] = useState([]);
  const [cameraSwitchLoading, setCameraSwitchLoading] = useState(false);

  // Dialog state
  const [selectedResident, setSelectedResident] = useState(null);
  const [showResidentDialog, setShowResidentDialog] = useState(false);
  const [dialogFormData, setDialogFormData] = useState({
    certificateType: "",
    urgency: "normal",
    purpose: "",
  });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [officials, setOfficials] = useState([]);
  const [officialsLoading, setOfficialsLoading] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState(null);

  const { selectedBarangay } = useBarangay();
  const { submitCertificateRequest, submitAppointmentRequest, loading } =
    useRequest();
  const { toast } = useToast();

  // Inject QR scanner styles when component mounts
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.textContent = qrScannerStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Cleanup QR scanner on component unmount
  useEffect(() => {
    return () => {
      if (qrScanner) {
        qrScanner.clear();
      }
    };
  }, [qrScanner]);

  // Stop scanner when dialog opens
  useEffect(() => {
    if (showResidentDialog && qrScanner) {
      stopQRScanner();
    }
  }, [showResidentDialog]);

  // Fetch officials when barangay is selected
  useEffect(() => {
    if (selectedBarangay && serviceType === "appointment") {
      fetchOfficials();
    }
  }, [selectedBarangay, serviceType]);

  const fetchOfficials = async () => {
    if (!selectedBarangay) return;

    setOfficialsLoading(true);
    try {
      const response = await api.get(
        `/public/list/${selectedBarangay.id}/official`
      );
      setOfficials(response.data.data || []);
    } catch (error) {
      handleError(error, "Fetch Officials");
      toast({
        title: "Error",
        description: "Failed to load barangay officials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOfficialsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // QR Scanner functions
  // Skip camera test - go directly to scanner to avoid duplicate feeds
  const testCameraAccessWithFallback = async () => {
    // Go directly to creating scanner without testing camera first
    // This prevents the duplicate feed issue
    logger.debug("Skipping camera test, going directly to scanner");
    createAndRenderScanner();
  };

  const startQRScanner = async () => {
    setQrScanInProgress(false);
    setHasShownSuccessToast(false);
    setIsProcessingQR(false);
    setLastScannedQR("");
    setSearchError("");
    setSearchLoading(false);
    setShowQRScanner(true);
    setQrScannerLoading(true);

    // Check compatibility first
    const compatibilityIssues = checkCameraCompatibility();

    if (compatibilityIssues.includes("HTTPS_REQUIRED")) {
      toast({
        title: "HTTPS Required",
        description:
          "Camera access requires HTTPS. Please use a secure connection (https://).",
        variant: "destructive",
      });
      setQrScannerLoading(false);
      return;
    }

    if (compatibilityIssues.includes("CAMERA_NOT_SUPPORTED")) {
      toast({
        title: "Camera Not Supported",
        description:
          "Your browser does not support camera access. Please use a modern browser.",
        variant: "destructive",
      });
      setQrScannerLoading(false);
      return;
    }

    if (compatibilityIssues.includes("SECURE_CONTEXT_REQUIRED")) {
      toast({
        title: "Secure Context Required",
        description:
          "Camera access requires a secure context. Please use HTTPS or localhost.",
        variant: "destructive",
      });
      setQrScannerLoading(false);
      return;
    }

    // Get available cameras first
    await getAvailableCameras();

    // Check camera permission first
    try {
      if (navigator.permissions) {
        const permissions = await navigator.permissions.query({
          name: "camera",
        });
        if (permissions.state === "denied") {
          toast({
            title: "Camera Access Denied",
            description:
              "Camera access is denied. Please enable camera permissions in your browser settings and try again.",
            variant: "destructive",
          });
          setQrScannerLoading(false);
          return;
        }
      }
    } catch (error) {
      // Fallback if permissions API is not supported
      logger.debug(
        "Permissions API not supported, proceeding with direct camera access"
      );
    }

      // Test camera access with fallback strategies
    await testCameraAccessWithFallback();
  };

  const createAndRenderScanner = () => {
    setQrScannerLoading(true);

    // Stop any existing scanner and clean up completely
    if (qrScanner) {
      try {
        // Always try stop() first for Html5Qrcode
        if (qrScanner.stop) {
          qrScanner.stop().catch(() => {});
        }
        
        // Then clear if available (but only after stopping)
        if (qrScanner.clear) {
          qrScanner.clear().catch(() => {});
        }
      } catch (err) {
        // If stop fails, try to clear anyway
        try {
          if (qrScanner.clear) {
            qrScanner.clear().catch(() => {});
          }
        } catch (clearErr) {
          logger.debug("Error clearing scanner in createAndRenderScanner:", clearErr);
        }
        logger.debug("Error cleaning up scanner:", err);
      }
      setQrScanner(null);
    }

    // Clear the container completely and remove ALL child elements
    const qrReaderElement = document.getElementById("qr-reader");
    if (qrReaderElement) {
      // Remove all child elements
      while (qrReaderElement.firstChild) {
        qrReaderElement.removeChild(qrReaderElement.firstChild);
      }
      // Also clear innerHTML as backup
      qrReaderElement.innerHTML = "";
      
      // Remove any leftover canvas elements that might be causing the flickering
      const leftoverCanvases = document.querySelectorAll('canvas');
      leftoverCanvases.forEach(canvas => {
        if (canvas.id !== 'qr-canvas') {
          canvas.remove();
        }
      });
      
      // Remove any leftover video elements
      const leftoverVideos = document.querySelectorAll('video');
      leftoverVideos.forEach(video => {
        if (!video.parentElement || video.parentElement.id !== 'qr-reader') {
          video.remove();
        }
      });
    }

    // No delay needed since we already waited in testCameraAccessWithFallback
    if (!qrScannerRef.current) {
      logger.debug("QR scanner ref not available");
      setQrScannerLoading(false);
      return;
    }

    try {
      // Use Html5Qrcode directly for better camera control (no file fallback)
      const html5QrCode = new Html5Qrcode("qr-reader");
        
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };
        
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
          // Prevent multiple scans with multiple checks
          if (
            qrScanInProgress ||
            hasShownSuccessToast ||
            showResidentDialog ||
            isProcessingQR
          ) {
            logger.debug("Scan ignored - already processing or dialog open");
            return;
          }

          // Prevent scanning the same QR code multiple times
          if (lastScannedQR === decodedText) {
            logger.debug("Same QR code scanned, ignoring");
            return;
          }

          // Set flags immediately to prevent multiple scans
          setQrScanInProgress(true);
          setIsProcessingQR(true);
          setLastScannedQR(decodedText);

          logger.debug("QR Code scanned successfully:", decodedText);

          // Stop the scanner gracefully without calling our cleanup function
          try {
            if (html5QrCode && html5QrCode.stop) {
              html5QrCode.stop().then(() => {
                logger.debug("Scanner stopped successfully after QR detection");
                setQrScanner(null);
                setShowQRScanner(false);
              }).catch((stopError) => {
                logger.debug("Error stopping scanner after QR detection:", stopError);
                // Continue anyway
                setQrScanner(null);
                setShowQRScanner(false);
              });
            }
          } catch (error) {
            logger.debug("Error in QR success callback:", error);
            // Continue anyway
            setQrScanner(null);
            setShowQRScanner(false);
          }

          // Then process the QR code
          processQRCodeData(decodedText);
        };

        // Start camera with simple constraints
        html5QrCode.start(
          { facingMode: currentCamera }, // Use current camera (environment or user)
          config,
          qrCodeSuccessCallback,
          (errorMessage) => {
            // Silently ignore common scanning errors
            if (
              !errorMessage.includes("No QR code found") &&
              !errorMessage.includes("NotFoundException")
            ) {
              logger.debug("QR Scan error:", errorMessage);
            }
          }
        ).then(() => {
          setQrScanner(html5QrCode);
          setQrScannerLoading(false);
        }).catch((err) => {
          logger.error("Failed to start camera:", err);
          setQrScannerLoading(false);
          
          let errorMessage = "Failed to start camera. Please check permissions and try again.";
          
          if (err.name === "NotAllowedError") {
            errorMessage = "Camera permission was denied. Please allow camera access and try again.";
          } else if (err.name === "NotFoundError") {
            errorMessage = "No camera found on your device. Please ensure you have a working camera.";
          } else if (err.name === "NotReadableError") {
            errorMessage = "Camera is already in use by another application. Please close other camera apps and try again.";
          } else if (err.name === "OverconstrainedError") {
            errorMessage = "Camera is not compatible. Please try using a different browser or device.";
          }
          
          toast({
            title: "Camera Error",
            description: errorMessage,
            variant: "destructive",
          });
        });
    } catch (error) {
      logger.error("Error starting QR scanner:", error);
      setQrScannerLoading(false);
      
      toast({
        title: "Camera Error",
        description: "Failed to start camera. Please check permissions and try again.",
        variant: "destructive",
      });
    }
  };

  const stopQRScanner = async () => {
    // Stop scanner first
    if (qrScanner) {
      try {
        // Always try stop() first for Html5Qrcode
        if (qrScanner.stop) {
          await qrScanner.stop();
        }
        
        // Then clear if available (but only after stopping)
        if (qrScanner.clear) {
          await qrScanner.clear();
        }
      } catch (error) {
        // If stop fails, try to clear anyway
        try {
          if (qrScanner.clear) {
            await qrScanner.clear();
          }
        } catch (clearError) {
          logger.debug("Error clearing scanner:", clearError);
        }
        logger.debug("Error stopping scanner:", error);
      }
      setQrScanner(null);
    }

    // Clear QR reader container
    const qrReaderElement = document.getElementById("qr-reader");
    if (qrReaderElement) {
      qrReaderElement.innerHTML = "";
    }

    // Reset all scanner states
    setShowQRScanner(false);
    setQrScannerLoading(false);
    setQrScanInProgress(false);
    setIsProcessingQR(false);
    setLastScannedQR("");

    // Reset error states when stopping scanner
    setSearchError("");
    setSearchLoading(false);

    // Only reset success toast if dialog is not open
    if (!showResidentDialog) {
      setHasShownSuccessToast(false);
    }
  };

  // Get available cameras
  const getAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setAvailableCameras(videoDevices);
      logger.debug("Available cameras:", videoDevices);
    } catch (error) {
      logger.debug("Error getting available cameras:", error);
      setAvailableCameras([]);
    }
  };

  // Switch camera function
  const switchCamera = async () => {
    if (!isRealMobileDevice || availableCameras.length < 2) {
      toast({
        title: "Camera Switch Not Available",
        description: "Only one camera available or not on mobile device.",
        variant: "destructive",
      });
      return;
    }

    setCameraSwitchLoading(true);

    try {
      // Toggle camera
      const newCamera =
        currentCamera === "environment" ? "user" : "environment";
      setCurrentCamera(newCamera);

      // Restart scanner with new camera
      await stopQRScanner();
      setTimeout(() => {
        createAndRenderScanner();
      }, 500);

      toast({
        title: "Camera Switched",
        description: `Switched to ${
          newCamera === "environment" ? "back" : "front"
        } camera`,
        variant: "default",
      });
    } catch (error) {
      logger.debug("Error switching camera:", error);
      toast({
        title: "Camera Switch Failed",
        description: "Failed to switch camera. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCameraSwitchLoading(false);
    }
  };

  // Helper: decrypt resident ID (base64 decode)
  const decryptId = (encryptedId) => {
    try {
      return atob(encryptedId);
    } catch (error) {
      handleError(error, "Decrypt ID");
      return null;
    }
  };

  const processQRCodeData = (qrData) => {
    logger.debug("Processing QR data:", qrData);

    // Prevent processing if dialog is already open
    if (showResidentDialog) {
      logger.debug("Dialog already open, ignoring scan");
      setIsProcessingQR(false);
      setQrScanInProgress(false);
      return;
    }

    // Validate input
    if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
      toast({
        title: "Invalid QR Code",
        description: "The scanned QR code contains no valid data.",
        variant: "destructive",
      });
      setIsProcessingQR(false);
      setQrScanInProgress(false);
      return;
    }

    const trimmedData = qrData.trim();

    try {
      // First, try to decrypt if it's a base64 encoded resident ID
      const decryptedId = decryptId(trimmedData);
      if (decryptedId) {
        logger.debug("Base64 decoded resident ID:", decryptedId);
        // If decryption successful, search for the resident using the decrypted ID
        searchResidentById(decryptedId);
        return;
      }

      // If decryption failed, try to parse as JSON
      try {
        const parsedData = JSON.parse(trimmedData);
        logger.debug("Parsed QR data as JSON:", parsedData);

        // If it's a resident ID, search for the resident
        if (parsedData.residentId || parsedData.id) {
          const residentId = parsedData.residentId || parsedData.id;
          logger.debug("Searching for resident ID from JSON:", residentId);
          searchResidentById(residentId);
          return;
        }
      } catch (jsonError) {
        logger.debug("JSON parsing failed, trying as raw data");
      }

      // If JSON parsing fails, try to use the raw data as a resident ID
      // Check if the raw data looks like a valid resident ID format
      if (trimmedData.match(/^[a-zA-Z0-9\-_]+$/)) {
        logger.debug("Using raw data as resident ID:", trimmedData);
        searchResidentById(trimmedData);
        return;
      }

      // If none of the above worked, show error
      toast({
        title: "Invalid QR Code Format",
        description:
          "The scanned QR code does not contain valid resident information. Please ensure you're scanning the correct QR code from your barangay ID.",
        variant: "destructive",
      });
      setIsProcessingQR(false);
      setQrScanInProgress(false);
      return;
    } catch (error) {
      logger.debug("Error processing QR code:", error);
      toast({
        title: "QR Code Processing Error",
        description:
          "An error occurred while processing the QR code. Please try again.",
        variant: "destructive",
      });
      setIsProcessingQR(false);
      setQrScanInProgress(false);
      return;
    }
  };

  const searchResidentById = (residentId) => {
    logger.debug("Searching for resident ID:", residentId);

    setSearchLoading(true);
    setSearchError("");

    // Use the privacy-compliant QR-specific API endpoint
    api
      .get(`/public/${residentId}/resident/public-qr`)
      .then((res) => {
        logger.debug("Resident details response:", res.data);
        const residentData = res.data.data;

        if (residentData && residentData.resident_id) {
                     // Check if the resident's barangay matches the selected barangay
           if (residentData.barangay_id !== selectedBarangay.id) {
             setSearchError(
               `This resident is not registered in this barangay. Kindly choose the appropriate barangay.`
             );
             toast({
               title: "Wrong Barangay",
               description: `This resident is not registered in this barangay. Kindly choose the appropriate barangay.`,
               variant: "destructive",
             });
             setIsProcessingQR(false);
             setQrScanInProgress(false);
             return;
           }

          // Only set the selected resident and show dialog if not already open
          if (!showResidentDialog && !hasShownSuccessToast) {
            setSelectedResident(residentData);
            setShowResidentDialog(true);
            setHasShownSuccessToast(true);

            toast({
              title: "Resident found!",
              description:
                "QR code scanned successfully. Opening certificate request form...",
            });
          }
                 } else {
           setSearchError("No resident found with this QR code");
           toast({
             title: "Resident not found",
             description:
               "The scanned QR code does not match any resident in our records.",
             variant: "destructive",
           });
           setIsProcessingQR(false);
           setQrScanInProgress(false);
         }
      })
      .catch((err) => {
        handleError(err, "Fetch Resident Details");
        setSearchError("No resident found with this QR code");
        toast({
          title: "Resident not found",
          description:
            "The scanned QR code does not match any resident in our records.",
          variant: "destructive",
        });
        setIsProcessingQR(false);
        setQrScanInProgress(false);
      })
      .finally(() => {
        setSearchLoading(false);
        setIsProcessingQR(false);
        setQrScanInProgress(false);
      });
  };

  const handleConfirmResidentSelection = async () => {
    if (!selectedResident) return;

    // Validate required fields
    if (
      !dialogFormData.certificateType ||
      !dialogFormData.urgency ||
      !dialogFormData.purpose
    ) {
      toast({
        title: "Missing Information",
        description:
          "Please fill in all required fields: Certificate Type, Urgency, and Purpose.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingRequest(true);

    try {
      // Prepare request payload with only required fields for certificate requests
      const requestPayload = {
        residentId: selectedResident.resident_id,
        barangayId: selectedResident.barangay_id,
        certificateType: dialogFormData.certificateType,
        urgency: dialogFormData.urgency,
        purpose: dialogFormData.purpose,
      };

      // Call the API to create the request
      const response = await api.post(
        "/public/requests/certificate",
        requestPayload
      );

      // Show success message with tracking ID (UUID)
      const trackingId = response.data?.data?.tracking_id || response.data?.data?.uuid || "N/A";
      toast({
        title: "Request Submitted Successfully!",
        description: `Your ${dialogFormData.certificateType.replace(
          /-/g,
          " "
        )} request has been submitted. Request Tracking ID: ${trackingId}`,
        variant: "default",
      });

      // Show tracking ID modal for capture/download
      setTrackingInfo({
        trackingId: trackingId,
        certificateType: dialogFormData.certificateType,
        residentName: selectedResident.full_name,
        submittedAt: new Date().toLocaleString(),
      });
      setShowTrackingModal(true);

      // Auto-fill the form with resident data (only for display purposes)
      setFormData((prev) => ({
        ...prev,
        certificateType: dialogFormData.certificateType,
        urgency: dialogFormData.urgency,
        purpose: dialogFormData.purpose,
      }));

      // Close dialog
      setShowResidentDialog(false);
      setSelectedResident(null);

      // Reset dialog form data
      setDialogFormData({
        certificateType: "",
        urgency: "normal",
        purpose: "",
      });
    } catch (error) {
      handleError(error, "Create Request");

      toast({
        title: "Request Submission Failed",
        description:
          error.response?.data?.message ||
          "An error occurred while submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleDialogInputChange = (field, value) => {
    setDialogFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCertificateRequest = async (certificateType) => {
    if (!selectedBarangay) {
      toast({
        title: "Barangay Selection Required",
        description: "Please select a barangay first",
        variant: "destructive",
      });
      return;
    }

    try {
      const requestData = {
        barangayId: selectedBarangay.id,
        certificateType,
        urgency: formData.urgency,
        purpose: formData.purpose,
      };

      const response = await submitCertificateRequest(requestData);

      // Show success message with tracking ID (UUID)
      const trackingId = response?.tracking_id || response?.uuid || "N/A";
      toast({
        title: "Request Submitted Successfully!",
        description: `Your ${certificateType.replace(
          /-/g,
          " "
        )} request has been submitted. Request Tracking ID: ${trackingId}`,
        variant: "default",
      });

      // Show tracking ID modal for manual requests too
      setTrackingInfo({
        trackingId: trackingId,
        certificateType: certificateType,
        residentName: formData.fullName || "Manual Request",
        submittedAt: new Date().toLocaleString(),
      });
      setShowTrackingModal(true);

      // Reset form
      setFormData({
        fullName: "",
        contactNumber: "",
        email: "",
        address: "",
        barangayId: "",
        certificateType: "",
        urgency: "normal",
        purpose: "",
      });
    } catch (error) {
      handleError(error, "Submit Certificate Request");
      toast({
        title: "Request Submission Failed",
        description:
          error.response?.data?.message ||
          "An error occurred while submitting your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (serviceType === "certificate") {
      await handleCertificateRequest(formData.certificateType);
    } else {
      // Handle appointment request
      try {
        const requestData = {
          fullName: formData.fullName,
          contactNumber: formData.contactNumber,
          email: formData.email,
          address: formData.address,
          barangayId: selectedBarangay.id,
          appointmentWith: formData.appointmentWith,
          appointmentDate: formData.appointmentDate,
          purpose: formData.purpose,
        };

        const response = await submitAppointmentRequest(requestData);

        // Show success message with tracking ID (UUID)
        const trackingId = response?.tracking_id || response?.uuid || "N/A";
        toast({
          title: "Appointment Request Submitted!",
          description: `Your appointment request has been submitted successfully. Request Tracking ID: ${trackingId}`,
          variant: "default",
        });

        // Show tracking ID modal for appointment requests too
        setTrackingInfo({
          trackingId: trackingId,
          certificateType: "appointment",
          residentName: formData.fullName,
          submittedAt: new Date().toLocaleString(),
        });
        setShowTrackingModal(true);

        // Reset form
        setFormData({
          fullName: "",
          contactNumber: "",
          email: "",
          address: "",
          certificateType: "",
          urgency: "normal",
          purpose: "",
        });
      } catch (error) {
        handleError(error, "Submit Appointment Request");
        toast({
          title: "Appointment Request Failed",
          description:
            error.response?.data?.message ||
            "An error occurred while submitting your appointment request. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const availableCertificates = [
    {
      id: "barangay-clearance",
      title: "Barangay Clearance",
      description:
        "Required for employment, business permits, and other transactions",
      icon: "📋",
      color: "bg-blue-100 text-blue-600",
      processingTime: "1-2 business days",
      requirements: ["Valid ID", "Proof of Residency", "Purpose Letter"],
    },
    {
      id: "residency",
      title: "Residency Certificate",
      description: "Proof of residence within the barangay",
      icon: "🏠",
      color: "bg-green-100 text-green-600",
      processingTime: "Same day",
      requirements: ["Valid ID", "Utility Bills", "Purpose Letter"],
    },
    {
      id: "indigency",
      title: "Indigency Certificate",
      description: "For scholarship applications and medical assistance",
      icon: "💝",
      color: "bg-purple-100 text-purple-600",
      processingTime: "2-3 business days",
      requirements: ["Valid ID", "Income Certificate", "Purpose Letter"],
    },
    {
      id: "good-moral",
      title: "Good Moral Certificate",
      description: "Certification of good moral character for various purposes",
      icon: "✅",
      color: "bg-emerald-100 text-emerald-600",
      processingTime: "1-2 business days",
      requirements: ["Valid ID", "Character References", "Purpose Letter"],
    },
    {
      id: "business-clearance",
      title: "Business Clearance Certificate",
      description: "Clearance for business operations and permits",
      icon: "🏢",
      color: "bg-orange-100 text-orange-600",
      processingTime: "3-5 business days",
      requirements: ["Valid ID", "Business Plan", "Location Details"],
    },
  ];

  // Static officials data for display purposes (fallback)
  const staticOfficials = [
    {
      name: "Hon. Maria C. Santos",
      position: "Barangay Captain",
      description: "Overall barangay governance and administration",
      schedule: "Mon-Fri 8:00 AM - 5:00 PM",
      contact: "+63 917 123 4567",
      avatar: "MS",
    },
    {
      name: "Hon. Juan D. Cruz",
      position: "Kagawad - Committee on Peace & Order",
      description: "Public safety and security matters",
      schedule: "Mon, Wed, Fri 9:00 AM - 4:00 PM",
      contact: "+63 917 234 5678",
      avatar: "JC",
    },
    {
      name: "Hon. Ana L. Rodriguez",
      position: "Kagawad - Committee on Health",
      description: "Health programs and medical assistance",
      schedule: "Tue, Thu 10:00 AM - 3:00 PM",
      contact: "+63 917 345 6789",
      avatar: "AR",
    },
    {
      name: "Hon. Roberto M. Garcia",
      position: "Kagawad - Committee on Education",
      description: "Educational programs and youth development",
      schedule: "Mon-Wed 1:00 PM - 5:00 PM",
      contact: "+63 917 456 7890",
      avatar: "RG",
    },
    {
      name: "Hon. Carmen S. Lopez",
      position: "Kagawad - Committee on Environment",
      description: "Environmental programs and waste management",
      schedule: "Thu-Fri 8:00 AM - 12:00 PM",
      contact: "+63 917 567 8901",
      avatar: "CL",
    },
    {
      name: "Ms. Linda F. Reyes",
      position: "Barangay Secretary",
      description: "Document processing and administrative support",
      schedule: "Mon-Fri 8:00 AM - 5:00 PM",
      contact: "+63 917 678 9012",
      avatar: "LR",
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-6 sm:py-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Request Certificates & Appointments
            </h1>

            {selectedBarangay && (
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-primary/10 text-primary rounded-full border border-primary/20 mb-4 sm:mb-6">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-lg">
                  Brgy. {selectedBarangay.name}
                </span>
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
              </div>
            )}

            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-3xl mx-auto">
              {selectedBarangay
                ? `Access ${selectedBarangay.name} services digitally. Request certificates and schedule appointments with ease.`
                : "Access barangay services digitally. Request certificates and schedule appointments with ease."}
            </p>
          </div>

          {/* Barangay Selection */}
          {!selectedBarangay && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-amber-200 animate-slide-up">
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600" />
                </div>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                  Select Your Barangay
                </h3>
                <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-4 sm:mb-6">
                  Please select your barangay to access certificate and
                  appointment services.
                </p>
                <div className="flex justify-center">
                  <BarangaySelector />
                </div>
              </div>
            </div>
          )}

          {/* Service Type Selection */}
          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 animate-slide-up">
            <Button
              variant={serviceType === "certificate" ? "default" : "outline"}
              onClick={() => setServiceType("certificate")}
              className="flex items-center gap-2 flex-1 text-sm sm:text-base"
              disabled={!selectedBarangay}
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              Request Certificate
            </Button>
            <Button
              variant={serviceType === "appointment" ? "default" : "outline"}
              onClick={() => setServiceType("appointment")}
              className="flex items-center gap-2 flex-1 text-sm sm:text-base"
              disabled={!selectedBarangay}
            >
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
              Schedule Appointment
            </Button>
          </div>

          {!selectedBarangay && (
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground">
                Please select a barangay first to access services
              </p>
            </div>
          )}

          {/* Certificate Request Section */}
          {serviceType === "certificate" && selectedBarangay && (
            <div className="mb-12">
              {/* Quick Start Guide */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-blue-200 animate-slide-up">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Info className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                    How to Request a Certificate
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
                    Follow these simple steps to request your certificate
                    quickly and easily.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 font-bold text-sm sm:text-lg">
                        1
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                      Click (Start QR Scanner) button
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      A scanner will appear on the screen. Please ensure that
                      your QR code matches the barangay you selected. Make sure
                      to choose the correct barangay
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 font-bold text-sm sm:text-lg">
                        2
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                      Scan Your QR Code
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Point your camera at the QR code on the back of your
                      barangay ID
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 font-bold text-sm sm:text-lg">
                        3
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">
                      Fill Request From Details
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600">
                      The request form will automatically appear on the screen
                      and choose the certificate type and provide purpose, then
                      submit
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Scanner Section */}
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-soft animate-slide-up border border-primary/10">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <QrCode className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground mb-2">
                    Scan QR Code
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Scan your QR code to quickly find your information and start
                    your certificate request
                  </p>
                </div>

                {!showQRScanner ? (
                  <div className="flex flex-col items-center justify-center gap-4 mb-6">
                    <Button
                      onClick={startQRScanner}
                      size="lg"
                      className="h-10 sm:h-12 px-6 sm:px-8 text-sm sm:text-lg shadow-soft"
                      disabled={qrScannerLoading}
                    >
                      {qrScannerLoading ? (
                        <>
                          <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          <span className="hidden sm:inline">
                            Starting Camera...
                          </span>
                          <span className="sm:hidden">Starting...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          <span className="hidden sm:inline">
                            Start QR Scanner
                          </span>
                          <span className="sm:hidden">Start Scanner</span>
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 mb-6">
                    <div className="w-full max-w-md">
                      <div
                        id="qr-reader"
                        ref={qrScannerRef}
                        className="w-full relative"
                        style={{
                          border: "2px solid #e5e7eb",
                          borderRadius: "12px",
                          overflow: "visible",
                          minHeight: "400px",
                          height: "auto",
                        }}
                      >
                        {/* QR Scanner will render here with built-in white square highlight */}
                      </div>
                      {qrScannerLoading && (
                        <div className="text-center py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                            <p className="text-sm text-muted-foreground">
                              Initializing camera...
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Camera Switch Button - Only show on mobile with multiple cameras */}
                      {isRealMobileDevice &&
                        availableCameras.length >= 2 &&
                        !qrScannerLoading && (
                          <div className="flex justify-center mt-3">
                            <Button
                              onClick={switchCamera}
                              variant="outline"
                              size="sm"
                              disabled={cameraSwitchLoading}
                              className="flex items-center gap-2 text-xs"
                            >
                              {cameraSwitchLoading ? (
                                <>
                                  <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
                                  <span>Switching...</span>
                                </>
                              ) : (
                                <>
                                  <Camera className="w-3 h-3" />
                                  <span>
                                    Switch to{" "}
                                    {currentCamera === "environment"
                                      ? "Front"
                                      : "Back"}{" "}
                                    Camera
                                  </span>
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                    </div>
                    <Button
                      onClick={stopQRScanner}
                      variant="outline"
                      size="lg"
                      className="h-12 px-8 text-lg"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Stop Scanner
                    </Button>
                  </div>
                )}

                {/* Search Tips */}
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground">
                    💡 Point your camera at a QR code containing resident
                    information
                  </p>
                </div>

                {searchLoading && (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      <p>Processing QR code...</p>
                    </div>
                  </div>
                )}

                {searchError && (
                  <div className="text-center py-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <X className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-red-800">Error</span>
                      </div>
                      <p className="text-sm text-red-700 mb-3">{searchError}</p>
                      {searchError.includes(
                        "not registered in this barangay"
                      ) && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-xs text-blue-700 mb-2">
                            <strong>Solution:</strong> Use the barangay selector
                            above to switch to the correct barangay.
                          </p>
                          <div className="flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchError("");
                                setSearchLoading(false);
                              }}
                              className="text-xs"
                            >
                              Clear Error
                            </Button>
                          </div>
                        </div>
                      )}
                      {searchError.includes("No resident found") && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-xs text-yellow-700 mb-2">
                            <strong>Possible reasons:</strong>
                          </p>
                          <ul className="text-xs text-yellow-700 mb-3 text-left">
                            <li>• QR code is not from a valid barangay ID</li>
                            <li>• Resident is not registered in the system</li>
                            <li>• QR code is damaged or unreadable</li>
                            <li>• Wrong barangay selected</li>
                          </ul>
                          <div className="flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchError("");
                                setSearchLoading(false);
                              }}
                              className="text-xs"
                            >
                              Try Again
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Form Section - Only for appointments or as fallback */}
          {serviceType === "appointment" && selectedBarangay && (
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 shadow-soft animate-slide-up border border-primary/10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  Appointment Request Form
                </h3>
                <p className="text-muted-foreground">
                  Fill out the form below to schedule your appointment
                </p>
              </div>

              <form id="appointment-form" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Full Name *
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your complete name"
                      className="h-12"
                      required
                      value={formData.fullName}
                      onChange={(e) =>
                        handleInputChange("fullName", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="contactNumber"
                      className="text-sm font-medium"
                    >
                      Contact Number
                    </Label>
                    <Input
                      id="contactNumber"
                      type="tel"
                      placeholder="Enter your contact number"
                      className="h-12"
                      value={formData.contactNumber}
                      onChange={(e) =>
                        handleInputChange("contactNumber", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="address" className="text-sm font-medium">
                      Complete Address *
                    </Label>
                    <Input
                      id="address"
                      placeholder="Enter your complete address"
                      className="h-12"
                      required
                      value={formData.address}
                      onChange={(e) =>
                        handleInputChange("address", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      className="h-12"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label
                      htmlFor="appointmentWith"
                      className="text-sm font-medium"
                    >
                      Appointment With *
                    </Label>
                    <select
                      id="appointmentWith"
                      className="w-full px-4 py-3 border border-input rounded-lg bg-background h-12"
                      required
                      value={formData.appointmentWith}
                      onChange={(e) =>
                        handleInputChange("appointmentWith", e.target.value)
                      }
                    >
                      <option value="">Select official to meet with</option>
                      {officialsLoading ? (
                        <option value="" disabled>
                          Loading officials...
                        </option>
                      ) : officials.length > 0 ? (
                        officials.map((official) => (
                          <option
                            key={official.official_id}
                            value={official.official_id}
                          >
                            {official.first_name} {official.last_name} -{" "}
                            {official.position}
                            {official.committee && ` (${official.committee})`}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          No officials available
                        </option>
                      )}
                    </select>
                  </div>
                  <div>
                    <Label
                      htmlFor="appointmentDate"
                      className="text-sm font-medium"
                    >
                      Preferred Date *
                    </Label>
                    <Input
                      id="appointmentDate"
                      type="date"
                      className="h-12"
                      required
                      value={formData.appointmentDate}
                      onChange={(e) =>
                        handleInputChange("appointmentDate", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="purpose" className="text-sm font-medium">
                    Purpose of Meeting *
                  </Label>
                  <Textarea
                    id="purpose"
                    placeholder="State the purpose of your appointment"
                    className="min-h-[100px]"
                    required
                    value={formData.purpose}
                    onChange={(e) =>
                      handleInputChange("purpose", e.target.value)
                    }
                  />
                </div>

                <Button
                  size="lg"
                  className="w-full h-12 text-lg"
                  onClick={handleFormSubmit}
                >
                  {loading ? "Submitting..." : "Submit Appointment Request"}
                </Button>
              </form>
            </div>
          )}

          {/* Available Services */}
          {serviceType === "certificate" && (
            <div
              className="animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Available Certificates
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Choose from our comprehensive list of barangay certificates.
                  Each certificate has specific requirements and processing
                  times.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {availableCertificates.map((cert, index) => (
                  <div
                    key={cert.id}
                    className="group bg-background rounded-2xl p-6 shadow-soft hover-lift border border-border/50 transition-all duration-300 animate-slide-up flex flex-col"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className={`w-12 h-12 ${cert.color} rounded-xl flex items-center justify-center text-2xl`}
                      >
                        {cert.icon}
                      </div>
                      <div className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                        {cert.processingTime}
                      </div>
                    </div>

                    <h3 className="font-bold text-xl text-foreground mb-3">
                      {cert.title}
                    </h3>

                    <p className="text-muted-foreground mb-6 leading-relaxed flex-grow">
                      {cert.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Officials Section for Appointments */}
          {serviceType === "appointment" && selectedBarangay && (
            <div
              className="animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Meet Our Barangay Officials
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Schedule appointments with our dedicated barangay officials.
                  Each official specializes in specific areas of community
                  service.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {officialsLoading ? (
                  <div className="col-span-full text-center py-12">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                      <p className="text-muted-foreground">
                        Loading officials...
                      </p>
                    </div>
                  </div>
                ) : officials.length > 0 ? (
                  officials.map((official, index) => (
                    <div
                      key={official.official_id}
                      className="group bg-background rounded-2xl p-6 shadow-soft hover-lift border border-border/50 transition-all duration-300 animate-slide-up"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center mb-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mr-4 text-primary font-bold text-lg">
                          {official.first_name?.charAt(0)}
                          {official.last_name?.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">
                            {official.first_name} {official.last_name}
                          </h3>
                          <p className="text-sm text-primary font-medium">
                            {official.position}
                          </p>
                          {official.committee && (
                            <p className="text-xs text-muted-foreground">
                              {official.committee}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 text-sm text-muted-foreground mb-6">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span>
                            Term:{" "}
                            {new Date(official.term_start).toLocaleDateString()}{" "}
                            - {new Date(official.term_end).toLocaleDateString()}
                          </span>
                        </div>
                        {official.responsibilities && (
                          <div className="flex items-start gap-3">
                            <User className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                            <span>{official.responsibilities}</span>
                          </div>
                        )}
                        {official.contact_number && (
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-primary" />
                            <span>{official.contact_number}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        className="w-full group-hover:border-primary group-hover:text-primary transition-colors"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            appointmentWith: official.official_id,
                          }));
                          // Scroll to form
                          document
                            .getElementById("appointment-form")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Appointment
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Officials Available
                    </h3>
                    <p className="text-muted-foreground">
                      No barangay officials are currently available for
                      appointments.
                    </p>
                  </div>
                )}
              </div>

              {/* Office Information */}
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 shadow-soft border border-primary/10">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Barangay Hall Hours
                    </h3>
                  </div>
                  <div className="space-y-4 text-muted-foreground">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Monday - Friday</span>
                      <span className="bg-white/50 px-3 py-1 rounded-full text-sm">
                        8:00 AM - 5:00 PM
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Saturday</span>
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm">
                        Closed
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Sunday</span>
                      <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm">
                        Closed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 shadow-soft border border-primary/10">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Location
                    </h3>
                  </div>
                  <div className="space-y-3 text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Barangay Hall</p>
                        <p>
                          {selectedBarangay?.address || "Address not available"}
                        </p>
                        <p>
                          Brgy. {selectedBarangay?.name},{" "}
                          {selectedBarangay?.municipality_name}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full mt-4">
                      <MapPin className="w-4 h-4 mr-2" />
                      View on Map
                    </Button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-8 shadow-soft border border-primary/10">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      What to Expect
                    </h3>
                  </div>
                  <ul className="space-y-3 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <span>Personal consultation with barangay officials</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <span>Assistance with community concerns</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <span>Document processing guidance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                      <span>Follow-up support provided</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resident Selection Dialog */}
      <Dialog
        open={showResidentDialog}
        onOpenChange={(open) => {
          if (!open) {
            // When closing dialog, reset all states
            setShowResidentDialog(false);
            setSelectedResident(null);
            setDialogFormData({
              certificateType: "",
              urgency: "normal",
              purpose: "",
            });
            setHasShownSuccessToast(false);
            setIsProcessingQR(false);
            setQrScanInProgress(false);
          } else {
            // Only allow opening if we have a selected resident
            if (selectedResident) {
              setShowResidentDialog(true);
            }
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto mx-auto">
          <DialogHeader className="border-b pb-3 sm:pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              Certificate Request Form
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Please review the resident information and fill out the
              certificate request details below.
            </p>
          </DialogHeader>

          {selectedResident && (
            <form className="space-y-4 sm:space-y-6 py-3 sm:py-4">
              {/* Resident Information Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 truncate">
                      {selectedResident.full_name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      Resident ID: {selectedResident.resident_id}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                      Barangay: {selectedResident.barangay}
                    </p>
                  </div>
                </div>

                {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">
                        Privacy Notice
                      </p>
                      <p className="text-xs text-yellow-700">
                        For data privacy compliance, only minimal resident
                        information is displayed. Complete details will be
                        required in the certificate request form below.
                      </p>
                    </div>
                  </div>
                </div> */}
              </div>

              {/* Certificate Request Form Section */}
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <h4 className="font-semibold text-base sm:text-lg text-gray-900">
                    Certificate Request Details
                  </h4>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="dialogCertificateType"
                      className="text-xs sm:text-sm font-semibold text-gray-700"
                    >
                      Type of Certificate *
                    </Label>
                    <select
                      id="dialogCertificateType"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm sm:text-base"
                      required
                      value={dialogFormData.certificateType}
                      onChange={(e) =>
                        handleDialogInputChange(
                          "certificateType",
                          e.target.value
                        )
                      }
                    >
                      <option value="">Select certificate type</option>
                      <option value="barangay-clearance">
                        Barangay Clearance
                      </option>
                      <option value="residency">Residency Certificate</option>
                      <option value="indigency">Indigency Certificate</option>
                      <option value="good-moral">Good Moral Certificate</option>
                      <option value="business-clearance">
                        Business Clearance Certificate
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="dialogUrgency"
                      className="text-xs sm:text-sm font-semibold text-gray-700"
                    >
                      Processing Urgency
                    </Label>
                    <select
                      id="dialogUrgency"
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-sm sm:text-base"
                      value={dialogFormData.urgency}
                      onChange={(e) =>
                        handleDialogInputChange("urgency", e.target.value)
                      }
                    >
                      <option value="normal">Normal (1-2 days)</option>
                      <option value="urgent">Urgent (Same day)</option>
                      <option value="express">Express (2-3 hours)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dialogPurpose"
                    className="text-xs sm:text-sm font-semibold text-gray-700"
                  >
                    Purpose of Certificate *
                  </Label>
                  <Textarea
                    id="dialogPurpose"
                    placeholder="Please state the specific purpose for requesting this certificate (e.g., employment, business permit, scholarship application, etc.)"
                    className="min-h-[100px] sm:min-h-[120px] px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none text-sm sm:text-base"
                    required
                    value={dialogFormData.purpose}
                    onChange={(e) =>
                      handleDialogInputChange("purpose", e.target.value)
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Be specific about why you need this certificate to help
                    expedite processing.
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowResidentDialog(false);
                    setSelectedResident(null);
                    setDialogFormData({
                      certificateType: "",
                      urgency: "normal",
                      purpose: "",
                    });
                    setHasShownSuccessToast(false);
                    setIsProcessingQR(false);
                    setQrScanInProgress(false);
                  }}
                  className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
                >
                  Cancel Request
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmResidentSelection}
                  className="flex-1 h-10 sm:h-12 bg-primary hover:bg-primary/90 text-sm sm:text-base"
                  disabled={
                    !dialogFormData.certificateType ||
                    !dialogFormData.purpose ||
                    isSubmittingRequest
                  }
                >
                  {isSubmittingRequest ? (
                    <>
                      <div className="w-3 h-3 sm:w-4 sm:h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs sm:text-sm">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      <span className="text-xs sm:text-sm">Submit Request</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Tracking ID Modal */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[95vh] overflow-hidden mx-auto">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              Request Submitted Successfully!
            </DialogTitle>
          </DialogHeader>

          {trackingInfo && (
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4 overflow-y-auto max-h-[calc(95vh-120px)]">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 sm:p-6 border border-green-200">
                <div className="text-center mb-3 sm:mb-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    Your Request Has Been Submitted
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Please save your tracking information for future reference
                  </p>
                </div>

                {/* Visual Tracking Card Preview */}
                <div className="bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-300 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 mx-2 sm:mx-4 shadow-lg animate-pulse">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Info className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-red-900">
                        ⚠️ IMPORTANT: SAVE THIS CARD NOW!
                      </p>
                      <p className="text-xs text-center text-red-800 mt-1">
                        You won't be able to track your request status.
                        <br />
                        click download below or take an screenshot
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg border-2 border-green-200 max-w-sm mx-auto mb-3">
                  {/* Save Notice */}

                  <div className="text-center mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">
                      Request Tracking Card
                    </h2>
                    <p className="text-xs text-gray-600">
                      Barangay Information Management System
                    </p>
                  </div>

                  {/* Tracking ID - Prominent */}
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 border border-green-200">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">TRACKING ID</p>
                      <p className="text-xs sm:text-sm font-mono font-semibold text-green-700 break-all">
                        {trackingInfo.trackingId}
                      </p>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                        Request Type:
                      </span>
                      <span className="text-xs sm:text-sm text-gray-900 font-semibold break-words">
                        {trackingInfo.certificateType === "appointment"
                          ? "Appointment Request"
                          : trackingInfo.certificateType.replace(/-/g, " ")}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                        Resident:
                      </span>
                      <span className="text-xs sm:text-sm text-gray-900 font-semibold break-words">
                        {trackingInfo.residentName}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                        Barangay:
                      </span>
                      <span className="text-xs sm:text-sm text-gray-900 font-semibold break-words">
                        {selectedBarangay?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                        Submitted:
                      </span>
                      <span className="text-xs sm:text-sm text-gray-900 font-semibold break-words">
                        {trackingInfo.submittedAt}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-2 sm:pt-3 border-t border-green-200">
                    <p className="text-xs text-gray-600">
                      Keep this card for reference. Use the tracking ID to check
                      your request status.
                    </p>
                  </div>
                </div>

                {/* Visual Tracking Card - Hidden for download */}
                <div
                  id="tracking-card"
                  className="hidden bg-white rounded-xl p-6 shadow-lg border-2 border-green-200 max-w-sm mx-auto"
                  style={{
                    background:
                      "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                 

                  {/* Header */}
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Request Tracking Card
                    </h2>
                    <p className="text-xs text-gray-600">
                      Barangay Information Management System
                    </p>
                  </div>

                  {/* Tracking ID - Prominent */}
                  <div className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">TRACKING ID</p>
                      <p className="text-sm font-mono font-semibold text-green-700 break-all">
                        {trackingInfo.trackingId}
                      </p>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Request Type:
                      </span>
                      <span className="text-sm text-gray-900 font-semibold">
                        {trackingInfo.certificateType === "appointment"
                          ? "Appointment Request"
                          : trackingInfo.certificateType.replace(/-/g, " ")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Resident:
                      </span>
                      <span className="text-sm text-gray-900 font-semibold">
                        {trackingInfo.residentName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Barangay:
                      </span>
                      <span className="text-sm text-gray-900 font-semibold">
                        {selectedBarangay?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Submitted:
                      </span>
                      <span className="text-sm text-gray-900 font-semibold">
                        {trackingInfo.submittedAt}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center pt-3 border-t border-green-200">
                    <p className="text-xs text-gray-600">
                      Keep this card for reference. Use the tracking ID to check
                      your request status.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
                    onClick={async (e) => {
                      e.preventDefault();
                      const trackingId = trackingInfo.trackingId;
                      
                      // Try modern Clipboard API first
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        try {
                          await navigator.clipboard.writeText(trackingId);
                          toast({
                            title: "Copied!",
                            description: "Request tracking ID copied to clipboard",
                            variant: "default",
                          });
                          return;
                        } catch (err) {
                          console.error("Clipboard API failed:", err);
                          // Fall through to fallback method
                        }
                      }
                      
                      // Fallback: HTTP-compatible copy method
                      const input = document.createElement("input");
                      input.value = trackingId;
                      input.style.position = "fixed";
                      input.style.opacity = "0";
                      input.style.left = "-9999px"; // Move off-screen to avoid interference
                      document.body.appendChild(input);
                      
                      // Select and copy
                      input.select();
                      input.setSelectionRange(0, 99999); // For mobile devices
                      
                      let success = false;
                      try {
                        success = document.execCommand('copy');
                      } catch (err) {
                        console.error("execCommand failed:", err);
                      }
                      
                      // Clean up
                      document.body.removeChild(input);
                      
                      // Show feedback
                      if (success) {
                        toast({
                          title: "Copied!",
                          description: "Request tracking ID copied to clipboard",
                          variant: "default",
                        });
                      } else {
                        toast({
                          title: "Copy failed",
                          description: "Please manually select and copy the tracking ID",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    <span className="text-xs sm:text-sm">Copy ID</span>
                  </Button>
                  <Button
                    className="flex-1 h-10 sm:h-12 text-sm sm:text-base"
                    onClick={async () => {
                      try {
                        // Show loading state
                        toast({
                          title: "Generating tracking card...",
                          description:
                            "Please wait while we create your tracking card",
                          variant: "default",
                        });

                        // Temporarily show the tracking card
                        const trackingCard =
                          document.getElementById("tracking-card");
                        if (trackingCard) {
                          trackingCard.classList.remove("hidden");

                          // Wait a bit for the DOM to update
                          await new Promise((resolve) =>
                            setTimeout(resolve, 100)
                          );

                          // Generate canvas from the tracking card
                          const canvas = await html2canvas(trackingCard, {
                            backgroundColor: "#f0fdf4",
                            scale: 2, // Higher quality
                            useCORS: true,
                            allowTaint: true,
                            width: 400,
                            height: 500,
                          });

                          // Hide the tracking card again
                          trackingCard.classList.add("hidden");

                          // Convert canvas to blob and download
                          canvas.toBlob((blob) => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            const fileName =
                              trackingInfo.certificateType === "appointment"
                                ? `appointment-tracking-${trackingInfo.trackingId}.png`
                                : `certificate-tracking-${trackingInfo.trackingId}.png`;
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);

                            toast({
                              title: "Tracking Card Downloaded",
                              description:
                                "Your tracking card has been downloaded as an image",
                              variant: "default",
                            });
                          }, "image/png");
                        }
                      } catch (error) {
                        handleError(error, "Generate Tracking Card");
                        toast({
                          title: "Download Failed",
                          description:
                            "Failed to generate tracking card. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    <span className="text-xs sm:text-sm">Download Card</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Certificates;
