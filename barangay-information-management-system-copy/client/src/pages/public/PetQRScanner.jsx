import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  QrCode,
  PawPrint,
  User,
  MapPin,
  Phone,
  Calendar,
  RefreshCw,
  Camera,
  AlertCircle,
  Keyboard,
  Image,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Layout } from "@/components/common/Layout";

const PetQRScanner = () => {
  const [scannedData, setScannedData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  
  // Manual search fields
  const [searchForm, setSearchForm] = useState({
    pet_uuid: ""
  });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Camera switching state
  const [currentCamera, setCurrentCamera] = useState("environment"); // 'environment' (back) or 'user' (front)
  const [availableCameras, setAvailableCameras] = useState([]);
  const [cameraSwitchLoading, setCameraSwitchLoading] = useState(false);

  const scannerRef = useRef(null);
  const html5QrcodeScannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const scanProcessedRef = useRef(false);
  const lastScannedTextRef = useRef(null);

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

  // Get available cameras
  const getAvailableCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setAvailableCameras(devices);
      
      // Set default camera
      if (devices.length > 0) {
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        if (backCamera) {
          setCurrentCamera(backCamera.id);
        } else {
          setCurrentCamera(devices[0].id);
        }
      }
    } catch (error) {
      console.error("Error getting cameras:", error);
    }
  };

  // Test camera access with fallback strategies
  const testCameraAccessWithFallback = async () => {
    const fallbackStrategies = [
      { facingMode: "environment" },
      { facingMode: "user" },
      { facingMode: { exact: "environment" } },
      { facingMode: { exact: "user" } },
      {} // No constraints
    ];

    for (const strategy of fallbackStrategies) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: strategy 
        });
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (error) {
        console.debug(`Camera strategy failed:`, strategy, error);
        continue;
      }
    }
    return false;
  };

  useEffect(() => {
    // Add custom CSS for QR scanner styling
    const style = document.createElement('style');
    style.textContent = `
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
    `;
    document.head.appendChild(style);

    return () => {
      // Cleanup
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.stop) {
            html5QrCodeRef.current.stop().catch(() => {
              // Ignore cleanup errors
            });
          }
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);


  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      setShowManualInput(false);
      
      // Check compatibility first
      const compatibilityIssues = checkCameraCompatibility();

      if (compatibilityIssues.includes("HTTPS_REQUIRED")) {
        setError("Camera access requires HTTPS. Please use a secure connection (https://).");
        setIsScanning(false);
        return;
      }

      if (compatibilityIssues.includes("CAMERA_NOT_SUPPORTED")) {
        setError("Your browser does not support camera access. Please use a modern browser.");
        setIsScanning(false);
        return;
      }

      if (compatibilityIssues.includes("SECURE_CONTEXT_REQUIRED")) {
        setError("Camera access requires a secure context. Please use HTTPS or localhost.");
        setIsScanning(false);
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
            setError("Camera access is denied. Please enable camera permissions in your browser settings and try again.");
            setIsScanning(false);
            return;
          }
        }
      } catch (error) {
        // Fallback if permissions API is not supported
        console.debug("Permissions API not supported, proceeding with direct camera access");
      }

      // Test camera access with fallback strategies
      const hasAccess = await testCameraAccessWithFallback();
      if (!hasAccess) {
        setError("Unable to access camera. Please check your camera permissions and ensure no other app is using the camera.");
        setIsScanning(false);
        return;
      }

      // Stop any existing scanner and clean up completely
      if (html5QrCodeRef.current) {
        try {
          // Always try stop() first for Html5Qrcode
          if (html5QrCodeRef.current.stop) {
            await html5QrCodeRef.current.stop();
          }
        } catch (error) {
          console.debug("Error stopping existing scanner:", error);
        }
        html5QrCodeRef.current = null;
      }

      // Clear any existing scanner element
      const scannerElement = document.getElementById("qr-reader");
      if (scannerElement) {
        scannerElement.innerHTML = "";
      }

      // Use Html5Qrcode directly for better camera control
      const html5QrCode = new Html5Qrcode("qr-reader");
        
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };
        
      // Reset scan tracking for new scan session
      scanProcessedRef.current = false;
      lastScannedTextRef.current = null;
      
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // Prevent processing the same scan multiple times
        if (scanProcessedRef.current) {
          console.debug("QR scan already processed, ignoring duplicate");
          return;
        }
        
        // Prevent processing the exact same QR code text multiple times
        if (lastScannedTextRef.current === decodedText) {
          console.debug("Same QR code text already processed, ignoring");
          return;
        }
        
        scanProcessedRef.current = true;
        lastScannedTextRef.current = decodedText;
        
        // Stop the scanner first to prevent further scans
        try {
          if (html5QrCode && html5QrCode.stop) {
            html5QrCode.stop().then(() => {
              console.debug("Scanner stopped successfully after QR detection");
              html5QrCodeRef.current = null;
              setIsScanning(false);
            }).catch((stopError) => {
              console.debug("Error stopping scanner after QR detection:", stopError);
              // Continue anyway
              html5QrCodeRef.current = null;
              setIsScanning(false);
            });
          }
        } catch (error) {
          console.debug("Error in QR success callback cleanup:", error);
          html5QrCodeRef.current = null;
          setIsScanning(false);
        }
        
        // Process the QR code
        handleQRCodeScan(decodedText, decodedResult);
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
            console.debug("QR Scan error:", errorMessage);
          }
        }
      ).then(() => {
        html5QrCodeRef.current = html5QrCode;
        setIsScanning(true);
      }).catch((err) => {
        console.error("Failed to start camera:", err);
        setIsScanning(false);
        
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
        
        setError(errorMessage);
      });
    } catch (error) {
      console.error("Error starting QR scanner:", error);
      setIsScanning(false);
      
      setError("Failed to start camera. Please check permissions and try again.");
    }
  };

  const stopScanning = async () => {
    try {
      // Stop scanner first
      if (html5QrCodeRef.current) {
        try {
          // Always try stop() first for Html5Qrcode
          if (html5QrCodeRef.current.stop) {
            await html5QrCodeRef.current.stop();
          }
        } catch (error) {
          console.debug("Error stopping scanner:", error);
        }
        html5QrCodeRef.current = null;
      }

      // Clear scanner element
      const scannerElement = document.getElementById("qr-reader");
      if (scannerElement) {
        scannerElement.innerHTML = "";
      }
      
      setIsScanning(false);
    } catch (error) {
      console.error("Error stopping scanner:", error);
      // Force stop by removing the element content
      const scannerElement = document.getElementById("qr-reader");
      if (scannerElement) {
        scannerElement.innerHTML = "";
      }
      setIsScanning(false);
    }
  };

  const handleQRCodeScan = (decodedText, decodedResult) => {
    try {
      console.log("QR Code scanned, raw text:", decodedText);
      console.log("Raw text length:", decodedText.length);
      console.log("Raw text type:", typeof decodedText);
      
      // Trim whitespace that might interfere with JSON parsing
      const trimmedText = decodedText.trim();
      
      // Parse the JSON from QR code
      let petData;
      try {
        petData = JSON.parse(trimmedText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        setError(`Invalid QR code format: ${parseError.message}. Please scan a valid pet QR code.`);
        return;
      }
      
      console.log("Parsed QR code data:", petData);
      console.log("Type field value:", petData.type);
      console.log("Type field type:", typeof petData.type);
      console.log("All keys in petData:", Object.keys(petData));
      
      // Validate required fields - check explicitly for undefined/null/empty
      if (petData.type === undefined || petData.type === null || petData.type === "") {
        console.error("Missing or empty type field. Pet data keys:", Object.keys(petData));
        setError("Invalid QR code: Missing or empty type field.");
        return;
      }
      
      // Normalize type field (trim whitespace, convert to string)
      const normalizedType = String(petData.type).trim().toLowerCase();
      console.log("Normalized type:", normalizedType);
      
      if (normalizedType === "pet_info") {
        // Validate that we have essential fields
        if (!petData.uuid && !petData.pet_id) {
          setError("Invalid QR code: Missing pet identifier (UUID or pet_id).");
          return;
        }
        
        // Ensure the scanned data has all required fields with defaults
        const normalizedPetData = {
          uuid: petData.uuid || null,
          pet_id: petData.pet_id || null,
          name: petData.name || "Unknown Pet",
          species: petData.species || "Unknown",
          breed: petData.breed || "Unknown",
          owner: petData.owner || "Unknown Owner",
          address: petData.address || " ",
          contact: petData.contact || "N/A",
          picture_path: petData.picture_path || null,
          timestamp: petData.timestamp || new Date().toISOString(),
          type: "pet_info"
        };
        
        console.log("Normalized pet data:", normalizedPetData);
        setScannedData(normalizedPetData);
        setError(null); // Clear any previous errors
        // Scanner is already stopped in the callback, no need to call stopScanning() here
      } else {
        setError(`Invalid QR code type: "${petData.type}". This QR code is not for pet identification.`);
      }
    } catch (err) {
      console.error("Error parsing QR code:", err);
      setError(`Invalid QR code format: ${err.message}. Please scan a valid pet QR code.`);
    }
  };

  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const handleSearchInputChange = (field, value) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearchSubmit = async () => {
    // Validate UUID is provided
    const trimmedUuid = searchForm.pet_uuid?.trim();
    if (!trimmedUuid) {
      setError("Please enter a Pet UUID to search.");
      return;
    }

    // Validate UUID format
    if (!uuidRegex.test(trimmedUuid)) {
      setError("Invalid UUID format. Please enter a valid UUID (e.g., 1c401222-2a8e-41b6-875e-81cd5062c633)");
      return;
    }

    setIsSearching(true);
    setError(null);
    
    try {
      // Call API to search for pets using UUID (secure)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/public/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pet_uuid: trimmedUuid
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: `Server error: ${response.status}` };
        }
        
        const errorMessage = errorData.message || 'Failed to search pets';
        
        // Provide user-friendly error messages
        if (errorMessage.includes('invalid input syntax for type uuid')) {
          throw new Error("Invalid UUID format. Please check the UUID and try again.");
        } else if (response.status === 404 || errorMessage.toLowerCase().includes('not found')) {
          throw new Error("No pet found with this UUID.");
        } else {
          throw new Error(errorMessage);
        }
      }

      const data = await response.json();
      setSearchResults(data.pets || []);

      if (data.pets && data.pets.length === 0) {
        setError("No pet found with this UUID.");
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Search error:', err);
      }
      setError(err.message || "Failed to search pets. Please check your UUID and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPet = (pet) => {
    // Convert API pet data to QR code format with UUID
    // Ensure picture_path is a relative path (API returns relative paths)
    let picturePath = pet.picture_path;
    // If the API returns a full URL, extract just the path part
    if (picturePath && (picturePath.startsWith('http://') || picturePath.startsWith('https://'))) {
      try {
        const url = new URL(picturePath);
        picturePath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
      } catch (e) {
        // If URL parsing fails, keep original
        console.warn('Failed to parse picture_path URL:', picturePath);
      }
    }
    
    const petData = {
      uuid: pet.uuid, // Primary identifier for security
      pet_id: pet.pet_id, // Keep for backward compatibility
      name: pet.pet_name,
      species: pet.species,
      breed: pet.breed,
      owner: pet.owner_name,
      address: pet.address || " ",
      contact: pet.owner_contact || "N/A",
      picture_path: picturePath, // Store as relative path, getPetImageUrl will handle conversion
      timestamp: new Date().toISOString(),
      type: "pet_info"
    };

    setScannedData(petData);
    setShowManualInput(false);
    setSearchResults([]);
    setError(null);
  };

  const resetScanner = () => {
    setScannedData(null);
    setError(null);
    stopScanning();
    setShowManualInput(false);
    setSearchForm({
      pet_uuid: ""
    });
    setSearchResults([]);
  };

  // Get pet image URL (this would need to be included in the QR data or fetched from API)
  const getPetImageUrl = (petData) => {
    // If the QR code includes an image path, construct the full URL
    if (petData.picture_path) {
      // Check if it's already a full URL (from QR code) or a relative path (from API)
      if (petData.picture_path.startsWith('http://') || petData.picture_path.startsWith('https://')) {
        return petData.picture_path; // Already a full URL
      }
      // It's a relative path, prepend server URL
      const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
      // Remove leading slash if present to avoid double slashes
      const cleanPath = petData.picture_path.startsWith('/') ? petData.picture_path.slice(1) : petData.picture_path;
      return `${serverUrl}/${cleanPath}`;
    }
    return null;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 sm:py-12">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Pet QR Code Scanner
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Scan a pet's QR code to view their information and help them get home
            </p>
          </div>

          {!scannedData ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Scan Pet QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isScanning && !showManualInput ? (
                  <div className="text-center py-8">
                    <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Choose how you'd like to scan the pet's QR code
                    </p>
                    
                    
                    <div className="flex gap-3 justify-center">
                      <Button onClick={startScanning} className="gap-2">
                        <Camera className="h-4 w-4" />
                        Camera Scan
                      </Button>
                      <Button onClick={() => setShowManualInput(true)} variant="outline" className="gap-2">
                        <Keyboard className="h-4 w-4" />
                        Search Pet
                      </Button>
                    </div>
                    
                    {/* Troubleshooting Tips */}
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-2 relative">
                        <AlertCircle className="h-4 w-4 text-gray-600 mt-0.5 absolute left-0" />
                        <div className="text-xs text-gray-600 flex-1">
                          <p className="font-semibold mb-1">Having trouble?</p>
                          <ul className="space-y-1">
                            <li>• Ensure camera permissions are enabled</li>
                            <li>• Close other apps using the camera</li>
                            <li>• Try the search pet option</li>
                            <li>• Use a modern browser (Chrome, Firefox, Safari)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : showManualInput ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Keyboard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Search for a pet by UUID
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="search_pet_uuid">Pet UUID</Label>
                      <Input
                        id="search_pet_uuid"
                        placeholder="e.g., 1c401222-2a8e-41b6-875e-81cd5062c633"
                        value={searchForm.pet_uuid}
                        onChange={(e) => handleSearchInputChange('pet_uuid', e.target.value)}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the pet's UUID (found in QR code or provided by owner)
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        <strong>Security Note:</strong> For privacy and security, pet search now requires a UUID. 
                        Pet name and ID searches have been disabled to prevent unauthorized data access.
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSearchSubmit} 
                        className="flex-1"
                        disabled={isSearching}
                      >
                        {isSearching ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <PawPrint className="h-4 w-4 mr-2" />
                            Search Pet
                          </>
                        )}
                      </Button>
                      <Button onClick={() => setShowManualInput(false)} variant="outline" className="flex-1">
                        Back
                      </Button>
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <h4 className="font-semibold text-sm text-gray-700">Search Results</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {searchResults.map((pet) => (
                            <div
                              key={pet.pet_id}
                              className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => handleSelectPet(pet)}
                            >
                              <div className="flex items-center gap-3">
                                {pet.picture_path ? (
                                  <img
                                    src={`${import.meta.env.VITE_SERVER_URL || "http://localhost:5000"}/${pet.picture_path}`}
                                    alt={pet.pet_name}
                                    className="w-12 h-12 rounded-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center" style={{ display: pet.picture_path ? 'none' : 'flex' }}>
                                  <PawPrint className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{pet.pet_name}</p>
                                  <p className="text-xs text-gray-600">
                                    {pet.species} • {pet.breed} • ID: {pet.pet_id}
                                  </p>
                                  <p className="text-xs text-gray-500">Owner: {pet.owner_name}</p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  Select
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <div id="qr-reader" className="w-full"></div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={stopScanning} variant="outline" className="flex-1">
                        Stop Scanning
                      </Button>
                      <Button onClick={resetScanner} variant="outline" className="flex-1">
                        <RefreshCw className="h-4 w-4" />
                        Reset
                      </Button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="text-red-700 text-sm font-semibold mb-1">Error</p>
                        <p className="text-red-700 text-sm">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5 text-primary" />
                  Pet Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Pet Header with Picture */}
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                  {getPetImageUrl(scannedData) ? (
                    <img
                      src={getPetImageUrl(scannedData)}
                      alt={scannedData.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center" style={{ display: getPetImageUrl(scannedData) ? 'none' : 'flex' }}>
                    <PawPrint className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{scannedData.name}</h2>
                    <p className="text-muted-foreground">
                      {scannedData.species} • {scannedData.breed}
                    </p>
                  </div>
                </div>

                {/* Pet UUID Display */}
                {scannedData.uuid && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <QrCode className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Pet UUID (Secure Identifier)
                        </h4>
                        <code className="text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded border border-blue-300 dark:border-blue-700 block font-mono break-all">
                          {scannedData.uuid}
                        </code>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                          This unique identifier is used for secure pet lookups
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pet Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700">Pet Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <PawPrint className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          <strong>Species:</strong> {scannedData.species}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PawPrint className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          <strong>Breed:</strong> {scannedData.breed}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-700">Owner Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          <strong>Owner:</strong> {scannedData.owner}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          <strong>Contact:</strong> {scannedData.contact}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-gray-700">Address</h3>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                    <span className="text-sm">{scannedData.address}</span>
                  </div>
                </div>

                {/* QR Code Info */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>QR Code generated on: {formatDate(scannedData.timestamp)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button onClick={resetScanner} variant="outline" className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Scan Another
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      if (scannedData.contact && scannedData.contact !== "N/A") {
                        window.open(`tel:${scannedData.contact}`, '_self');
                      }
                    }}
                    disabled={!scannedData.contact || scannedData.contact === "N/A"}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Contact Owner
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                How to Help a Lost Pet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Step-by-Step Guide */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-800 mb-3">Step-by-Step Guide</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">Stay Calm</p>
                        <p className="text-xs text-gray-600">Approach the pet gently and avoid sudden movements.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">Check for QR Code</p>
                        <p className="text-xs text-gray-600">Look for a QR code tag on the pet's collar.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">Scan the Code</p>
                        <p className="text-xs text-gray-600">Use this scanner to read the pet's information.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                        4
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">Contact Owner</p>
                        <p className="text-xs text-gray-600">Use the provided contact information to reach the owner.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                        5
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">Keep Safe</p>
                        <p className="text-xs text-gray-600">If possible, keep the pet in a safe location until the owner arrives.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Important Tips */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-gray-800 mb-3">Important Tips</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-blue-800">Contact Information</p>
                          <p className="text-xs text-blue-700">Always try to contact the owner first before taking any other action.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <PawPrint className="h-4 w-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-green-800">Pet Safety</p>
                          <p className="text-xs text-green-700">Keep the pet in a safe, enclosed area if possible.</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-orange-800">Emergency</p>
                          <p className="text-xs text-orange-700">If the pet appears injured or sick, contact local animal services.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PetQRScanner;
