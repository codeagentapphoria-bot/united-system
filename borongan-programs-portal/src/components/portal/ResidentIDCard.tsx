import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '@/services/api/auth.service';
import type { User } from '@/types/auth';
import { User as UserIcon, Users, CalendarDays, IdCard, MapPin, ShieldCheck, Building2, HeartHandshake, Lock } from 'lucide-react';

// ---------------------------------------------------------------------------
// CR80 landscape — 85.6 mm × 54 mm scaled to 380 × 240 px
// ---------------------------------------------------------------------------
const CARD_W = 380;
const CARD_H = 240;
const PANEL_W = 115; // blue left panel slightly wider for wave

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/api$/, '');
const BIMS_ORIGIN = import.meta.env.VITE_BIMS_SERVER_URL || 'http://localhost:5000';

function toAbsUrl(p?: string | null): string | null {
  if (!p) return null;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const clean = p.startsWith('/') ? p.slice(1) : p.replace(/\\/g, '/');
  if (clean.startsWith('uploads/municipalities/') || clean.startsWith('uploads/barangays/')) {
    return `${BIMS_ORIGIN}/${clean}`;
  }
  return `${API_ORIGIN}/${clean}`;
}

function fmt(s?: string | null) {
  if (!s) return 'N/A';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatDate(d?: string | null) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getAge(d?: string | null): string {
  if (!d) return 'N/A';
  const today = new Date();
  const birth = new Date(d);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return String(age);
}

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} style={{ width: 36, height: 36 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface IdCardInfo {
  barangayName?: string;
  barangayLogoPath?: string | null;
  municipality?: {
    municipalityName?: string;
    municipalityLogoPath?: string | null;
    idBackgroundFrontPath?: string | null;
    idBackgroundBackPath?: string | null;
  } | null;
}

interface Props { resident: User }

// ---------------------------------------------------------------------------
// ResidentIDCard — horizontal CR80 flip card
// ---------------------------------------------------------------------------
export const ResidentIDCard: React.FC<Props> = ({ resident }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardInfo, setCardInfo] = useState<IdCardInfo>({});

  useEffect(() => {
    authService.getIdCardInfo().then(setCardInfo).catch(() => { });
  }, []);

  const r = resident as User & {
    extensionName?: string | null;
    sex?: string | null;
    civilStatus?: string | null;
    streetAddress?: string | null;
    emergencyContactPerson?: string | null;
    emergencyContactNumber?: string | null;
  };

  const barangayName = cardInfo.barangayName || r.barangay?.barangayName || r.barangay?.name || 'Borongan City';
  const municipalityName = cardInfo.municipality?.municipalityName || r.barangay?.municipality?.name || 'Borongan';

  const photo = toAbsUrl(r.picturePath);

  const fullName = [r.firstName, r.middleName ? r.middleName.charAt(0) + '.' : null, r.lastName, r.extensionName]
    .filter(Boolean).join(' ').toUpperCase();

  const titleCaseName = fullName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

  const address = [r.streetAddress, `Brgy. ${barangayName}`, municipalityName]
    .filter(Boolean).map(s => s!).join(', ');

  const qrValue = r.residentId || r.id;

  // ── shared card shell ────────────────────────────────────────────────────
  const shellStyle: React.CSSProperties = {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    borderRadius: 10,
    boxShadow: '0 6px 24px rgba(0,0,0,0.22)',
    overflow: 'hidden',
    backgroundColor: '#fff',
    display: 'flex',
    boxSizing: 'border-box',
  };

  // ── FRONT LEFT PANEL ─────────────────────────────────────────────────────
  const FrontLeftPanel = () => (
    <div style={{
      width: PANEL_W, flexShrink: 0,
      background: 'linear-gradient(160deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '14px 8px 10px', gap: 0, position: 'relative',
      zIndex: 1
    }}>
      {/* Municipality logo */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)', marginBottom: 8, flexShrink: 0,
        backgroundColor: '#fff', position: 'relative', zIndex: 2
      }}>
        <img
          src="/borongan-city-seal.png"
          alt="City of Borongan"
          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
          onError={e => { e.currentTarget.src = '/lgu-borongan.png'; }}
        />
      </div>

      <div style={{ color: '#eab308', fontSize: 6.5, fontWeight: 800, letterSpacing: 0.8, textAlign: 'center', lineHeight: 1.2, position: 'relative', zIndex: 2 }}>
        CITY OF
      </div>
      <div style={{ color: 'white', fontSize: 10, fontWeight: 900, letterSpacing: 0.8, textAlign: 'center', lineHeight: 1.2, marginBottom: 4, position: 'relative', zIndex: 2 }}>
        BORONGAN
      </div>

      <div style={{ color: '#eab308', fontSize: 5.5, textAlign: 'center', letterSpacing: 0.5, position: 'relative', zIndex: 2 }}>
        EASTERN SAMAR
      </div>

      {/* SVG Wave Border */}
      <svg style={{ position: 'absolute', right: -1, top: 0, height: '100%', width: 24, zIndex: 2 }} viewBox="0 0 24 240" preserveAspectRatio="none">
        <path d="M0,0 Q24,60 12,120 T24,240 L0,240 Z" fill="#1d4ed8" />
        <path d="M0,0 Q24,60 12,120 T24,240" fill="none" stroke="#eab308" strokeWidth="2.5" />
      </svg>
    </div>
  );

  // ── BACK LEFT PANEL ──────────────────────────────────────────────────────
  const BackLeftPanel = () => (
    <div style={{
      width: 90, flexShrink: 0,
      backgroundColor: '#1e3a8a',
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px 10px', gap: 14, position: 'relative',
      zIndex: 1
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'white' }}>
        <ShieldCheck size={14} />
        <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5 }}>SAFE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'white' }}>
        <Users size={14} />
        <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5 }}>CONNECTED</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'white' }}>
        <Building2 size={14} />
        <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5 }}>EMPOWERED</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'white' }}>
        <HeartHandshake size={14} />
        <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: 0.5, lineHeight: 1.2 }}>SERVING<br />WITH HEART</span>
      </div>
    </div>
  );

  return (
    <div>
      <div
        style={{ width: CARD_W, height: CARD_H, cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setIsFlipped(f => !f)}
        title="Click to flip"
      >
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>

          {/* ════════════════ FRONT ════════════════════════════════════════ */}
          <div style={shellStyle}>
            <FrontLeftPanel />

            {/* Right panel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 14px 10px 24px', position: 'relative', backgroundColor: '#f8fafc' }}>

              {/* Guilloche Pattern Background */}
              <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04, zIndex: 0 }}>
                <pattern id="guilloche" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M0,15 Q7.5,0 15,15 T30,15" fill="none" stroke="#1d4ed8" strokeWidth="0.5" />
                  <path d="M0,15 Q7.5,30 15,15 T30,15" fill="none" stroke="#1d4ed8" strokeWidth="0.5" />
                </pattern>
                <rect x="0" y="0" width="100%" height="100%" fill="url(#guilloche)" />
              </svg>



              {/* Header */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2.5px solid #1d4ed8', paddingBottom: 4, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 6.5, color: '#4b5563', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    Republic of the Philippines
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1.5, color: '#1e3a8a', lineHeight: 1.1 }}>
                    BORONGANON ID
                  </div>
                </div>
                <div style={{ position: 'absolute', bottom: -2.5, right: 0, height: 2.5, width: 40, backgroundColor: '#eab308' }} />
              </div>

              {/* Body */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12, flex: 1 }}>
                {/* Photo */}
                <div style={{
                  width: 70, height: 88, flexShrink: 0, borderRadius: 6, overflow: 'hidden',
                  border: '2px solid #1d4ed8', backgroundColor: '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {photo
                    ? <img src={photo} alt="Resident" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <PersonIcon />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 11, color: '#111827', letterSpacing: 0.3, lineHeight: 1.2 }}>
                    {fullName || 'N/A'}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#1d4ed8', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>
                    ID No. {r.residentId || '—'}
                  </div>

                  {/* 2-col personal info grid with icons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <UserIcon size={11} color="#1d4ed8" />
                      <div>
                        <div style={{ fontSize: 5, color: '#6b7280', letterSpacing: 0.5 }}>SEX</div>
                        <div style={{ fontSize: 7.5, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{fmt(r.sex)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={11} color="#1d4ed8" />
                      <div>
                        <div style={{ fontSize: 5, color: '#6b7280', letterSpacing: 0.5 }}>CIVIL STATUS</div>
                        <div style={{ fontSize: 7.5, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{fmt(r.civilStatus)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CalendarDays size={11} color="#1d4ed8" />
                      <div>
                        <div style={{ fontSize: 5, color: '#6b7280', letterSpacing: 0.5 }}>DATE OF BIRTH</div>
                        <div style={{ fontSize: 7.5, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{formatDate(r.birthdate)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IdCard size={11} color="#1d4ed8" />
                      <div>
                        <div style={{ fontSize: 5, color: '#6b7280', letterSpacing: 0.5 }}>AGE</div>
                        <div style={{ fontSize: 7.5, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{getAge(r.birthdate)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginTop: 4 }}>
                    <MapPin size={11} color="#1d4ed8" style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 5, color: '#6b7280', letterSpacing: 0.5 }}>ADDRESS</div>
                      <div style={{ fontSize: 7.5, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                        {address || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Block */}
              <div style={{ position: 'absolute', bottom: 12, right: 14, textAlign: 'center', zIndex: 1 }}>
                <div style={{ fontFamily: 'cursive, "Brush Script MT", "Dancing Script", sans-serif', fontSize: 13, color: '#111827', marginBottom: -2, whiteSpace: 'nowrap' }}>
                  {titleCaseName}
                </div>
                <div style={{ width: 90, borderTop: '1px solid #374151', margin: '0 auto', marginBottom: 2 }} />
                <div style={{ fontSize: 5, color: '#4b5563', fontWeight: 600, letterSpacing: 0.5 }}>
                  CARDHOLDER'S SIGNATURE
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════ BACK ═════════════════════════════════════════ */}
          <div style={{ ...shellStyle, transform: 'rotateY(180deg)' }}>
            <BackLeftPanel />

            {/* Right panel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#f8fafc' }}>



              <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, zIndex: 1 }}>
                {/* Emergency contact */}
                <div>
                  <div style={{ fontSize: 7, fontWeight: 700, color: '#1e3a8a', letterSpacing: 0.8, marginBottom: 4 }}>
                    IN CASE OF EMERGENCY, NOTIFY:
                  </div>
                  <div style={{ border: '1px solid #93c5fd', borderRadius: 6, padding: '6px 10px', backgroundColor: '#eff6ff', width: '75%' }}>
                    <div style={{ fontSize: 8.5, color: '#111827' }}>
                      Name: <span style={{ fontWeight: 800 }}>{r.emergencyContactPerson?.toUpperCase() || 'N/A'}</span>
                    </div>
                    <div style={{ fontSize: 8.5, color: '#111827', marginTop: 2 }}>
                      Contact: <span style={{ fontWeight: 800 }}>{r.emergencyContactNumber || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* QR + certification row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ padding: 4, backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: 6, flexShrink: 0 }}>
                    <QRCodeSVG value={qrValue} size={70} level="M" />
                  </div>
                  <div style={{ fontSize: 6.5, color: '#4b5563', lineHeight: 1.5, textAlign: 'justify', paddingRight: 40 }}>
                    This certifies that the bearer is a bonafide resident of Barangay{' '}
                    <strong style={{ color: '#1e3a8a' }}>{barangayName}</strong>,{' '}
                    <strong style={{ color: '#1e3a8a' }}>{municipalityName}</strong>, Eastern Samar, Philippines.
                  </div>
                </div>
              </div>

              {/* Bottom Gray Bar */}
              <div style={{ backgroundColor: '#e2e8f0', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ backgroundColor: '#1d4ed8', borderRadius: '50%', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={10} color="white" />
                  </div>
                  <div style={{ fontSize: 5.5, color: '#4b5563', fontWeight: 700, lineHeight: 1.3 }}>
                    THIS ID IS NON-TRANSFERABLE.<br />
                    IF FOUND, PLEASE RETURN TO THE CITY HALL.
                  </div>
                </div>

                {/* Mayor signature block */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 7.5, fontWeight: 800, color: '#111827', letterSpacing: 0.3 }}>
                    HON. JOSE IVAN DAYAN AGDA
                  </div>
                  <div style={{ fontSize: 6, color: '#4b5563', fontWeight: 600 }}>
                    CITY MAYOR
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', marginTop: 8, userSelect: 'none' }}>
        Click to flip
      </p>
    </div>
  );
};

