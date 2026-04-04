import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Printer,
  X,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Building,
  Users,
  Home,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { formatDateLong, getAge, formatLabel } from "./utils";
import { toast } from "@/hooks/use-toast";
import api from "@/utils/api";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import logger from "@/utils/logger";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
const ESERVICE_SERVER_URL = import.meta.env.VITE_ESERVICE_SERVER_URL || "http://localhost:3000";

// PVC Card dimensions (CR80 standard)
const CARD_WIDTH_MM = 54;
const CARD_HEIGHT_MM = 85.6;

// Convert mm to pixels for screen display (96 DPI)
const MM_TO_PX = 96 / 25.4; // 96 DPI / 25.4 mm per inch
const CARD_WIDTH_PX = CARD_WIDTH_MM * MM_TO_PX;
const CARD_HEIGHT_PX = CARD_HEIGHT_MM * MM_TO_PX;

// For high-quality rendering, we'll use a larger scale
const RENDER_SCALE = 2;
const CARD_WIDTH_PX_RENDER = CARD_WIDTH_PX * RENDER_SCALE;
const CARD_HEIGHT_PX_RENDER = CARD_HEIGHT_PX * RENDER_SCALE;

// Function to determine the best emergency contact
const determineEmergencyContact = (householdInfo, currentResidentId) => {
  if (!householdInfo) {
    return {
      name: "N/A",
      contact: "N/A",
    };
  }

  // If the current resident is the house head, we need to find someone else
  const isCurrentResidentHouseHead =
    householdInfo.house_head_id === currentResidentId;

  // Collect all household members with their details
  const allMembers = [];

  // Add house head if not the current resident
  if (!isCurrentResidentHouseHead && householdInfo.house_head_id) {
    allMembers.push({
      id: householdInfo.house_head_id,
      name: householdInfo.house_head,
      contact: householdInfo.house_head_contact_number,
      role: "house_head",
      hasContact: !!householdInfo.house_head_contact_number,
    });
  }

  // Add family heads and members if families data exists
  if (householdInfo.families && Array.isArray(householdInfo.families)) {
    householdInfo.families.forEach((family) => {
      if (
        family.family_head_id &&
        family.family_head_id !== currentResidentId
      ) {
        allMembers.push({
          id: family.family_head_id,
          name: family.family_head,
          contact: null, // We don't have contact info for family heads in current data
          role: "family_head",
          hasContact: false,
        });
      }

      if (family.members && Array.isArray(family.members)) {
        family.members.forEach((member) => {
          if (
            member.fm_member_id &&
            member.fm_member_id !== currentResidentId
          ) {
            allMembers.push({
              id: member.fm_member_id,
              name: member.fm_member,
              contact: null,
              role: "family_member",
              relationship: member.fm_relationship_to_fm_head,
              hasContact: false,
            });
          }
        });
      }
    });
  }

  // Smart priority order for emergency contact selection:
  // 1. House head (if not current resident) with contact number
  // 2. Family head with contact number
  // 3. House head without contact number
  // 4. Family head without contact number
  // 5. Any family member (prefer adults/older members)
  // 6. Fallback to house head even if it's the current resident

  // First, try to find someone with a contact number
  const membersWithContact = allMembers.filter((member) => member.hasContact);
  if (membersWithContact.length > 0) {
    // Prefer house head with contact
    const houseHeadWithContact = membersWithContact.find(
      (m) => m.role === "house_head"
    );
    if (houseHeadWithContact) {
      const result = {
        name: houseHeadWithContact.name,
        contact: houseHeadWithContact.contact,
      };
      return result;
    }

    // Then family head with contact
    const familyHeadWithContact = membersWithContact.find(
      (m) => m.role === "family_head"
    );
    if (familyHeadWithContact) {
      return {
        name: familyHeadWithContact.name,
        contact: familyHeadWithContact.contact,
      };
    }

    // Any member with contact
    return {
      name: membersWithContact[0].name,
      contact: membersWithContact[0].contact,
    };
  }

  // If no one has contact number, prefer house head
  const houseHead = allMembers.find((m) => m.role === "house_head");
  if (houseHead) {
    return {
      name: houseHead.name,
      contact: "N/A",
    };
  }

  // Then family head
  const familyHead = allMembers.find((m) => m.role === "family_head");
  if (familyHead) {
    return {
      name: familyHead.name,
      contact: "N/A",
    };
  }

  // Finally, any family member
  if (allMembers.length > 0) {
    return {
      name: allMembers[0].name,
      contact: "N/A",
    };
  }

  // Fallback to house head even if it's the current resident
  const fallbackResult = {
    name: householdInfo.house_head || "N/A",
    contact: householdInfo.house_head_contact_number || "N/A",
  };

  return fallbackResult;
};

