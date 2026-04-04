import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RefreshControls from "@/components/common/RefreshControls";
import { useUnifiedAutoRefresh } from "@/hooks/useUnifiedAutoRefresh";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Polyfill for older browsers that don't support navigator.mediaDevices
if (navigator && !navigator.mediaDevices) {
  navigator.mediaDevices = {};
}

if (navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia = function(constraints) {
    const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    
    if (!getUserMedia) {
      return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
    }
    
    return new Promise(function(resolve, reject) {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  };
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Eye,
  Edit,
  Calendar,
  FileText,
  Phone,
  Mail,
  MapPin,
  Printer,
  Search,
  Filter,
  X,
  User,
  Info,
  QrCode,
  Camera,
  Copy,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import api from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import useAuth from "@/hooks/useAuth";
import { handleError, handleErrorSilently } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import jsQR from "jsqr";
// Security: Comprehensive input sanitization function
// This function prevents XSS attacks by:
// 1. Using browser's built-in textContent to safely escape HTML
// 2. Removing all HTML tags and scripts
// 3. Removing dangerous protocols (javascript:, data:, vbscript:)
// 4. Removing event handlers (onclick, onload, etc.)
// 5. Removing CSS expressions and url() functions
// 6. Limiting content length to prevent performance issues
const sanitizeHtml = (input) => {
  if (!input || typeof input !== "string") return "";

  // Create a temporary div to use browser's built-in HTML parsing
  const tempDiv = document.createElement("div");
  tempDiv.textContent = input; // This automatically escapes HTML

  // Get the safely escaped text content
  let sanitized = tempDiv.textContent || tempDiv.innerText || "";

  // Additional security measures
  sanitized = sanitized
    // Remove any remaining script-like content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/url\s*\(/gi, "")
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove any remaining dangerous protocols
    .replace(/[a-z]+:\/\//gi, "")
    // Clean up extra whitespace
    .replace(/\s+/g, " ")
    .trim();
  return sanitized;
};

// Server URL for background images
  const SERVER_URL = import.meta.env.VITE_API_BASE_URL || "http://13.211.71.85/api";

// Add custom styles for QR scanner with unique ID to avoid conflicts
const qrScannerStyles = `
  #qr-reader-requests {
    border: none !important;
    border-radius: 8px !important;
    overflow: hidden !important;
  }
  
  #qr-reader-requests__scan_region {
    background: transparent !important;
  }
  
  #qr-reader-requests__scan_region > img {
    display: none !important;
  }
  
  #qr-reader-requests__camera_selection {
    background: #4CAF50 !important;
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 8px 12px !important;
    font-size: 14px !important;
    margin-bottom: 10px !important;
  }
  
  #qr-reader-requests__camera_selection:hover {
    background: #45a049 !important;
  }
  
  #qr-reader-requests__status_span {
    display: none !important;
  }
  
  #qr-reader-requests__dashboard {
    padding: 10px !important;
  }
  
  #qr-reader-requests__dashboard_section {
    margin-bottom: 10px !important;
  }
  
  #qr-reader-requests__dashboard_section_csr {
    display: none !important;
  }
  
  #qr-reader-requests__camera_permission_button {
    display: none !important;
  }
  
  #qr-reader-requests__scan_region_highlight {
    border: 2px solid #4CAF50 !important;
    border-radius: 8px !important;
    background: rgba(76, 175, 80, 0.1) !important;
  }
`;

// Certificate Template Component
const CertificateTemplate = ({ request, onClose }) => {
  const { user } = useAuth();
  const [barangayInfo, setBarangayInfo] = useState({
    name: "",
    municipality: "",
    province: "",
    certificate_background_path: "",
    barangay_logo_path: "",
    municipality_logo_path: "",
    captain_name: "",
    captain_position: "",
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch barangay information
    const fetchBarangayInfo = async () => {
      setLoading(true);
      try {
        // Try different API endpoints
        let barangayResponse;
        try {
          barangayResponse = await api.get(
            `/public/${user.target_id}/barangay`
          );
        } catch (error) {
          logger.debug(
            "⚠️ Public endpoint failed, trying authenticated endpoint..."
          );
          try {
            barangayResponse = await api.get(`/${user.target_id}/barangay`);
            logger.debug("📡 Authenticated API response:", barangayResponse);
          } catch (secondError) {
            logger.debug(
              "⚠️ Both endpoints failed, trying alternative format..."
            );
            barangayResponse = await api.get(`/barangay/${user.target_id}`);
            logger.debug("📡 Alternative API response:", barangayResponse);
          }
        }

        if (barangayResponse.data) {
          // Check if the response has a nested data structure
          const barangay = barangayResponse.data.data || barangayResponse.data;

          // Check all possible field names for each property
          const barangayInfoData = {
            name:
              barangay.barangay_name ||
              barangay.name ||
              barangay.barangayName ||
              "Barangay Name",
            municipality:
              barangay.municipality_name ||
              barangay.municipality ||
              barangay.municipalityName ||
              "Municipality Name",
            province:
              barangay.province ||
              barangay.province_name ||
              barangay.provinceName ||
              "Province Name",
            certificate_background_path: barangay.certificate_background_path
              ? barangay.certificate_background_path.replace(/\\/g, "/")
              : "",
            barangay_logo_path: barangay.barangay_logo_path
              ? barangay.barangay_logo_path.replace(/\\/g, "/")
              : "",
            municipality_logo_path: barangay.municipality_logo_path
              ? barangay.municipality_logo_path.replace(/\\/g, "/")
              : "",
            captain_name:
              barangay.captain_name ||
              barangay.barangay_captain ||
              barangay.captainName ||
              barangay.name ||
              "[Name of Barangay Captain]",
            captain_position:
              barangay.captain_position ||
              barangay.captain_title ||
              "Barangay Captain",
          };

          setBarangayInfo(barangayInfoData);
        } else {
          if (process.env.NODE_ENV === 'development') {
  console.warn("⚠️ No barangay data found in response");
}
          // Try to get data from the main response if it's not nested
          const barangay = barangayResponse.data;
          if (barangay && (barangay.name || barangay.barangay_name)) {
            const barangayInfoData = {
              name:
                barangay.barangay_name ||
                barangay.name ||
                barangay.barangayName ||
                "Barangay Name",
              municipality:
                barangay.municipality_name ||
                barangay.municipality ||
                barangay.municipalityName ||
                "Municipality Name",
              province:
                barangay.province ||
                barangay.province_name ||
                barangay.provinceName ||
                "Province Name",
              certificate_background_path: barangay.certificate_background_path
                ? barangay.certificate_background_path.replace(/\\/g, "/")
                : "",
              barangay_logo_path: barangay.barangay_logo_path
                ? barangay.barangay_logo_path.replace(/\\/g, "/")
                : "",
              municipality_logo_path: barangay.municipality_logo_path
                ? barangay.municipality_logo_path.replace(/\\/g, "/")
                : "",
              captain_name:
                barangay.captain_name ||
                barangay.barangay_captain ||
                barangay.captainName ||
                barangay.barangayCaptain ||
                "[Name of Barangay Captain]",
              captain_position:
                barangay.captain_position ||
                barangay.captainPosition ||
                "Barangay Captain",
            };
            setBarangayInfo(barangayInfoData);
          } else {
            handleErrorSilently("❌ No valid barangay data found in response");
            setBarangayInfo({
              name: "Barangay Name",
              municipality: "Municipality Name",
              province: "Province Name",
              certificate_background_path: "",
              captain_name: "[Name of Barangay Captain]",
              captain_position: "Barangay Captain",
            });
          }
        }
      } catch (barangayError) {
        handleErrorSilently("❌ Error fetching barangay info:", barangayError);
        // Set default values if barangay info cannot be fetched
        setBarangayInfo({
          name: "Barangay Name",
          municipality: "Municipality Name",
          province: "Province Name",
          certificate_background_path: "",
          barangay_logo_path: "",
          municipality_logo_path: "",
          captain_name: "[Name of Barangay Captain]",
          captain_position: "Barangay Captain",
        });
      }

      setLoading(false);
    };

    fetchBarangayInfo();
  }, [user.target_id]);

  const [editableContent, setEditableContent] = useState("");

  // Security: Sanitize content before setting it
  const setSanitizedContent = (content) => {
    // Limit content length to prevent performance issues (max 5000 characters)
    const limitedContent =
      content.length > 5000 ? content.substring(0, 5000) : content;
    const sanitized = sanitizeHtml(limitedContent);
    setEditableContent(sanitized);
    // Show warning if content was truncated
    if (content.length > 5000) {
      toast({
        title: "Content truncated",
        description:
          "Certificate content was limited to 5000 characters for security and performance.",
        variant: "destructive",
      });
    }
  };

  const getCertificateContent = () => {
    // Use resident_info from request if available (for certificate requests)
    // Otherwise fall back to request data (for appointment requests)
    const residentInfo = request.resident_info;

    const fullName = residentInfo
      ? `${residentInfo.first_name || ""} ${residentInfo.middle_name || ""} ${
          residentInfo.last_name || ""
        } ${residentInfo.suffix || ""}`.trim()
      : request.full_name
          ?.replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()) || "Full Name";

    const address = residentInfo
      ? `${residentInfo.house_number || ""} ${residentInfo.street || ""}, ${
          residentInfo.purok_name || ""
        }`.trim()
      : request.address || "Complete Address";

    const purpose = sanitizeHtml(request.purpose || "Purpose");
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    // Helper function to format birthday in readable format
    const formatBirthday = (birthdate) => {
      if (!birthdate) return "birthdate";
      try {
        return new Date(birthdate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch (error) {
        return "birthdate";
      }
    };

    // Use barangayInfo state values, fallback to default values if not loaded yet
    const barangayName = barangayInfo.name || "Barangay Name";
    const municipalityName = barangayInfo.municipality || "Municipality Name";
    const provinceName = barangayInfo.province || "Province Name";

    logger.debug("🔍 Certificate Data Debug:", {
      residentInfo,
      fullName,
      address,
      purpose,
      barangayName,
      municipalityName,
      provinceName,
      barangayInfo,
    });

    const certificateTypes = {
             "barangay-clearance": {
         title: "BARANGAY CLEARANCE",

         body: `        This is to certify that <strong>${fullName}</strong>, ${
           residentInfo
             ? `${residentInfo.civil_status || "single/married"}, ${
                 residentInfo.sex || "male/female"
               }, born on ${formatBirthday(
                 residentInfo.birthdate
               )}, and a resident of`
             : "of legal age, single/married, and a resident of"
         } <strong>${address}</strong>, Barangay <strong>${barangayName}</strong>, Municipality of <strong>${municipalityName}</strong>, Province of <strong>${provinceName}</strong>, is known to be a person of good standing and without any derogatory record filed in this barangay.


This clearance is issued upon the request of the above-named individual for <strong>${purpose.toUpperCase()}</strong>.`,
       },

             residency: {
         title: "CERTIFICATE OF RESIDENCY",

         body: `        This is to certify that <strong>${fullName}</strong>, ${
           residentInfo
             ? `${residentInfo.civil_status || "single/married"}, ${
                 residentInfo.sex || "male/female"
               }, born on ${formatBirthday(residentInfo.birthdate)}, and a`
             : "of legal age, single/married, is a"
         } bonafide resident of Barangay <strong>${barangayName}</strong>, Municipality of <strong>${municipalityName}</strong>, Province of <strong>${provinceName}</strong>, and has been residing at <strong>${address}</strong> for a period of several years up to the present.


This certificate is issued upon the request of the aforementioned resident for <strong>${purpose.toUpperCase()}</strong>.`,
       },

                    indigency: {
         title: "CERTIFICATE OF INDIGENCY",

         body: `        This is to certify that <strong>${fullName}</strong>, ${
           residentInfo
             ? `${residentInfo.age || "of legal age"}, ${residentInfo.civil_status || "single/married"}`
             : "of legal age, single/married"
         }, and a resident of <strong>${address}</strong>, Barangay <strong>${barangayName}</strong>, Municipality of <strong>${municipalityName}</strong>, Province of <strong>${provinceName}</strong>, is a bona fide resident of this barangay and is considered an indigent.


         This certificate is issued for the purpose of <strong>${purpose.toUpperCase()}</strong>.`,
       },

             "good-moral": {
         title: "CERTIFICATE OF GOOD MORAL CHARACTER",

         body: `        This is to certify that <strong>${fullName}</strong>, ${
           residentInfo
             ? `${residentInfo.civil_status || "single/married"}, ${
                 residentInfo.sex || "male/female"
               }, born on ${formatBirthday(
                 residentInfo.birthdate
               )}, and a resident of`
             : "of legal age, single/married, and a resident of"
         } <strong>${address}</strong>, Barangay <strong>${barangayName}</strong>, Municipality of <strong>${municipalityName}</strong>, Province of <strong>${provinceName}</strong>, is known to be a person of good moral character, law-abiding, and has not been involved in any unlawful or immoral activity within the community.


This certificate is issued upon request of the above-named individual for <strong>${purpose.toUpperCase()}</strong>.`,
       },

             "business-clearance": {
         title: "BARANGAY BUSINESS CLEARANCE",

         body: `        This is to certify that <strong>${fullName}</strong>, ${
           residentInfo
             ? `${residentInfo.civil_status || "single/married"}, ${
                 residentInfo.sex || "male/female"
               }, born on ${formatBirthday(
                 residentInfo.birthdate
               )}, and a resident of`
             : "of legal age, single/married, and a resident of"
         } <strong>${address}</strong>, Barangay <strong>${barangayName}</strong>, Municipality of <strong>${municipalityName}</strong>, Province of <strong>${provinceName}</strong>, has complied with the requirements of the barangay and is hereby granted this Barangay Business Clearance.


This clearance is issued for the purpose of securing a Mayor's Permit / Business Permit and is valid for the current year unless otherwise revoked.`,
       },
    };

    const selectedCertificate =
      certificateTypes[request.certificate_type] ||
      certificateTypes["barangay-clearance"];

    logger.debug("📄 Generated certificate:", {
      certificateType: request.certificate_type,
      selectedCertificate,
      fullName,
      address,
      purpose,
      barangayName,
      municipalityName,
      provinceName,
    });

    return selectedCertificate;
  };

  const certificate = getCertificateContent();

  // Regenerate certificate content when barangay info is loaded
  useEffect(() => {
    if (
      barangayInfo.name &&
      barangayInfo.name !== "Barangay Name" &&
      certificate
    ) {
      logger.debug(
        "🔄 Regenerating certificate content with loaded barangay info"
      );
      setSanitizedContent(certificate.body);
    }
  }, [barangayInfo.name, barangayInfo.municipality, barangayInfo.province]);

  // Initialize editable content when certificate changes or barangayInfo updates

  useEffect(() => {
    logger.debug("🔄 Certificate useEffect triggered:", {
      certificate,
      editableContent,
      barangayInfoName: barangayInfo.name,
    });

    if (
      certificate &&
      (!editableContent ||
        !barangayInfo.name ||
        barangayInfo.name === "Barangay Name")
    ) {
      logger.debug("📝 Setting certificate content:", certificate.body);
      setSanitizedContent(certificate.body);
    }
  }, [certificate, editableContent, barangayInfo, request]);

  const handlePrint = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleDateString("en-US", { month: "long" });
    const year = today.getFullYear();
    
    const currentDate = `${day} day of ${month}, ${year}`;

    const printContent = `

      <html>
        <head>
          <title>${certificate.title}</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                background-image: none !important;
              }
              .certificate-background {
                display: block !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                z-index: -1 !important;
                object-fit: cover !important;
                opacity: 0.9 !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Ensure content is readable over background */
              .header, .title, .body, .bottom {
                position: relative;
                z-index: 1;
                background: rgba(255, 255, 255, 0.7);
                padding: 10px;
                border-radius: 5px;
              }
            }
            body {
              font-family: 'Times New Roman', serif;
              line-height: 1.6;
              margin: 0;

               padding: 1in;
              font-size: 12pt;


            }
            .header {
              text-align: center;
              margin-bottom: 40px;
            }

            .header p {
              margin: 3px 0;
              font-style: italic;
            }

            .title {
              text-align: center;
              font-size: 16pt;
              font-weight: bold;
              margin: 40px 0;
              text-decoration: underline;
            }

                         .body {
               text-align: justify;
               margin: 40px 0;
               line-height: 1.8;
               text-indent: 20px;
             }

            .bottom {
              margin-top: 60px;
              display: flex;
              flex-direction: column;
              min-height: 300px;
            }

                         .date-line {
               text-align: left;
               margin-bottom: 20px;
             }

            .signature-line {
              text-align: right;
              margin-top: auto;
            }

                         .signature-name {
               font-weight: bold;
               text-decoration: underline;
               margin-bottom: 5px;
             }

             .signature-title {
               margin-bottom: 3px;
             }

            .signature-seal {
              font-size: 10pt;
              color: #666;

            }

          </style>

        </head>

        <body>
          ${
            barangayInfo.certificate_background_path
              ? `<img src="${SERVER_URL}/${barangayInfo.certificate_background_path.replace(
                  /\\/g,
                  "/"
                )}" alt="Certificate Background" class="certificate-background" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; object-fit: cover; opacity: 0.9;">`
              : ""
          }

          <div class="header">
            <div class="logo-container" style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px; gap: 100px;">
                             ${
                 barangayInfo.municipality_logo_path
                   ? `<img src="${SERVER_URL}/${barangayInfo.municipality_logo_path}" alt="Municipality Logo" style="height: 80px; width: 80px; object-fit: contain;">`
                   : '<div style="height: 80px; width: 80px;"></div>'
               }
               <div style="text-align: center;">
                 <p>Republic of the Philippines</p>
                 <p>Province of ${barangayInfo.province}</p>
                 <p>Municipality of ${barangayInfo.municipality}</p>
                 <p>BARANGAY ${barangayInfo.name}</p>
               </div>
               ${
                 barangayInfo.barangay_logo_path
                   ? `<img src="${SERVER_URL}/${barangayInfo.barangay_logo_path}" alt="Barangay Logo" style="height: 80px; width: 80px; object-fit: contain;">`
                   : '<div style="height: 80px; width: 80px;"></div>'
               }
            </div>
          </div>

          

          <div class="title">${certificate.title}</div>

          

          <div class="body">

            ${editableContent}

          </div>

          

          <div class="bottom">

                                      <div class="date-line">

                 Issued this ${currentDate} at Barangay ${barangayInfo.name}, ${
       barangayInfo.municipality
     } for whatever legal purpose this may serve.
             </div>

            

                         <div class="signature-line">

               <div class="signature-name">${barangayInfo.captain_name}</div>

                 <div class="signature-title">${
                   barangayInfo.captain_position
                 }</div>
             </div>

          </div>

        </body>

      </html>

    `;

    // Create a hidden iframe for printing

    const printFrame = document.createElement("iframe");
    printFrame.style.display = "none";
    document.body.appendChild(printFrame);

    printFrame.contentDocument.write(printContent);

    printFrame.contentDocument.close();

    printFrame.onload = () => {
      printFrame.contentWindow.print();

      // Remove the iframe after printing

      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    };
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="px-4">
          <DialogTitle className="flex items-center justify-between">
            <span>Generate Certificate</span>
          </DialogTitle>

          <DialogDescription>
            Generate and print official certificates for residents. You can edit
            the certificate content below before printing.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end gap-2 mb-4 px-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSanitizedContent(certificate.body)}
            disabled={loading}
          >
            Reset Content
          </Button>

          <Button onClick={handlePrint} size="sm" disabled={loading}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>

        {loading ? (
          <LoadingSpinner 
            message="Loading certificate data..." 
            variant="default"
            size="default"
          />
        ) : (
          <div
            className="border rounded-lg relative mx-4"
            style={{
              minHeight: "A4",

              fontFamily: "Times New Roman, serif",

              padding: "1in",
              fontSize: "12pt",
              lineHeight: "1.6",
              ...(barangayInfo.certificate_background_path && {
                backgroundImage: `url('${SERVER_URL}/${barangayInfo.certificate_background_path.replace(
                  /\\/g,
                  "/"
                )}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundAttachment: "fixed",
              }),
            }}
          >
            {/* Header */}

            <div className="mb-10">
              <div className="flex justify-center items-center mb-5 gap-[100px]">
                                 {barangayInfo.municipality_logo_path ? (
                   <img
                     src={`${SERVER_URL}/${barangayInfo.municipality_logo_path}`}
                     alt="Municipality Logo"
                     className="h-15 w-15 object-contain"
                     style={{ height: "80px", width: "80px" }}
                   />
                 ) : (
                   <div style={{ height: "80px", width: "80px" }}></div>
                 )}
                <div className="text-center">
                  <p className="italic mb-1">Republic of the Philippines</p>
                  <p className="italic mb-1">
                    Province of {barangayInfo.province}
                  </p>
                  <p className="italic mb-1">
                    Municipality of {barangayInfo.municipality}
                  </p>
                  <p className="italic mb-1">BARANGAY {barangayInfo.name}</p>
                </div>
                                 {barangayInfo.barangay_logo_path ? (
                   <img
                     src={`${SERVER_URL}/${barangayInfo.barangay_logo_path}`}
                     alt="Barangay Logo"
                     className="h-15 w-15 object-contain"
                     style={{ height: "80px", width: "80px" }}
                   />
                 ) : (
                   <div style={{ height: "80px", width: "80px" }}></div>
                 )}
              </div>
            </div>

            {/* Title */}

            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold underline">
                {certificate.title}
              </h1>
            </div>

                         {/* Editable Body */}

             <div className="text-justify mb-10 leading-relaxed">
               <Textarea
                 value={editableContent}
                 onChange={(e) => setSanitizedContent(e.target.value)}
                 className="min-h-[200px] border-0 p-0 resize-none focus:ring-0 focus:border-0 font-serif"
                 placeholder="Edit certificate content here..."
                                   style={{
                    fontFamily: "Times New Roman, serif",
                    lineHeight: "1.8",
                    fontSize: "12pt",
                    backgroundColor: "transparent",
                    textIndent: "20px",
                  }}
               />
             </div>

            {/* Bottom Section */}

            <div className="mt-3 flex flex-col" style={{ minHeight: "200px" }}>
                           <div className="text-left mb-5">
               <p>
                 Issued this{" "}
                 {(() => {
                   const today = new Date();
                   const day = today.getDate();
                   const month = today.toLocaleDateString("en-US", { month: "long" });
                   const year = today.getFullYear();
                   return `${day} day of ${month}, ${year}`;
                 })()}{" "}
                 at Barangay {barangayInfo.name}, {barangayInfo.municipality} for whatever legal purpose this may serve.
               </p>
             </div>

              <div className="mt-auto ml-auto mr-1">
                <p className="font-bold underline mb-1 text-center">
                  {barangayInfo.captain_name}
                </p>

                <p className="mb-1 text-center">
                  {barangayInfo.captain_position}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const RequestsPage = () => {
  // Set up unified auto refresh for requests data
  const { registerRefreshCallback, handleCRUDOperation, triggerRefresh } = useUnifiedAutoRefresh({
    entityType: 'request',
    successMessage: 'Request operation completed successfully!',
    autoRefresh: true,
    refreshDelay: 100
  });
  const [requests, setRequests] = useState([]);

  const [loading, setLoading] = useState(true);

  const [selectedRequest, setSelectedRequest] = useState(null);

  const [statusDialog, setStatusDialog] = useState(false);

  const [certificateDialog, setCertificateDialog] = useState(false);

  const [statusUpdate, setStatusUpdate] = useState({
    status: "select",

    notes: "",
  });

  // Filter states

  const [searchTerm, setSearchTerm] = useState("");

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const [typeFilter, setTypeFilter] = useState("all");

  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination states

  const [page, setPage] = useState(1);

  const [perPage, setPerPage] = useState(10);

  const [total, setTotal] = useState(0);

  // QR Scanner states

  const [showQRScanner, setShowQRScanner] = useState(false);

  const [qrScanner, setQrScanner] = useState(null);

  const [qrScannerLoading, setQrScannerLoading] = useState(false);

  const [qrScanInProgress, setQrScanInProgress] = useState(false);

  const qrScannerRef = useRef(null);
  const activeQrScannerRef = useRef(null);

  const [scannedResident, setScannedResident] = useState(null);

  const [showReviewDialog, setShowReviewDialog] = useState(false);

  // Scanner mode state
  const [scannerMode, setScannerMode] = useState("qr"); // 'qr' or 'manual'

  // Manual search state
  const [manualResidentId, setManualResidentId] = useState("");

  // Camera switching state
  const [currentCamera, setCurrentCamera] = useState("user"); // 'environment' (back) or 'user' (front)
  const [availableCameras, setAvailableCameras] = useState([]);
  const [cameraSwitchLoading, setCameraSwitchLoading] = useState(false);


  const [reviewFormData, setReviewFormData] = useState({
    certificateType: "",

    urgency: "normal",

    purpose: "",

    comments: "",
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Search functionality state (for QR code results only)
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const { user } = useAuth();

  // Enhanced mobile detection - prioritize actual mobile devices over responsive design
  const isMobileDevice = 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 0 && window.innerWidth <= 768) || // Combined touch and width for better accuracy
    // Fallback to window width for very small screens, but less reliable for true mobile detection
    (window.innerWidth <= 480 && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

  // Check if it's a real mobile device (not just responsive design)
  const isRealMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Check HTTPS and camera compatibility
  const checkCameraCompatibility = () => {
    const issues = [];
    
    // Check HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      issues.push('HTTPS_REQUIRED');
    }
    
    // Check camera support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      issues.push('CAMERA_NOT_SUPPORTED');
    }
    
    // Check for secure context
    if (!window.isSecureContext) {
      issues.push('SECURE_CONTEXT_REQUIRED');
    }
    
    return issues;
  };



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
      // Use ref to get the latest scanner instance
      const scanner = activeQrScannerRef.current;
      if (scanner) {
        // Html5Qrcode requires stop() before clear()
        // Use optional chaining to safely handle missing methods
        try {
          if (scanner.stop && typeof scanner.stop === 'function') {
            scanner.stop().catch(() => {});
          }
          if (scanner.clear && typeof scanner.clear === 'function') {
            scanner.clear().catch(() => {});
          }
        } catch (error) {
          // Silently handle any errors during cleanup
          logger.debug("Error during QR scanner cleanup:", error);
        }
      }
    };
  }, []);

  // Stop scanner when switching to manual mode
  useEffect(() => {
    if (scannerMode === "manual" && qrScanner) {
      // Html5Qrcode requires stop() before clear()
      try {
        if (qrScanner.stop && typeof qrScanner.stop === 'function') {
          qrScanner.stop().catch(() => {});
        }
        if (qrScanner.clear && typeof qrScanner.clear === 'function') {
          qrScanner.clear().catch(() => {});
        }
      } catch (error) {
        logger.debug("Error stopping scanner when switching to manual:", error);
      }
      setQrScanner(null);
      activeQrScannerRef.current = null;
    }
  }, [scannerMode]);

  // Debounce search term

  const fetchRequests = async () => {
    try {
      setLoading(true);

      const response = await api.get("/requests", {
        params: {
          barangayId: user.target_id,

          page,

          perPage,
        },
      });

      // console.log("Response: ", response);

      // Handle the response structure from getAllRequests

      const responseData = response.data.data;

      if (responseData && responseData.data) {
        // If the response has pagination structure

        setRequests(responseData.data);

        setTotal(
          responseData.pagination?.totalRecords ||
            responseData.total ||
            responseData.data.length
        );
        if (responseData.pagination) {
          setPage(responseData.pagination.page || 1);

          setPerPage(responseData.pagination.perPage || 10);
        }
      } else if (Array.isArray(responseData)) {
        // If the response is directly an array

        setRequests(responseData);

        setTotal(responseData.length);
      } else {
        // Fallback

        setRequests([]);

        setTotal(0);
      }
    } catch (error) {
      handleError("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchRequests();
  }, [page, perPage]);

  // Register refresh callback for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(fetchRequests);
    return () => {
      unregister();
    };
  }, [registerRefreshCallback, fetchRequests]);

  // Fetch total stats on component mount and when requests change
  useEffect(() => {
    fetchTotalStats();
  }, [requests]); // Add requests dependency to update stats when requests change

  // Fetch total counts for statistics (without pagination)

  const [totalStats, setTotalStats] = useState({
    total: 0,

    pending: 0,

    completed: 0,

    rejected: 0,

    certificates: 0,

    appointments: 0,
  });

  const fetchTotalStats = async () => {
    try {
      const response = await api.get("/requests", {
        params: {
          barangayId: user.target_id,

          // Get all records for statistics

          page: 1,

          perPage: 1000, // Large number to get all records
        },
      });

      const responseData = response.data.data;

      let allRequests = [];

      if (responseData && responseData.data) {
        allRequests = responseData.data;
      } else if (Array.isArray(responseData)) {
        allRequests = responseData;
      }

      // Calculate statistics from all requests

      setTotalStats({
        total: allRequests.length,

        pending: allRequests.filter((r) => r.status === "pending").length,
        completed: allRequests.filter((r) => r.status === "completed").length,
        rejected: allRequests.filter((r) => r.status === "rejected").length,
        certificates: allRequests.filter((r) => r.type === "certificate")
          .length,
        appointments: allRequests.filter((r) => r.type === "appointment")
          .length,
      });
    } catch (error) {
      handleErrorSilently("Error fetching total stats:", error);
    }
  };

  // Filter requests based on search term, type, and status

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      // Type filter

      if (typeFilter !== "all" && request.type !== typeFilter) {
        return false;
      }

      // Status filter

      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }

      // Search filter

      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();

        // For certificate requests, search in resident_info

        const fullName =
          request.type === "certificate" && request.resident_info
            ? `${request.resident_info.first_name || ""} ${
                request.resident_info.last_name || ""
              }`.toLowerCase()
            : request.full_name?.toLowerCase() || "";

        const contactNumber =
          request.type === "certificate" && request.resident_info
            ? request.resident_info.contact_number?.toLowerCase() || ""
            : request.contact_number?.toLowerCase() || "";

        const email =
          request.type === "certificate" && request.resident_info
            ? request.resident_info.email?.toLowerCase() || ""
            : request.email?.toLowerCase() || "";

        const address =
          request.type === "certificate" && request.resident_info
            ? `${request.resident_info.house_number || ""} ${
                request.resident_info.street || ""
              } ${request.resident_info.purok_name || ""}`.toLowerCase()
            : request.address?.toLowerCase() || "";

        const purpose = request.purpose?.toLowerCase() || "";

        const certificateType = request.certificate_type?.toLowerCase() || "";

        const appointmentType =
          request.type === "appointment" ? "appointment" : "";

        return (
          fullName.includes(searchLower) ||
          contactNumber.includes(searchLower) ||
          email.includes(searchLower) ||
          address.includes(searchLower) ||
          purpose.includes(searchLower) ||
          certificateType.includes(searchLower) ||
          appointmentType.includes(searchLower)
        );
      }

      return true;
    });
  }, [requests, debouncedSearchTerm, typeFilter, statusFilter]);

  const updateRequestStatus = async (requestId, status, notes) => {
    try {
      await handleCRUDOperation(
        async (data) => {
          return await api.put(`/requests/${data.requestId}/status`, {
            status: data.status,
            notes: data.notes,
          });
        },
        { requestId: selectedRequest.id, status, notes },
        'update'
      );

      setStatusDialog(false);
      setSelectedRequest(null);
      setStatusUpdate({ status: "select", notes: "" });

      // Also fetch updated stats after status change
      fetchTotalStats();
    } catch (error) {
      console.error('Failed to update request status:', error);
    }
  };

  const handleStatusUpdate = () => {
    if (!selectedRequest || statusUpdate.status === "select") return;

    updateRequestStatus(
      selectedRequest.id,

      statusUpdate.status,

      statusUpdate.notes
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
      },
      // approved: { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },

      rejected: {
        color: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
      },
      completed: {
        color: "bg-blue-100 text-blue-800 border-blue-200",
        icon: CheckCircle,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    const Icon = config.icon;

    return (
      <Badge
        className={`${config.color} border font-medium w-24 flex items-center justify-center`}
      >
        <Icon className="w-3 h-3 mr-1" />

        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeIcon = (type) => {
    return type === "certificate" ? FileText : Calendar;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",

      month: "short",

      day: "numeric",

      hour: "2-digit",

      minute: "2-digit",
    });
  };

  const formatAppointmentDate = (dateString) => {
    const date = new Date(dateString);

    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);

    const hours = date.getHours();

    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");

    return `${month}/${day}/${year} ${formattedHours}:${minutes} ${ampm}`;
  };

  // Pagination controls

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));

  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  // QR Scanner functions (updated to use Html5Qrcode like working public page)

  // Test camera access with fallback strategies
  const testCameraAccessWithFallback = async () => {
    // Go directly to creating scanner without testing camera first
    // This prevents the duplicate feed issue
    logger.debug("Skipping camera test, going directly to scanner");
    createAndRenderScanner();
  };

  const startQRScanner = async () => {
    setQrScanInProgress(false);
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
    const existingScanner = activeQrScannerRef.current;
    if (existingScanner) {
      try {
        // Always try stop() first for Html5Qrcode
        if (existingScanner.stop && typeof existingScanner.stop === 'function') {
          existingScanner.stop().catch(() => {});
        }
        
        // Then clear if available (but only after stopping)
        if (existingScanner.clear && typeof existingScanner.clear === 'function') {
          existingScanner.clear().catch(() => {});
        }
      } catch (err) {
        // If stop fails, try to clear anyway
        try {
          if (existingScanner.clear && typeof existingScanner.clear === 'function') {
            existingScanner.clear().catch(() => {});
          }
        } catch (clearErr) {
          logger.debug("Error clearing scanner in createAndRenderScanner:", clearErr);
        }
        logger.debug("Error cleaning up scanner:", err);
      }
      setQrScanner(null);
      activeQrScannerRef.current = null;
    }

    // Clear the container completely and remove ALL child elements
    const qrReaderElement = document.getElementById("qr-reader-requests");
    if (qrReaderElement) {
      // Remove all child elements
      while (qrReaderElement.firstChild) {
        qrReaderElement.removeChild(qrReaderElement.firstChild);
      }
    }

    // Clean up any leftover video elements from previous scans
    setTimeout(() => {
      const leftoverVideos = document.querySelectorAll('video');
      leftoverVideos.forEach(video => {
        if (!video.parentElement || video.parentElement.id !== 'qr-reader-requests') {
          video.remove();
        }
      });
    });

    // No delay needed since we already waited in testCameraAccessWithFallback
    if (!qrScannerRef.current) {
      logger.debug("QR scanner ref not available");
      setQrScannerLoading(false);
      return;
    }

    try {
      // Use Html5Qrcode directly for better camera control (no file fallback)
      const html5QrCode = new Html5Qrcode("qr-reader-requests");
        
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };
        
      const qrCodeSuccessCallback = (decodedText, decodedResult) => {
        // Prevent multiple scans with multiple checks
        if (qrScanInProgress) {
          logger.debug("Scan ignored - already processing");
          return;
        }

        // Set flags immediately to prevent multiple scans
        setQrScanInProgress(true);

        logger.debug("QR Code scanned successfully:", decodedText);

        // Stop the scanner gracefully without calling our cleanup function
        try {
          if (html5QrCode && html5QrCode.stop && typeof html5QrCode.stop === 'function') {
            html5QrCode.stop().then(() => {
              logger.debug("Scanner stopped successfully after QR detection");
              setQrScanner(null);
              activeQrScannerRef.current = null;
              setShowQRScanner(false);
            }).catch((stopError) => {
              logger.debug("Error stopping scanner after QR detection:", stopError);
              // Continue anyway
              setQrScanner(null);
              activeQrScannerRef.current = null;
              setShowQRScanner(false);
            });
          }
        } catch (error) {
          logger.debug("Error in QR success callback:", error);
          // Continue anyway
          setQrScanner(null);
          activeQrScannerRef.current = null;
          setShowQRScanner(false);
        }

        // Then process the QR code
        handleQRCodeScanned(decodedText);
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
        activeQrScannerRef.current = html5QrCode;
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
    const currentScanner = activeQrScannerRef.current;
    if (currentScanner) {
      try {
        // Always try stop() first for Html5Qrcode
        if (currentScanner.stop && typeof currentScanner.stop === 'function') {
          await currentScanner.stop();
        }
        
        // Then clear if available (but only after stopping)
        if (currentScanner.clear && typeof currentScanner.clear === 'function') {
          await currentScanner.clear();
        }
      } catch (error) {
        // If stop fails, try to clear anyway
        try {
          if (currentScanner.clear && typeof currentScanner.clear === 'function') {
            await currentScanner.clear();
          }
        } catch (clearError) {
          logger.debug("Error clearing scanner:", clearError);
        }
        logger.debug("Error stopping scanner:", error);
      }
      setQrScanner(null);
      activeQrScannerRef.current = null;
    }

    // Clear QR reader container
    const qrReaderElement = document.getElementById("qr-reader-requests");
    if (qrReaderElement) {
      qrReaderElement.innerHTML = "";
    }

    // Reset all scanner states
    setShowQRScanner(false);
    setQrScannerLoading(false);
    setQrScanInProgress(false);
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

  const handleScanError = (errorMessage) => {
    console.log("QR Scan error:", errorMessage);
    // Only show error if it's not just a "no QR code found" message
    if (!errorMessage.includes("No QR code found") && !errorMessage.includes("NotFoundException")) {
      logger.debug("QR Scan error:", errorMessage);
      // Check for camera-specific errors
      if (errorMessage.includes("NotAllowedError") || errorMessage.includes("Permission denied")) {
        toast({
          title: "Camera Permission Error",
          description: "Camera access was denied. Please allow camera permissions and try again.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("NotFoundError")) {
        toast({
          title: "Camera Not Found",
          description: "No camera found on your device.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("NotReadableError")) {
        toast({
          title: "Camera In Use",
          description: "Camera is already in use by another application.",
          variant: "destructive",
        });
      }
    }
  };








  // Helper: decrypt resident ID (base64 decode)

  const decryptId = (encryptedId) => {
    try {
      return atob(encryptedId);
    } catch (error) {
      handleErrorSilently("Failed to decrypt ID:", error);

      return null;
    }
  };

  const handleQRCodeScanned = (qrData) => {
    logger.debug("Processing QR data:", qrData);

    // Validate input
    if (!qrData || typeof qrData !== "string" || qrData.trim().length === 0) {
      toast({
        title: "Invalid QR Code",
        description: "The scanned QR code contains no valid data.",
        variant: "destructive",
      });
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
        description: "The scanned QR code does not contain valid resident information. Please ensure you're scanning the correct QR code from your barangay ID.",
        variant: "destructive",
      });

    } catch (error) {
      logger.debug("Error processing QR code:", error);
      toast({
        title: "QR Code Processing Error",
        description: "An error occurred while processing the QR code. Please try again.",
        variant: "destructive",
      });
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
          // Check if the resident's barangay matches the current barangay
          // Convert both to strings for comparison to handle type mismatches
          const residentBarangayId = String(residentData.barangay_id);
          const userBarangayId = String(user.target_id);
          
          logger.debug("Comparing barangay IDs:", {
            residentBarangayId,
            userBarangayId,
            match: residentBarangayId === userBarangayId
          });
          
          if (residentBarangayId !== userBarangayId) {
            setSearchError(
              `This resident is not registered in this barangay. Kindly choose the appropriate barangay.`
            );
            toast({
              title: "Wrong Barangay",
              description: `This resident is not registered in this barangay. Kindly choose the appropriate barangay.`,
              variant: "destructive",
            });
            return;
          }

          // Set the scanned resident data and show review dialog
          setScannedResident(residentData);
          setShowReviewDialog(true);

          toast({
            title: "Resident found!",
            description:
              "QR code scanned successfully. Opening certificate request form...",
          });
        } else {
          setSearchError("No resident found with this QR code");
          toast({
            title: "Resident not found",
            description:
              "The scanned QR code does not match any resident in our records.",
            variant: "destructive",
          });
        }
      })
      .catch((err) => {
        handleErrorSilently("Error fetching resident details:", err);
        setSearchError("No resident found with this QR code");
        toast({
          title: "Resident not found",
          description:
            "The scanned QR code does not match any resident in our records.",
          variant: "destructive",
        });
      })
      .finally(() => setSearchLoading(false));
  };

  const handleReviewFormChange = (field, value) => {
    setReviewFormData((prev) => ({
      ...prev,

      [field]: value,
    }));
  };

  const handleSubmitReview = async () => {
    if (!scannedResident) return;

    // Validate required fields
    if (!reviewFormData.certificateType || !reviewFormData.purpose) {
      toast({
        title: "Missing Information",
        description:
          "Please fill in all required fields: Certificate Type and Purpose.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      // Prepare request payload with only required fields for certificate requests
      const requestPayload = {
        residentId: scannedResident.resident_id,
        barangayId: scannedResident.barangay_id,
        certificateType: reviewFormData.certificateType,
        urgency: reviewFormData.urgency,
        purpose: reviewFormData.purpose,
      };

      // Call the API to create the request
      const response = await api.post(
        "/public/requests/certificate",
        requestPayload
      );

      // Show success message
      toast({
        title: "Request Submitted Successfully!",
        description: `Your ${reviewFormData.certificateType.replace(
          /-/g,
          " "
        )} request has been submitted.`,
        variant: "default",
      });

      // Close dialog and reset form
      setShowReviewDialog(false);
      setScannedResident(null);
      setReviewFormData({
        certificateType: "",
        urgency: "normal",
        purpose: "",
        comments: "",
      });

      // Refresh the requests list

      fetchRequests();
    } catch (error) {
      handleError("Error creating certificate request:", error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle manual resident ID search
  const handleManualSearch = async () => {
    if (!manualResidentId.trim()) {
      toast({
        title: "Resident ID Required",
        description: "Please enter a resident ID to search.",
        variant: "destructive",
      });
      return;
    }

    setSearchLoading(true);
    setSearchError("");

    try {
      // Use the same API endpoint as QR scanning
      const response = await api.get(`/public/${manualResidentId.trim()}/resident/public-qr`);
      const residentData = response.data.data;

      if (residentData && residentData.resident_id) {
        // Check if the resident's barangay matches the current barangay
        const residentBarangayId = String(residentData.barangay_id);
        const userBarangayId = String(user.target_id);
        
        if (residentBarangayId !== userBarangayId) {
          setSearchError(
            `This resident is not registered in this barangay. Kindly choose the appropriate barangay.`
          );
          toast({
            title: "Wrong Barangay",
            description: `This resident is not registered in this barangay. Kindly choose the appropriate barangay.`,
            variant: "destructive",
          });
          return;
        }

        // Set the scanned resident data and show review dialog
        setScannedResident(residentData);
        setShowReviewDialog(true);
        setShowQRScanner(false); // Close the scanner dialog

        toast({
          title: "Resident found!",
          description: "Resident ID found successfully. Opening certificate request form...",
        });
      } else {
        setSearchError("No resident found with this ID");
        toast({
          title: "Resident not found",
          description: "The entered resident ID does not match any resident in our records.",
          variant: "destructive",
        });
      }
    } catch (error) {
      handleErrorSilently("Error fetching resident details:", error);
      setSearchError("No resident found with this ID");
      toast({
        title: "Resident not found",
        description: "The entered resident ID does not match any resident in our records.",
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingSpinner 
        message="Loading requests..." 
        variant="default"
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 min-h-screen">
      {/* Header */}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Request Management</h1>

          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage certificate and appointment requests from residents
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <RefreshControls 
            variant="outline"
            size="sm"
          />
          <Button
            onClick={startQRScanner}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-xs sm:text-sm flex-1 sm:flex-none"
            disabled={qrScannerLoading}
          >
            {qrScannerLoading ? (
              <>
                <LoadingSpinner 
                  message="Starting..." 
                  variant="default"
                  size="sm"
                />
              </>
            ) : (
              <>
                <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Scan QR Code</span>
                <span className="sm:hidden">QR Scan</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search & Filter Section */}

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Search & Filter</CardTitle>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />

                <Input
                  placeholder="Search by name, contact, email, address, purpose..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 text-xs sm:text-sm"
                />

                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 p-0"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="w-2 h-2 sm:w-3 sm:h-3" />
                  </Button>
                )}
              </div>

              <Select
                value={typeFilter}
                onValueChange={(val) => setTypeFilter(val)}
              >
                <SelectTrigger className="w-full sm:w-48 text-xs sm:text-sm">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Requests</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val)}
              >
                <SelectTrigger className="w-full sm:w-48 text-xs sm:text-sm">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Requests
            </CardTitle>
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent className="p-3 sm:p-6 !pt-0">
            <div className="text-lg sm:text-2xl font-bold">{totalStats.total}</div>

            <p className="text-xs text-muted-foreground">
              {totalStats.certificates} Certificates • {totalStats.appointments}{" "}
              Appointments
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>

            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent className="p-3 sm:p-6 !pt-0">
            <div className="text-lg sm:text-2xl font-bold">{totalStats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>

            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent className="p-3 sm:p-6 !pt-0">
            <div className="text-lg sm:text-2xl font-bold">{totalStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium">Rejected</CardTitle>

            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent className="p-3 sm:p-6 !pt-0">
            <div className="text-lg sm:text-2xl font-bold">{totalStats.rejected}</div>
            <p className="text-xs text-muted-foreground">Declined requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">
            All Requests
            {filteredRequests.length !== totalStats.total && (
              <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2">
                ({filteredRequests.length} of {totalStats.total})
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto p-3 sm:p-6">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />

              <p className="text-muted-foreground">
                {totalStats.total === 0
                  ? "No requests found"
                  : "No requests match your filters"}
              </p>

              {totalStats.total > 0 && filteredRequests.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setTypeFilter("all");

                    setStatusFilter("all");

                    setSearchTerm("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Request</TableHead>

                  <TableHead className="text-xs sm:text-sm">Resident</TableHead>

                  <TableHead className="text-xs sm:text-sm">Type</TableHead>

                  <TableHead className="text-xs sm:text-sm">Status</TableHead>

                  <TableHead className="text-xs sm:text-sm">Date</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredRequests.map((request) => {
                  const TypeIcon = getTypeIcon(request.type);

                  return (
                    <TableRow
                      key={request.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="bg-primary/10 rounded-full p-1.5 sm:p-2">
                            <TypeIcon className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                          </div>

                          <div>
                            <div className="font-semibold text-xs sm:text-sm">
                              {request.type === "certificate"
                                ? request.certificate_type

                                    ?.replace(/-/g, " ")

                                    .replace(/\b\w/g, (l) => l.toUpperCase())
                                : "Appointment"}
                            </div>

                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              {request.type === "certificate" ? (
                                <>
                                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full"></span>

                                  {request.urgency}
                                </>
                              ) : (
                                <>
                                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />

                                  {request.appointment_date
                                    ? formatAppointmentDate(
                                        request.appointment_date
                                      )
                                    : "No date set"}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-muted/50 rounded-full p-1">
                            <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                          </div>

                          <div>
                            <div className="font-medium text-xs sm:text-sm">
                              {request.type === "certificate" &&
                              request.resident_info
                                ? `${request.resident_info.first_name || ""} ${
                                    request.resident_info.last_name || ""
                                  }`.trim()
                                : request.full_name

                                    ?.replace(/-/g, " ")

                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                            </div>

                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3" />

                              {request.type === "certificate" &&
                              request.resident_info
                                ? request.resident_info.contact_number ||
                                  "No contact"
                                : request.contact_number || "No contact"}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-medium text-xs"
                        >
                          {request.type.charAt(0).toUpperCase() +
                            request.type.slice(1)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs sm:text-sm font-medium">
                          {formatDate(request.created_at)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination Controls */}

          {filteredRequests.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 mt-4">
              <div className="text-xs sm:text-sm">
                Page {page} of {totalPages}
              </div>

              <div className="flex gap-2 items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={page === 1}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={page === totalPages || totalPages === 0}
                  className="text-xs sm:text-sm"
                >
                  Next
                </Button>

                <select
                  className="w-20 sm:w-24 border rounded px-2 py-1 text-xs sm:text-sm"
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                >
                  <option value={5}>5 / page</option>

                  <option value={10}>10 / page</option>

                  <option value={20}>20 / page</option>

                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}

      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Request Details
            </DialogTitle>

            <div className="flex items-center gap-2">
              {selectedRequest?.type === "certificate" && (
                <Button
                  variant="outline"
                  size="sm"
                  title="Generate Certificate"
                  onClick={() => {
                    setCertificateDialog(true);
                  }}
                  className="hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusUpdate({
                    status: "select",

                    notes: selectedRequest?.notes || "",
                  });

                  setStatusDialog(true);
                }}
                className="hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Update Status
              </Button>
            </div>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Header with main info */}

              <div className="flex items-center gap-4 mb-6">
                <div className="bg-primary/10 rounded-full p-3">
                  <User className="h-8 w-8 text-primary" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xl font-bold">
                      {selectedRequest.type === "certificate" &&
                      selectedRequest.resident_info
                        ? `${selectedRequest.resident_info.first_name || ""} ${
                            selectedRequest.resident_info.last_name || ""
                          }`.trim()
                        : selectedRequest.full_name

                            ?.replace(/-/g, " ")

                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </div>
                    {selectedRequest.uuid && (
                      <>
                        <code className="text-xs bg-muted/50 px-2 py-1 rounded border font-mono text-muted-foreground">
                          {selectedRequest.uuid}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 hover:bg-primary/10"
                          title="Copy Tracking ID"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const uuidText = selectedRequest.uuid;
                            
                            // Try modern Clipboard API first
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              try {
                                await navigator.clipboard.writeText(uuidText);
                                toast({
                                  title: "Copied!",
                                  description: "Tracking ID copied to clipboard",
                                });
                                return;
                              } catch (err) {
                                console.error("Clipboard API failed:", err);
                                // Fall through to fallback method
                              }
                            }
                            
                            // Fallback: HTTP-compatible copy method
                            const input = document.createElement("input");
                            input.value = uuidText;
                            input.style.position = "fixed";
                            input.style.opacity = "0";
                            input.style.left = "-9999px"; // Move off-screen to avoid interference
                            document.body.appendChild(input);
                            input.select();
                            input.setSelectionRange(0, 99999);
                            
                            let success = false;
                            try {
                              success = document.execCommand('copy');
                            } catch (err) {
                              console.error("Copy failed:", err);
                            }
                            
                            document.body.removeChild(input);
                            
                            if (success) {
                              toast({
                                title: "Copied!",
                                description: "Tracking ID copied to clipboard",
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
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="text-muted-foreground text-sm flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />

                    {selectedRequest.type === "certificate" &&
                    selectedRequest.resident_info
                      ? selectedRequest.resident_info.contact_number || (
                          <span className="italic text-xs">No contact</span>
                        )
                      : selectedRequest.contact_number || (
                          <span className="italic text-xs">No contact</span>
                        )}
                  </div>

                  <div className="text-muted-foreground text-sm flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />

                    {selectedRequest.type === "certificate" &&
                    selectedRequest.resident_info
                      ? selectedRequest.resident_info.email || (
                          <span className="italic text-xs">No email</span>
                        )
                      : selectedRequest.email || (
                          <span className="italic text-xs">No email</span>
                        )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {getStatusBadge(selectedRequest.status)}

                  <Badge variant="outline">
                    {selectedRequest.type.charAt(0).toUpperCase() +
                      selectedRequest.type.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Quick stats grid */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Request Date
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="text-lg font-semibold">
                      {formatDate(selectedRequest.created_at)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      Address
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="text-sm font-semibold">
                      {selectedRequest.type === "certificate" &&
                      selectedRequest.resident_info
                        ? `${
                            selectedRequest.resident_info.house_number || ""
                          } ${selectedRequest.resident_info.street || ""}, ${
                            selectedRequest.resident_info.purok_name || ""
                          }`.trim() || "Not specified"
                        : selectedRequest.address || "Not specified"}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Purpose
                    </CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="text-sm font-semibold">
                      {selectedRequest.purpose || "Not specified"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Information */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" />
                      Request Information
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-muted/50">
                      <span className="text-sm font-medium text-muted-foreground">
                        Request Type:
                      </span>
                      <span className="text-sm font-semibold">
                        {selectedRequest.type === "certificate"
                          ? selectedRequest.certificate_type

                              ?.replace(/-/g, " ")

                              .replace(/\b\w/g, (l) => l.toUpperCase())
                          : "Appointment"}
                      </span>
                    </div>

                    {selectedRequest.type === "certificate" && (
                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-sm font-medium text-muted-foreground">
                          Urgency:
                        </span>
                        <span className="text-sm font-semibold">
                          {selectedRequest.urgency}
                        </span>
                      </div>
                    )}

                    {selectedRequest.type === "appointment" && (
                      <div className="flex justify-between items-center py-2 border-b border-muted/50">
                        <span className="text-sm font-medium text-muted-foreground">
                          Appointment Date:
                        </span>
                        <span className="text-sm font-semibold">
                          {selectedRequest.appointment_date
                            ? formatAppointmentDate(
                                selectedRequest.appointment_date
                              )
                            : "No date set"}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-2 border-b border-muted/50">
                      <span className="text-sm font-medium text-muted-foreground">
                        Status:
                      </span>
                      <div>{getStatusBadge(selectedRequest.status)}</div>
                    </div>

                    {selectedRequest.notes && (
                      <div className="flex justify-between items-start py-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Notes:
                        </span>
                        <span className="text-sm font-semibold text-right max-w-xs">
                          {selectedRequest.notes}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Resident Information
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-muted/50">
                      <span className="text-sm font-medium text-muted-foreground">
                        Full Name:
                      </span>
                      <span className="text-sm font-semibold">
                        {selectedRequest.type === "certificate" &&
                        selectedRequest.resident_info
                          ? `${
                              selectedRequest.resident_info.first_name || ""
                            } ${
                              selectedRequest.resident_info.middle_name || ""
                            } ${
                              selectedRequest.resident_info.last_name || ""
                            } ${
                              selectedRequest.resident_info.suffix || ""
                            }`.trim()
                          : selectedRequest.full_name

                              ?.replace(/-/g, " ")

                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-muted/50">
                      <span className="text-sm font-medium text-muted-foreground">
                        Contact Number:
                      </span>
                      <span className="text-sm font-semibold">
                        {selectedRequest.type === "certificate" &&
                        selectedRequest.resident_info
                          ? selectedRequest.resident_info.contact_number ||
                            "N/A"
                          : selectedRequest.contact_number || "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-muted/50">
                      <span className="text-sm font-medium text-muted-foreground">
                        Email:
                      </span>
                      <span className="text-sm font-semibold">
                        {selectedRequest.type === "certificate" &&
                        selectedRequest.resident_info
                          ? selectedRequest.resident_info.email || "N/A"
                          : selectedRequest.email || "N/A"}
                      </span>
                    </div>

                    <div className="flex justify-between items-start py-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Address:
                      </span>
                      <span className="text-sm font-semibold text-right max-w-xs">
                        {selectedRequest.type === "certificate" &&
                        selectedRequest.resident_info
                          ? `${
                              selectedRequest.resident_info.house_number || ""
                            } ${selectedRequest.resident_info.street || ""}, ${
                              selectedRequest.resident_info.purok_name || ""
                            }`.trim() || "Not specified"
                          : selectedRequest.address}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Request Status</DialogTitle>

            <DialogDescription>
              Update the status and add notes for this request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>

              <select
                id="status"
                className="w-full px-3 py-2 border border-input rounded-md"
                value={statusUpdate.status}
                onChange={(e) =>
                  setStatusUpdate((prev) => ({
                    ...prev,

                    status: e.target.value,
                  }))
                }
              >
                <option value="select" disabled>
                  Select Status
                </option>
                <option value="rejected">Rejected</option>

                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>

              <Textarea
                id="notes"
                placeholder="Add any notes about this request..."
                value={statusUpdate.notes}
                onChange={(e) =>
                  setStatusUpdate((prev) => ({
                    ...prev,

                    notes: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStatusDialog(false)}>
                Cancel
              </Button>

              <Button
                onClick={handleStatusUpdate}
                disabled={statusUpdate.status === "select"}
              >
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificate Generation Dialog */}

      {certificateDialog && selectedRequest && (
        <CertificateTemplate
          request={selectedRequest}
          onClose={() => {
            setCertificateDialog(false);

            setSelectedRequest(null);
          }}
        />
      )}

      {/* QR Scanner Dialog */}

      <Dialog open={showQRScanner} onOpenChange={(open) => {
        if (!open) {
          // Only close if not currently initializing
          if (!qrScannerLoading) {
            setShowQRScanner(false);
          }
        }
      }}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Resident Identification
            </DialogTitle>

            <DialogDescription className="text-xs sm:text-sm">
              Choose how you want to identify the resident
            </DialogDescription>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="flex border-b mb-4">
            <button
              onClick={() => setScannerMode("qr")}
              className={`flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                scannerMode === "qr"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">QR Scanner</span>
                <span className="sm:hidden">QR</span>
              </div>
            </button>

            <button
              onClick={() => setScannerMode("manual")}
              className={`flex-1 py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
                scannerMode === "manual"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <User className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Manual Search</span>
                <span className="sm:hidden">Search</span>
              </div>
            </button>
          </div>

          {/* QR Scanner Tab */}
          {scannerMode === "qr" && (
            <div className="space-y-4">
              <div className="w-full">
                <div
                  id="qr-reader-requests"
                  ref={qrScannerRef}
                  className="w-full relative"
                  style={{
                    border: "2px solid #e5e7eb",
                    borderRadius: "12px",
                    overflow: "hidden",
                    minHeight: "200px",
                    maxHeight: "300px",
                  }}
                >
                  {/* QR Scanner will render here with built-in white square highlight */}
                </div>

                {qrScannerLoading && (
                  <div className="text-center py-4">
                    <LoadingSpinner 
                      message="Initializing camera..." 
                      variant="default"
                      size="sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Initializing camera... Please ensure camera permissions are granted.
                    </p>
                  </div>
                )}

              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  📱 Point camera at QR code with resident information
                </p>
                {isMobileDevice && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      💡 If camera doesn't work, refresh page or ensure HTTPS
                    </p>
                  </div>
                )}
              </div>

              {/* Camera Switch Button */}
              {isRealMobileDevice && availableCameras.length > 1 && (
                <div className="text-center">
                  <Button
                    onClick={switchCamera}
                    variant="outline"
                    size="sm"
                    disabled={cameraSwitchLoading}
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {cameraSwitchLoading ? (
                      "Switching..."
                    ) : (
                      `Switch to ${currentCamera === "environment" ? "front" : "back"} camera`
                    )}
                  </Button>
                </div>
              )}





              {searchLoading && (
                <div className="text-center py-4">
                  <LoadingSpinner 
                    message="Processing QR code..." 
                    variant="default"
                    size="sm"
                  />
                </div>
              )}

              {searchError && (
                <div className="text-center py-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <X className="w-5 h-5 text-red-500" />
                      <span className="font-medium text-red-800">Error</span>
                    </div>
                    <p className="text-sm text-red-700 mb-3">{searchError}</p>
                    {searchError.includes("Barangay Mismatch") && (
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
                  </div>
                </div>
              )}

              <Button
                onClick={stopQRScanner}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Stop Scanner
              </Button>
            </div>
          )}

          {/* Manual Search Tab */}
          {scannerMode === "manual" && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Enter the resident ID manually if QR scanning is not available
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  placeholder="Enter resident ID (e.g., RES-001)"
                  className="w-full text-xs sm:text-sm"
                  value={manualResidentId}
                  onChange={(e) => setManualResidentId(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSearch();
                    }
                  }}
                />

                <Button
                  onClick={handleManualSearch}
                  className="w-full text-xs sm:text-sm"
                  disabled={searchLoading || !manualResidentId.trim()}
                >
                  {searchLoading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner 
                        message="Searching..." 
                        variant="default"
                        size="sm"
                      />
                    </div>
                  ) : (
                    <>
                      <Search className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      <span className="hidden sm:inline">Search Resident</span>
                      <span className="sm:hidden">Search</span>
                    </>
                  )}
                </Button>
              </div>

              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-red-800">Error</span>
                  </div>
                  <p className="text-sm text-red-700">{searchError}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Certificate Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              Certificate Request Form
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Please review the resident information and fill out the
              certificate request details below.
            </p>
          </DialogHeader>

          {scannedResident && (
            <form className="space-y-6 py-4">
              {/* Resident Information Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {scannedResident.full_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Resident ID: {scannedResident.resident_id}
                    </p>
                    <p className="text-sm text-gray-600">
                      Barangay: {scannedResident.barangay}
                    </p>
                  </div>
                </div>
              </div>

              {/* Certificate Request Form Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <FileText className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-lg text-gray-900">
                    Certificate Request Details
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="reviewCertificateType"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Type of Certificate *
                    </Label>
                    <select
                      id="reviewCertificateType"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      required
                      value={reviewFormData.certificateType}
                      onChange={(e) =>
                        handleReviewFormChange(
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
                      htmlFor="reviewUrgency"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Processing Urgency
                    </Label>
                    <select
                      id="reviewUrgency"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                      value={reviewFormData.urgency}
                      onChange={(e) =>
                        handleReviewFormChange("urgency", e.target.value)
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
                    htmlFor="reviewPurpose"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Purpose of Certificate *
                  </Label>
                  <Textarea
                    id="reviewPurpose"
                    placeholder="Please state the specific purpose for requesting this certificate (e.g., employment, business permit, scholarship application, etc.)"
                    className="min-h-[120px] px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
                    required
                    value={reviewFormData.purpose}
                    onChange={(e) =>
                      handleReviewFormChange("purpose", e.target.value)
                    }
                  />
                  <p className="text-xs text-gray-500">
                    Be specific about why you need this certificate to help
                    expedite processing.
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowReviewDialog(false);
                    setReviewFormData({
                      certificateType: "",
                      urgency: "normal",
                      purpose: "",
                      comments: "",
                    });
                  }}
                  className="flex-1 h-12"
                >
                  Cancel Request
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitReview}
                  className="flex-1 h-12 bg-primary hover:bg-primary/90"
                  disabled={
                    !reviewFormData.certificateType ||
                    !reviewFormData.purpose ||
                    isSubmittingReview
                  }
                >
                  {isSubmittingReview ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner 
                        message="Submitting..." 
                        variant="default"
                        size="sm"
                      />
                    </div>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Submit Certificate Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestsPage;
