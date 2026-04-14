import React, { useState } from "react";
import { formatDateLong, getAge, formatLabel } from "./utils";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import lguLogo from "@/assets/images/borongan-city-seal.png";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";
const ESERVICE_SERVER_URL = import.meta.env.VITE_ESERVICE_SERVER_URL || "http://localhost:3000";

// CR80 landscape — 85.6 mm × 54 mm
const CARD_W = 380;
const CARD_H = 240;
const PANEL_W = 108;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const toAbsUrl = (p) => {
  if (!p) return null;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const clean = p.startsWith("/") ? p.slice(1) : p.replace(/\\/g, "/");
  if (clean.startsWith("uploads/images/")) return `${ESERVICE_SERVER_URL}/${clean}`;
  return `${SERVER_URL}/${clean}`;
};

const determineEmergencyContact = (householdInfo, currentResidentId) => {
  if (!householdInfo) return { name: "N/A", contact: "N/A" };

  const isCurrentHouseHead = householdInfo.house_head_id === currentResidentId;
  const allMembers = [];

  if (!isCurrentHouseHead && householdInfo.house_head_id) {
    allMembers.push({
      name: householdInfo.house_head,
      contact: householdInfo.house_head_contact_number,
      role: "house_head",
      hasContact: !!householdInfo.house_head_contact_number,
    });
  }

  if (householdInfo.families && Array.isArray(householdInfo.families)) {
    householdInfo.families.forEach((family) => {
      if (family.family_head_id && family.family_head_id !== currentResidentId) {
        allMembers.push({ name: family.family_head, contact: null, role: "family_head", hasContact: false });
      }
      if (family.members && Array.isArray(family.members)) {
        family.members.forEach((member) => {
          if (member.fm_member_id && member.fm_member_id !== currentResidentId) {
            allMembers.push({ name: member.fm_member, contact: null, role: "family_member", hasContact: false });
          }
        });
      }
    });
  }

  const withContact = allMembers.filter((m) => m.hasContact);
  if (withContact.length > 0) {
    const hh = withContact.find((m) => m.role === "house_head");
    if (hh) return { name: hh.name, contact: hh.contact };
    return { name: withContact[0].name, contact: withContact[0].contact };
  }

  const houseHead = allMembers.find((m) => m.role === "house_head");
  if (houseHead) return { name: houseHead.name, contact: "N/A" };
  if (allMembers.length > 0) return { name: allMembers[0].name, contact: "N/A" };
  return { name: householdInfo.house_head || "N/A", contact: householdInfo.house_head_contact_number || "N/A" };
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} style={{ width: 36, height: 36 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Unified "City of Borongan" left panel — same as program portal

const LeftPanel = ({ bgImg }) => {
  const watermark = {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "cover", opacity: 0.12, filter: "blur(2px)",
    transform: "scale(1.05)", zIndex: 0, pointerEvents: "none",
  };

  return (
    <div style={{
      width: PANEL_W, flexShrink: 0,
      background: "linear-gradient(160deg, #1e40af 0%, #1d4ed8 60%, #2563eb 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "14px 8px 10px", gap: 0, position: "relative",
    }}>
      {bgImg && <img src={bgImg} alt="" aria-hidden style={watermark} />}

      {/* City seal */}
      <div style={{
        width: 56, height: 56, borderRadius: "50%", padding: 4,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)", marginBottom: 8, flexShrink: 0,
        position: "relative", zIndex: 1,
      }}>
        <img
          src={lguLogo}
          alt="City of Borongan"
          style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }}
        />
      </div>

      <div style={{ color: "white", fontSize: 7.5, fontWeight: 800, letterSpacing: 0.8, textAlign: "center", lineHeight: 1.2, position: "relative", zIndex: 1 }}>
        CITY OF
      </div>
      <div style={{ color: "white", fontSize: 9, fontWeight: 800, letterSpacing: 0.8, textAlign: "center", lineHeight: 1.2, marginBottom: 4, position: "relative", zIndex: 1 }}>
        BORONGAN
      </div>

      <div style={{ width: "55%", height: 1, backgroundColor: "rgba(255,255,255,0.35)", margin: "6px 0", position: "relative", zIndex: 1 }} />

      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 6.5, textAlign: "center", letterSpacing: 0.5, position: "relative", zIndex: 1 }}>
        EASTERN SAMAR
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const ResidentIDCard = ({
  idTabLoading,
  idTabError,
  barangayData,
  municipalityData,
  qrCodeUrl,
  viewResident,
  handlePrint,
  handleDownloadImage,
  handleDownloadPDF,
  printLoading,
  downloadImageLoading,
  downloadPDFLoading,
  householdInfo,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  if (idTabLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  if (idTabError) {
    return <div className="text-center text-destructive py-8">{idTabError}</div>;
  }

  const bgFront = toAbsUrl(municipalityData?.id_background_front_path);
  const bgBack  = toAbsUrl(municipalityData?.id_background_back_path);
  const photo   = toAbsUrl(viewResident?.picture_path);

  const fullName = [
    viewResident?.first_name ? formatLabel(viewResident.first_name) : "",
    viewResident?.middle_name ? formatLabel(viewResident.middle_name).charAt(0) + "." : "",
    viewResident?.last_name ? formatLabel(viewResident.last_name) : "",
    viewResident?.suffix || "",
  ].filter(Boolean).join(" ").toUpperCase();

  const address = [
    viewResident?.house_number,
    viewResident?.household_street,
    barangayData?.barangay_name ? `Brgy. ${barangayData.barangay_name}` : null,
    municipalityData?.municipality_name,
  ].filter(Boolean).join(", ").toUpperCase();

  const emergency = determineEmergencyContact(householdInfo, viewResident?.resident_id);

  // ── shared shell style ───────────────────────────────────────────────────
  const shellStyle = {
    position: "absolute", inset: 0,
    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
    borderRadius: 10,
    boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
    overflow: "hidden",
    backgroundColor: "#fff",
    display: "flex",
    boxSizing: "border-box",
  };

  const watermarkStyle = {
    position: "absolute", inset: 0, width: "100%", height: "100%",
    objectFit: "cover", opacity: 0.18, filter: "blur(2px)",
    transform: "scale(1.05)", zIndex: 0, pointerEvents: "none",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Flip card */}
      <div
        id="resident-id-printable"
        style={{ width: CARD_W, height: CARD_H, cursor: "pointer", userSelect: "none" }}
        onClick={() => setIsFlipped((f) => !f)}
        title="Click to flip"
      >
        <div style={{
          position: "relative", width: "100%", height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}>

          {/* ══════════════ FRONT ══════════════════════════════════════════ */}
          <div className="id-card-front" style={shellStyle}>
            <LeftPanel bgImg={bgFront} />

            {/* Right panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 14px", position: "relative" }}>
              {bgFront && <img src={bgFront} alt="" aria-hidden style={watermarkStyle} />}

              {/* Header */}
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #1d4ed8", paddingBottom: 6, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 7, color: "#6b7280", letterSpacing: 1, textTransform: "uppercase" }}>
                    Republic of the Philippines
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: "#1d4ed8", lineHeight: 1 }}>
                    BORONGANON ID
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 12, flex: 1 }}>
                {/* Photo */}
                <div style={{
                  width: 70, height: 88, flexShrink: 0, borderRadius: 5, overflow: "hidden",
                  border: "2px solid #1d4ed8", backgroundColor: "#f3f4f6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {photo
                    ? <img src={photo} alt="Resident" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <PersonIcon />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 11, color: "#111827", letterSpacing: 0.3, lineHeight: 1.2 }}>
                    {fullName || "N/A"}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 9, color: "#1d4ed8", fontWeight: 700, letterSpacing: 0.5 }}>
                    ID No. {viewResident?.resident_id || "—"}
                  </div>

                  <div style={{ height: 1, backgroundColor: "#e5e7eb", margin: "2px 0" }} />

                  {/* Personal info grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 10px" }}>
                    {[
                      ["SEX", formatLabel(viewResident?.sex || "")],
                      ["CIVIL STATUS", formatLabel(viewResident?.civil_status || "")],
                      ["DATE OF BIRTH", formatDateLong(viewResident?.birthdate)],
                      ["AGE", getAge(viewResident?.birthdate)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: 6.5, color: "#6b7280", letterSpacing: 0.5 }}>{label}</div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: "#111827" }}>{value || "N/A"}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ height: 1, backgroundColor: "#f3f4f6", margin: "2px 0" }} />

                  {/* Address */}
                  <div>
                    <div style={{ fontSize: 6.5, color: "#6b7280", letterSpacing: 0.5 }}>ADDRESS</div>
                    <div style={{ fontSize: 8, fontWeight: 600, color: "#111827", lineHeight: 1.35 }}>
                      {address || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════ BACK ═══════════════════════════════════════════ */}
          <div className="id-card-back" style={{ ...shellStyle, transform: "rotateY(180deg)" }}>
            <LeftPanel bgImg={bgBack} />

            {/* Right panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 14px", position: "relative", justifyContent: "space-between" }}>
              {bgBack && <img src={bgBack} alt="" aria-hidden style={watermarkStyle} />}

              {/* Emergency contact */}
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: 7, fontWeight: 700, color: "#374151", letterSpacing: 0.8, marginBottom: 4 }}>
                  IN CASE OF EMERGENCY, NOTIFY:
                </div>
                <div style={{ border: "1px solid #93c5fd", borderRadius: 5, padding: "5px 8px", backgroundColor: "rgba(239,246,255,0.7)" }}>
                  <div style={{ fontSize: 8, color: "#374151" }}>
                    Name: <span style={{ fontWeight: 700 }}>{emergency.name?.toUpperCase() || "N/A"}</span>
                  </div>
                  <div style={{ fontSize: 8, color: "#374151", marginTop: 1 }}>
                    Contact: <span style={{ fontWeight: 700 }}>{emergency.contact || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* QR + certification */}
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" style={{ width: 72, height: 72, flexShrink: 0, imageRendering: "crisp-edges" }} />
                )}
                <div style={{ fontSize: 7, color: "#4b5563", lineHeight: 1.6, textAlign: "justify" }}>
                  This certifies that the bearer is a bonafide resident of Barangay{" "}
                  <strong>{barangayData?.barangay_name?.toUpperCase()}</strong>,{" "}
                  <strong>BORONGAN CITY</strong>, Eastern Samar, Philippines.
                  This ID is non-transferable.
                </div>
              </div>

              {/* Notice + Mayor signature */}
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div style={{ fontSize: 6.5, color: "#9ca3af", fontWeight: 600, lineHeight: 1.5 }}>
                  THIS ID IS NON-TRANSFERABLE.<br />
                  IF FOUND, PLEASE RETURN TO THE CITY HALL.
                </div>

                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <div style={{ width: 120, borderTop: "1.5px solid #374151", marginBottom: 3 }} />
                  <div style={{ fontSize: 8, fontWeight: 800, color: "#111827", letterSpacing: 0.3 }}>
                    HON. JOSE IVAN DAYAN AGDA
                  </div>
                  <div style={{ fontSize: 7, color: "#6b7280", fontWeight: 600 }}>
                    CITY MAYOR
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", userSelect: "none" }}>
        Click to flip
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownloadImage}
          disabled={downloadImageLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {downloadImageLoading ? (
            <span className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" />
            </svg>
          )}
          Download Image
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={downloadPDFLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {downloadPDFLoading ? (
            <span className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          Download PDF
        </button>

        {handlePrint && (
          <button
            onClick={handlePrint}
            disabled={printLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {printLoading ? (
              <span className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <polyline points="6 9 6 2 18 2 18 9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="6" y="14" width="12" height="8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            Print
          </button>
        )}
      </div>
    </div>
  );
};

export default ResidentIDCard;