const ResidentIDCard = ({
  idTabLoading,
  idTabError,
  barangayData,
  municipalityData,
  qrCodeUrl,
  punongBarangay,
  punongBarangayLoading,
  viewResident,
  handlePrint,
  handleDownloadImage,
  handleDownloadPDF,
  printLoading,
  downloadImageLoading,
  downloadPDFLoading,
  householdInfo,
}) => {
  // Build an absolute URL for any stored path.
  // Handles both BIMS-relative paths ("uploads/...") and absolute URLs
  // ("http://...") — the latter come from eService-uploaded photos.
  const toAbsUrl = (p) => {
    if (!p) return null;
    if (p.startsWith("http://") || p.startsWith("https://")) return p;
    const clean = p.startsWith("/") ? p.slice(1) : p.replace(/\\/g, "/");
    // Files under uploads/images/ were uploaded via eService and live on port 3000
    if (clean.startsWith("uploads/images/")) return `${ESERVICE_SERVER_URL}/${clean}`;
    return `${SERVER_URL}/${clean}`;
  };

  const municipalityBgImgFront = toAbsUrl(municipalityData?.id_background_front_path);
  const municipalityBgImgBack  = toAbsUrl(municipalityData?.id_background_back_path);

  if (idTabLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></span>
      </div>
    );
  }
  if (idTabError) {
    return (
      <div className="text-center text-destructive py-8">{idTabError}</div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (max-width: 768px) {
            .id-card-container {
              width: ${CARD_WIDTH_PX * 2 + 32}px !important;
              min-width: ${CARD_WIDTH_PX * 2 + 32}px !important;
              overflow-x: auto !important;
              overflow-y: auto !important;
            }
            .id-card-front, .id-card-back {
              flex-shrink: 0 !important;
              min-height: ${CARD_HEIGHT_PX}px !important;
              max-height: ${CARD_HEIGHT_PX}px !important;
            }
          }
        `
      }} />

      <div
        id="resident-id-printable"
        className="id-card-container flex flex-col md:flex-row gap-8 p-4 rounded-lg w-full max-w-4xl mx-auto items-center justify-center overflow-auto"
        style={{
          width: `${CARD_WIDTH_PX * 2 + 32}px`, // 2 cards + gap
          minHeight: `${CARD_HEIGHT_PX}px`,
          minWidth: `${CARD_WIDTH_PX * 2 + 32}px`,
        }}
      >
        {/* FRONT */}
        <div
          className="id-card-front relative flex flex-col items-center justify-between rounded-lg shadow border border-primary p-4 overflow-hidden bg-transparent"
          style={{
            width: `${CARD_WIDTH_PX}px`,
            height: `${CARD_HEIGHT_PX}px`,
            minWidth: `${CARD_WIDTH_PX}px`,
            maxWidth: `${CARD_WIDTH_PX}px`,
            minHeight: `${CARD_HEIGHT_PX}px`,
            maxHeight: `${CARD_HEIGHT_PX}px`,
            flexShrink: 0,
            imageRendering: 'crisp-edges',
            WebkitImageRendering: 'crisp-edges',
            MozImageRendering: 'crisp-edges',
          }}
        >
          {/* Municipality background image, behind all content */}
          {municipalityBgImgFront && (
            <img
              src={municipalityBgImgFront}
              alt="Municipality Background"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              style={{
                zIndex: 0,
                opacity: 0.25,
                filter: 'blur(4px)',
                transform: 'scale(1.05)',
                imageRendering: 'crisp-edges',
                WebkitImageRendering: 'crisp-edges',
                MozImageRendering: 'crisp-edges',
              }}
              aria-hidden="true"
              onError={(e) => {
                console.error(
                  "Failed to load municipality background front image:",
                  municipalityBgImgFront
                );
                e.target.style.display = "none";
              }}
            />
          )}
          <div className="relative z-10 flex w-full justify-between items-center mb-2">
            <img
              src={toAbsUrl(municipalityData?.municipality_logo_path) || ""}
              alt="Municipality Logo"
              className="h-8 w-8 object-contain rounded-full"
              style={{
                imageRendering: 'crisp-edges',
                WebkitImageRendering: 'crisp-edges',
                MozImageRendering: 'crisp-edges',
              }}
              onError={(e) => {
                console.error(
                  "Failed to load municipality logo:",
                  municipalityData?.municipality_logo_path
                );
                e.target.style.display = "none";
              }}
            />
            <div className="text-center flex-1">
              <div className="font-bold text-[10px] tracking-widest text-primary">
                {barangayData?.barangay_name?.toUpperCase() || ""}
              </div>
              <p className="text-[10px] font-semibold text-muted-foreground">
                {municipalityData?.municipality_name?.toUpperCase() || ""}
              </p>
            </div>
            <img
              src={toAbsUrl(barangayData?.barangay_logo_path) || ""}
              alt="Barangay Logo"
              className="h-8 w-8 object-contain rounded-full"
              style={{
                imageRendering: 'crisp-edges',
                WebkitImageRendering: 'crisp-edges',
                MozImageRendering: 'crisp-edges',
              }}
            />
          </div>
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
            <div className="font-bold text-[10px] tracking-widest text-black mb-2">
              BARANGAY ID
            </div>
            <div className="w-16 h-16 rounded-md overflow-hidden border-2 border-primary bg-white ">
              {viewResident.picture_path ? (
                <img
                  src={toAbsUrl(viewResident.picture_path) || ""}
                  alt="Resident"
                  className="w-full h-full object-cover"
                  style={{
                    imageRendering: 'crisp-edges',
                    WebkitImageRendering: 'crisp-edges',
                    MozImageRendering: 'crisp-edges',
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                  No Image
                </div>
              )}
            </div>
            <div className="text-[12px] font-bold underline mt-2 text-center">
              {`${formatLabel(viewResident.first_name)} ${
                viewResident.middle_name
                  ? formatLabel(viewResident.middle_name).charAt(0) + "."
                  : ""
              } ${formatLabel(viewResident.last_name)}${
                viewResident.suffix ? ` ${viewResident.suffix}` : ""
              }`.toUpperCase()}
            </div>
            <div className="text-[10px] font-semibold text-center mb-2">
              {viewResident.resident_id}
            </div>
            <div className="font-bold text-[10px] underline mb-1 w-full">
              PERSONAL INFORMATION
            </div>
            <div className="text-[10px] flex flex-col w-full">
              <div className="flex gap-1">
                <span>CIVIL STATUS:</span>
                <span className="font-semibold">
                  {formatLabel(viewResident.civil_status).toUpperCase()}
                </span>
              </div>
              <div className="flex gap-1">
                <span>SEX:</span>
                <span className="font-semibold">
                  {formatLabel(viewResident.sex).toUpperCase()}
                </span>
              </div>
              <div className="flex gap-1">
                <span>BIRTH DATE:</span>
                <span className="font-semibold">
                  {formatDateLong(viewResident.birthdate).toUpperCase()}
                </span>
              </div>
              <div className="flex gap-1">
                <span>AGE:</span>
                <span className="font-semibold">
                  {getAge(viewResident.birthdate)}
                </span>
              </div>
              <div className="flex gap-1">
                <span>ADDRESS:</span>
                <span className="font-semibold">
                  {[
                    viewResident.house_number,
                    viewResident.household_street,
                    barangayData?.barangay_name,
                    municipalityData?.municipality_name,
                  ]
                    .filter(Boolean)
                    .map((s) => s.toUpperCase())
                    .join(", ")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          className="id-card-back relative flex flex-col justify-between rounded-lg shadow border border-primary p-4 overflow-hidden bg-transparent"
          style={{
            width: `${CARD_WIDTH_PX}px`,
            height: `${CARD_HEIGHT_PX}px`,
            minWidth: `${CARD_WIDTH_PX}px`,
            maxWidth: `${CARD_WIDTH_PX}px`,
            minHeight: `${CARD_HEIGHT_PX}px`,
            maxHeight: `${CARD_HEIGHT_PX}px`,
            flexShrink: 0,
            imageRendering: 'crisp-edges',
            WebkitImageRendering: 'crisp-edges',
            MozImageRendering: 'crisp-edges',
          }}
        >
          {/* Municipality background image, behind all content */}
          {municipalityBgImgBack && (
            <img
              src={municipalityBgImgBack}
              alt="Municipality Background"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              style={{
                zIndex: 0,
                opacity: 0.25,
                filter: 'blur(4px)',
                transform: 'scale(1.05)',
                imageRendering: 'crisp-edges',
                WebkitImageRendering: 'crisp-edges',
                MozImageRendering: 'crisp-edges',
              }}
              aria-hidden="true"
            />
          )}
          <div className="font-bold italic text-[8px] mb-1 text-center">
            NOTIFY INCASE OF EMERGENCY:
          </div>
          <div className="relative z-10 border-1 border-primary rounded-lg p-1 mb-2">
            <div className="text-[8px]">
              Name:{" "}
              <span className="font-semibold">
                {(() => {
                  const contactName = determineEmergencyContact(
                    householdInfo,
                    viewResident.resident_id
                  ).name;
                  if (!contactName || contactName === "N/A") return "N/A";

                  const nameParts = contactName.split(" ");
                  if (nameParts.length >= 3) {
                    return `${nameParts[0]} ${nameParts[1].charAt(
                      0
                    )}. ${nameParts.slice(2).join(" ")}`.toUpperCase();
                  } else if (nameParts.length === 2) {
                    return `${nameParts[0]} ${nameParts[1].charAt(
                      0
                    )}.`.toUpperCase();
                  } else {
                    return contactName.toUpperCase();
                  }
                })()}
              </span>
            </div>
            <div className="text-[8px]">
              Contact No.:{" "}
              <span className="font-semibold">
                {
                  determineEmergencyContact(
                    householdInfo,
                    viewResident.resident_id
                  ).contact
                }
              </span>
            </div>
          </div>
          <div className="relative z-10 text-[8px] font-semibold text-center mb-2">
            LGU-{municipalityData?.municipality_name?.toUpperCase() || ""}
          </div>
          <div className="relative z-10 text-[8px] text-center mb-2">
            THIS IS TO CERTIFY THE BEARER OF THIS CARD WHOSE PICTURE AND
            SIGNATURE APPEAR HEREIN IS A RESIDENT OF BARANGAY{" "}
            {barangayData?.barangay_name?.toUpperCase() || ""},{" "}
            {municipalityData?.municipality_name?.toUpperCase() || ""}
          </div>
          <div className="relative z-10 flex flex-col items-center justify-center mb-2">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="w-16 h-16"
                style={{
                  imageRendering: 'crisp-edges',
                  WebkitImageRendering: 'crisp-edges',
                  MozImageRendering: 'crisp-edges',
                }}
              />
            )}
          </div>
          <div className="relative z-10 text-[8px] text-center mb-2 font-semibold">
            THIS ID IS NON-TRANSFERRABLE
          </div>
          <div className="relative z-10 text-[8px] text-center mb-2 font-semibold">
            IN CASE OF LOSS PLEASE RETURN TO BARANGAY
          </div>
          <div className="relative z-10 mt-auto flex flex-col items-center">
            <div className="font-bold underline text-[8px]">
              {punongBarangayLoading ? (
                <LoadingSpinner
                  message="Loading..."
                  variant="default"
                  size="sm"
                  compact={true}
                />
              ) : punongBarangay ? (
                `${formatLabel(punongBarangay.first_name)} ${
                  punongBarangay.middle_name
                    ? formatLabel(punongBarangay.middle_name)
                    : ""
                } ${formatLabel(punongBarangay.last_name)}`.toUpperCase()
              ) : (
                "HON. [PUNONG BARANGAY]"
              )}
            </div>
            <div className="text-[8px] font-semibold">PUNONG BARANGAY</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentIDCard;
