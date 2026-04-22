import React, { useState } from "react";
import { formatDateLong, getAge, formatLabel } from "./utils";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import lguLogo from "@/assets/images/borongan-city-seal.png";
import cityHallBg from "@/assets/city-hall-borongan.jpg";
import { User as UserIcon, Users, CalendarDays, IdCard, MapPin, ShieldCheck, Building2, HeartHandshake, Lock } from "lucide-react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";
const ESERVICE_SERVER_URL = import.meta.env.VITE_ESERVICE_SERVER_URL || "http://localhost:3000";

// CR80 landscape — 85.6 mm × 54 mm
const CARD_W = 380;
const CARD_H = 240;
const PANEL_W = 115; // slightly wider for wave

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

// ── FRONT LEFT PANEL ─────────────────────────────────────────────────────
const FrontLeftPanel = () => (
  <div style={{
    width: PANEL_W, flexShrink: 0,
    background: "linear-gradient(160deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "14px 8px 10px", gap: 0, position: "relative",
    zIndex: 1
  }}>
    {/* City seal */}
    <div style={{
      width: 56, height: 56, borderRadius: "50%", padding: 4,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.25)", marginBottom: 8, flexShrink: 0,
      backgroundColor: "#fff", position: "relative", zIndex: 2
    }}>
      <img
        src={lguLogo}
        alt="City of Borongan"
        style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }}
      />
    </div>

    <div style={{ color: "#eab308", fontSize: 6.5, fontWeight: 800, letterSpacing: 0.8, textAlign: "center", lineHeight: 1.2, position: "relative", zIndex: 2 }}>
      CITY OF
    </div>
    <div style={{ color: "white", fontSize: 10, fontWeight: 900, letterSpacing: 0.8, textAlign: "center", lineHeight: 1.2, marginBottom: 4, position: "relative", zIndex: 2 }}>
      BORONGAN
    </div>

    <div style={{ color: "#eab308", fontSize: 5.5, textAlign: "center", letterSpacing: 0.5, position: "relative", zIndex: 2 }}>
      EASTERN SAMAR
    </div>

    {/* SVG Wave Border */}
    <svg style={{ position: "absolute", right: -1, top: 0, height: "100%", width: 24, zIndex: 2 }} viewBox="0 0 24 240" preserveAspectRatio="none">
      <path d="M0,0 Q24,60 12,120 T24,240 L0,240 Z" fill="#1d4ed8" />
      <path d="M0,0 Q24,60 12,120 T24,240" fill="none" stroke="#eab308" strokeWidth="2.5" />
    </svg>
  </div>
);

