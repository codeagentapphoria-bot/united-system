import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '@/services/api/auth.service';
import type { User } from '@/types/auth';

// ---------------------------------------------------------------------------
// CR80 landscape — 85.6 mm × 54 mm scaled to 380 × 240 px
// ---------------------------------------------------------------------------
const CARD_W = 380;
const CARD_H = 240;
const PANEL_W = 108; // blue left panel

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

  const bgFront = toAbsUrl(cardInfo.municipality?.idBackgroundFrontPath);
  const bgBack = toAbsUrl(cardInfo.municipality?.idBackgroundBackPath);
  const muniLogo = toAbsUrl(cardInfo.municipality?.municipalityLogoPath);
  const brgyLogo = toAbsUrl(cardInfo.barangayLogoPath);
  const photo = toAbsUrl(r.picturePath);

  const fullName = [r.firstName, r.middleName ? r.middleName.charAt(0) + '.' : null, r.lastName, r.extensionName]
    .filter(Boolean).join(' ').toUpperCase();

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

  const watermark = (src: string): React.CSSProperties => ({
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', opacity: 0.18, filter: 'blur(2px)',
    transform: 'scale(1.05)', zIndex: 0, pointerEvents: 'none',
  });

  // ── blue left panel (shared between front & back) ─────────────────────────
  const LeftPanel = ({ bg }: { bg?: string | null }) => (
    <div style={{
      width: PANEL_W, flexShrink: 0,
      background: 'linear-gradient(160deg, #1e40af 0%, #1d4ed8 60%, #2563eb 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '14px 8px 10px', gap: 0, position: 'relative',
    }}>
      {bg && <img src={bg} alt="" aria-hidden style={{ ...watermark(bg), opacity: 0.12 }} />}

      {/* Municipality logo */}
      <div style={{
        width: 56, height: 56, borderRadius: '50%', padding: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)', marginBottom: 8, flexShrink: 0,
      }}>
        <img
          src="/borongan-city-seal.png"
          alt="City of Borongan"
          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
          onError={e => { e.currentTarget.src = '/lgu-borongan.png'; }}
        />
      </div>

      <div style={{ color: 'white', fontSize: 7.5, fontWeight: 800, letterSpacing: 0.8, textAlign: 'center', lineHeight: 1.2, position: 'relative', zIndex: 1 }}>
        CITY OF
      </div>
      <div style={{ color: 'white', fontSize: 9, fontWeight: 800, letterSpacing: 0.8, textAlign: 'center', lineHeight: 1.2, marginBottom: 4, position: 'relative', zIndex: 1 }}>
        BORONGAN
      </div>

      <div style={{ width: '55%', height: 1, backgroundColor: 'rgba(255,255,255,0.35)', margin: '6px 0' }} />

      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 6.5, textAlign: 'center', letterSpacing: 0.5, position: 'relative', zIndex: 1 }}>
        EASTERN SAMAR
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
            <LeftPanel bg={bgFront} />

            {/* Right panel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 14px', position: 'relative' }}>
              {bgFront && <img src={bgFront} alt="" aria-hidden style={watermark(bgFront)} />}

              {/* Header */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #1d4ed8', paddingBottom: 6, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 7, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Republic of the Philippines
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, color: '#1d4ed8', lineHeight: 1 }}>
                    BORONGANON ID
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12, flex: 1 }}>
                {/* Photo */}
                <div style={{
                  width: 70, height: 88, flexShrink: 0, borderRadius: 5, overflow: 'hidden',
                  border: '2px solid #1d4ed8', backgroundColor: '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {photo
                    ? <img src={photo} alt="Resident" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <PersonIcon />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 11, color: '#111827', letterSpacing: 0.3, lineHeight: 1.2 }}>
                    {fullName || 'N/A'}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#1d4ed8', fontWeight: 700, letterSpacing: 0.5 }}>
                    ID No. {r.residentId || '—'}
                  </div>

                  <div style={{ height: 1, backgroundColor: '#e5e7eb', margin: '2px 0' }} />

                  {/* 2-col personal info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 10px' }}>
                    {[
                      ['SEX', fmt(r.sex)],
                      ['CIVIL STATUS', fmt(r.civilStatus)],
                      ['DATE OF BIRTH', formatDate(r.birthdate)],
                      ['AGE', getAge(r.birthdate)],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: 6.5, color: '#6b7280', letterSpacing: 0.5 }}>{label}</div>
                        <div style={{ fontSize: 8, fontWeight: 700, color: '#111827' }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ height: 1, backgroundColor: '#f3f4f6', margin: '2px 0' }} />

                  {/* Address */}
                  <div>
                    <div style={{ fontSize: 6.5, color: '#6b7280', letterSpacing: 0.5 }}>ADDRESS</div>
                    <div style={{ fontSize: 8, fontWeight: 600, color: '#111827', lineHeight: 1.35 }}>
                      {address || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ════════════════ BACK ═════════════════════════════════════════ */}
          <div style={{ ...shellStyle, transform: 'rotateY(180deg)' }}>
            <LeftPanel bg={bgBack} />

            {/* Right panel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px 14px', position: 'relative', justifyContent: 'space-between' }}>
              {bgBack && <img src={bgBack} alt="" aria-hidden style={watermark(bgBack)} />}

              {/* Emergency contact */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 7, fontWeight: 700, color: '#374151', letterSpacing: 0.8, marginBottom: 4 }}>
                  IN CASE OF EMERGENCY, NOTIFY:
                </div>
                <div style={{ border: '1px solid #93c5fd', borderRadius: 5, padding: '5px 8px', backgroundColor: 'rgba(239,246,255,0.7)' }}>
                  <div style={{ fontSize: 8, color: '#374151' }}>
                    Name: <span style={{ fontWeight: 700 }}>{r.emergencyContactPerson?.toUpperCase() || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: 8, color: '#374151', marginTop: 1 }}>
                    Contact: <span style={{ fontWeight: 700 }}>{r.emergencyContactNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* QR + certification row */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                <QRCodeSVG value={qrValue} size={72} level="M" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 7, color: '#4b5563', lineHeight: 1.6, textAlign: 'justify' }}>
                  This certifies that the bearer is a bonafide resident of Barangay{' '}
                  <strong>{barangayName}</strong>, {' '}
                  <strong>{municipalityName}</strong>, Eastern Samar, Philippines.
                </div>
              </div>

              {/* Mayor + notice row */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 6.5, color: '#9ca3af', fontWeight: 600 }}>
                  THIS ID IS NON-TRANSFERABLE.<br />
                  IF FOUND, PLEASE RETURN TO THE CITY HALL.
                </div>

                {/* Mayor signature block */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ width: 120, borderTop: '1.5px solid #374151', marginBottom: 3 }} />
                  <div style={{ fontSize: 8, fontWeight: 800, color: '#111827', letterSpacing: 0.3 }}>
                    HON. JOSE IVAN DAYAN AGDA
                  </div>
                  <div style={{ fontSize: 7, color: '#6b7280', fontWeight: 600 }}>
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