// ── BACK LEFT PANEL ──────────────────────────────────────────────────────
const BackLeftPanel = () => (
  <div style={{
    width: 90, flexShrink: 0,
    backgroundColor: "#1e3a8a",
    display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center",
    padding: "20px 10px", gap: 14, position: "relative",
    zIndex: 1
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "white" }}>
      <ShieldCheck size={14} />
      <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5 }}>SAFE</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "white" }}>
      <Users size={14} />
      <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5 }}>CONNECTED</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "white" }}>
      <Building2 size={14} />
      <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5 }}>EMPOWERED</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "white" }}>
      <HeartHandshake size={14} />
      <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5, lineHeight: 1.2 }}>SERVING<br/>WITH HEART</span>
    </div>
  </div>
);

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

  const photo = toAbsUrl(viewResident?.picture_path);

  const fullName = [
    viewResident?.first_name ? formatLabel(viewResident.first_name) : "",
    viewResident?.middle_name ? formatLabel(viewResident.middle_name).charAt(0) + "." : "",
    viewResident?.last_name ? formatLabel(viewResident.last_name) : "",
    viewResident?.suffix || "",
  ].filter(Boolean).join(" ").toUpperCase();

  const titleCaseName = fullName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

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
            <FrontLeftPanel />

            {/* Right panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 14px 10px 24px", position: "relative", backgroundColor: "#f8fafc" }}>
              
              {/* Blue Tint Gradient Overlay */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(29,78,216,0.06) 0%, rgba(30,64,175,0.08) 50%, rgba(37,99,235,0.05) 100%)", zIndex: 0 }} />


              {/* Header */}
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2.5px solid #1d4ed8", paddingBottom: 4, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 6.5, color: "#4b5563", letterSpacing: 1.5, textTransform: "uppercase" }}>
                    Republic of the Philippines
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.5, color: "#1e3a8a", lineHeight: 1.1 }}>
                    BORONGAN ID
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: -2.5, right: 0, height: 2.5, width: 40, backgroundColor: "#eab308" }} />
              </div>

              {/* Body */}
              <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 12, flex: 1 }}>
                {/* Photo */}
                <div style={{
                  width: 70, height: 88, flexShrink: 0, borderRadius: 6, overflow: "hidden",
                  border: "2px solid #1d4ed8", backgroundColor: "#e5e7eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {photo
                    ? <img src={photo} alt="Resident" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <PersonIcon />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 11, color: "#111827", letterSpacing: 0.3, lineHeight: 1.2 }}>
                    {fullName || "N/A"}
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#1d4ed8", fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
                    ID No. {viewResident?.resident_id || "—"}
                  </div>

                  {/* 2-col personal info grid with icons */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <UserIcon size={11} color="#1d4ed8" />
                      <div>
                        <div style={{ fontSize: 5, color: "#6b7280", letterSpacing: 0.5 }}>SEX</div>
                        <div style={{ fontSize: 7.5, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{formatLabel(viewResident?.sex || "")}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Users size={11} color="#1d4ed8" />
                      <div>
                        <div style={{ fontSize: 5, color: "#6b7280", letterSpacing: 0.5 }}>CIVIL STATUS</div>
                        <div style={{ fontSize: 7.5, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{formatLabel(viewResident?.civil_status || "")}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <CalendarDays size={11} color="#1d4ed8" />
                      <div>
                        <div style={{ fontSize: 5, color: "#6b7280", letterSpacing: 0.5 }}>DATE OF BIRTH</div>
                        <div style={{ fontSize: 7.5, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{formatDateLong(viewResident?.birthdate)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <IdCard size={11} color="#1d4ed8" />
                      <div>
                        <div style={{ fontSize: 5, color: "#6b7280", letterSpacing: 0.5 }}>AGE</div>
                        <div style={{ fontSize: 7.5, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{getAge(viewResident?.birthdate)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginTop: 4 }}>
                    <MapPin size={11} color="#1d4ed8" style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 5, color: "#6b7280", letterSpacing: 0.5 }}>ADDRESS</div>
                      <div style={{ fontSize: 7.5, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
                        {address || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Block */}
              <div style={{ position: "absolute", bottom: 12, right: 14, textAlign: "center", zIndex: 1 }}>
                <div style={{ fontFamily: 'cursive, "Brush Script MT", "Dancing Script", sans-serif', fontSize: 13, color: "#111827", marginBottom: -2, whiteSpace: "nowrap" }}>
                  {titleCaseName}
                </div>
                <div style={{ width: 90, borderTop: "1px solid #374151", margin: "0 auto", marginBottom: 2 }} />
                <div style={{ fontSize: 5, color: "#4b5563", fontWeight: 600, letterSpacing: 0.5 }}>
                  CARDHOLDER'S SIGNATURE
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════ BACK ═══════════════════════════════════════════ */}
          <div className="id-card-back" style={{ ...shellStyle, transform: "rotateY(180deg)" }}>
            <BackLeftPanel />

              {/* Right panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", backgroundColor: "#f8fafc" }}>
              
              {/* Blue Tint Gradient Overlay */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(29,78,216,0.06) 0%, rgba(30,64,175,0.08) 50%, rgba(37,99,235,0.05) 100%)", zIndex: 0 }} />

              <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 10, zIndex: 1 }}>
                {/* Emergency contact */}
                <div>
                  <div style={{ fontSize: 7, fontWeight: 700, color: "#1e3a8a", letterSpacing: 0.8, marginBottom: 4 }}>
                    IN CASE OF EMERGENCY, NOTIFY:
                  </div>
                  <div style={{ border: "1px solid #93c5fd", borderRadius: 6, padding: "6px 10px", backgroundColor: "#eff6ff", width: "75%" }}>
                    <div style={{ fontSize: 8.5, color: "#111827" }}>
                      Name: <span style={{ fontWeight: 800 }}>{emergency.name?.toUpperCase() || "N/A"}</span>
                    </div>
                    <div style={{ fontSize: 8.5, color: "#111827", marginTop: 2 }}>
                      Contact: <span style={{ fontWeight: 800 }}>{emergency.contact || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* QR + certification */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ padding: 4, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: 6, flexShrink: 0 }}>
                    {qrCodeUrl && (
                      <img src={qrCodeUrl} alt="QR Code" style={{ width: 50, height: 50, imageRendering: "crisp-edges" }} />
                    )}
                  </div>
                  <div style={{ fontSize: 6.5, color: "#4b5563", lineHeight: 1.5, textAlign: "justify", paddingRight: 40 }}>
                    This certifies that the bearer is a bonafide resident of Barangay{" "}
                    <strong style={{ color: "#1e3a8a" }}>{barangayData?.barangay_name?.toUpperCase()}</strong>,{" "}
                    <strong style={{ color: "#1e3a8a" }}>BORONGAN CITY</strong>, Eastern Samar, Philippines.
                  </div>
                </div>
              </div>

              {/* Bottom Gray Bar */}
              <div style={{ backgroundColor: "#e2e8f0", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ backgroundColor: "#1d4ed8", borderRadius: "50%", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Lock size={10} color="white" />
                  </div>
                  <div style={{ fontSize: 5.5, color: "#4b5563", fontWeight: 700, lineHeight: 1.3 }}>
                    THIS ID IS NON-TRANSFERABLE.<br />
                    IF FOUND, PLEASE RETURN TO THE CITY HALL.
                  </div>
                </div>

                {/* Mayor signature block */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 7.5, fontWeight: 800, color: "#111827", letterSpacing: 0.3 }}>
                    HON. JOSE IVAN DAYAN AGDA
                  </div>
                  <div style={{ fontSize: 6, color: "#4b5563", fontWeight: 600 }}>
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

