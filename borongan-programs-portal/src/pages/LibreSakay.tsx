import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BusMap } from '@/components/libre-sakay/BusMap';
import { BusCard } from '@/components/libre-sakay/BusCard';
import { ApplyModal } from '@/components/libre-sakay/ApplyModal';
import { useBusLocations } from '@/hooks/useBusLocations';
import { useRoutes } from '@/hooks/useRoutes';
import { portalProgramsService, type PortalProgram, type ProgramApplication, type BeneficiaryEnrollmentStatus } from '@/services/api/portal-programs.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FiArrowLeft, FiCheck, FiClock, FiX, FiInfo, FiMap, FiNavigation, FiAlertCircle } from 'react-icons/fi';
import { Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-black/60 px-4 py-2 rounded-t-lg">
          <p className="text-white text-sm font-medium truncate">{label}</p>
          <button onClick={onClose} className="text-white/70 hover:text-white ml-4 shrink-0">
            <FiX size={20} />
          </button>
        </div>
        {isLoading && (
          <div className="flex items-center justify-center h-64 rounded-b-lg bg-black/60">
            <Loader2 className="w-8 h-8 animate-spin text-white/60" />
          </div>
        )}
        <img
          src={url}
          alt={label}
          className={isLoading ? 'hidden' : 'w-full max-h-[80vh] object-contain rounded-b-lg bg-black'}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}

const LOCATION_STORAGE_KEY = 'libre_sakay_user_location';

// ── Status config ──────────────────────────────────────────────────────────────

// Beneficiary enrollment status (from /portal/libre-sakay/my-status endpoint)
type BeneficiaryKey = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'none';

const STATUS_CONFIG: Record<
  BeneficiaryKey,
  { label: string; description: string; badgeClass: string; icon: React.ReactNode }
> = {
  none: {
    label: 'Not Enrolled',
    description: 'You have not enrolled in Libre Sakay.',
    badgeClass: 'bg-gray-100 text-gray-600',
    icon: <FiInfo size={14} />,
  },
  PENDING: {
    label: 'Pending',
    description: 'Your application is being reviewed. We will notify you once it is processed.',
    badgeClass: 'bg-yellow-100 text-yellow-700',
    icon: <FiClock size={14} />,
  },
  ACTIVE: {
    label: 'Active',
    description: 'You are an active Libre Sakay beneficiary. Enjoy free rides!',
    badgeClass: 'bg-green-100 text-green-700',
    icon: <FiCheck size={14} />,
  },
  INACTIVE: {
    label: 'Suspended',
    description: 'Your Libre Sakay benefit has been suspended. Contact the LGU office to reinstate your benefit.',
    badgeClass: 'bg-red-100 text-red-700',
    icon: <FiAlertCircle size={14} />,
  },
};

// ── Status banner ──────────────────────────────────────────────────────────────

interface StatusBannerProps {
  beneficiaryStatus: BeneficiaryEnrollmentStatus | null;
  suspendedAt: string | null;
  isLoading: boolean;
  isCancelling: boolean;
  isLoadingDetails: boolean;
  hasClassification: boolean;
  eligible: boolean;
  onViewPrograms: () => void;
  onApply: () => void;
  onCancel: () => void;
  onViewDetails: () => void;
}

function StatusBanner({ beneficiaryStatus, suspendedAt, isLoading, isCancelling, isLoadingDetails, hasClassification, eligible, onViewPrograms, onApply, onCancel, onViewDetails }: StatusBannerProps) {
  if (isLoading) {
    return <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />;
  }

  const key = beneficiaryStatus ?? 'none';
  const config = STATUS_CONFIG[key];

  let description = config.description;

  // Override description based on beneficiary state
  if (key === 'none') {
    description = hasClassification
      ? eligible
        ? 'You are eligible. Submit your application to become a Libre Sakay beneficiary.'
        : 'You are not eligible for Libre Sakay based on your current beneficiary status.'
      : 'You need a beneficiary classification (Senior Citizen, PWD, etc.) to apply for Libre Sakay.';
  } else if (key === 'INACTIVE' && suspendedAt) {
    description = `Your Libre Sakay benefit has been suspended since ${new Date(suspendedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}. Contact the LGU office to reinstate your benefit.`;
  }

  return (
    <Card className="border border-gray-100">
      <CardContent className="p-4">
        <div className="flex flex-col-reverse items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0 -mt-[8px]">
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 mt-0.5', config.badgeClass)}>
              {config.icon}
              {config.label}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{description}</p>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {key === 'none' && !hasClassification && (
              <Button size="sm" variant="outline" onClick={onViewPrograms}>
                View Programs
              </Button>
            )}
            {key === 'none' && hasClassification && (
              <Button
                size="sm"
                className="bg-primary-600 hover:bg-primary-700"
                onClick={eligible ? onApply : onViewPrograms}
              >
                {eligible ? 'Apply Now' : 'View Programs'}
              </Button>
            )}
            {key === 'PENDING' && (
              <Button size="sm" variant="outline" onClick={onViewDetails} disabled={isLoadingDetails}>
                {isLoadingDetails ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1" />Loading…</>
                ) : (
                  'View Application'
                )}
              </Button>
            )}
            {key === 'ACTIVE' && (
              <Button size="sm" variant="outline" onClick={onViewDetails} disabled={isLoadingDetails}>
                {isLoadingDetails ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1" />Loading…</>
                ) : (
                  'View Details'
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Application Details Modal ─────────────────────────────────────────────────────

interface ApplicationDetailsModalProps {
  application: ProgramApplication | null;
  isLoading: boolean;
  isCancelling: boolean;
  beneficiaryStatus: BeneficiaryEnrollmentStatus | null;
  onClose: () => void;
  onCancel: () => void;
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({ application, isLoading, isCancelling, beneficiaryStatus, onClose, onCancel }) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxLabel, setLightboxLabel] = useState('');

  return (
    <>
      <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
            <div>
              <h2 className="text-base font-bold text-heading-900">Application Details</h2>
              <p className="text-xs text-gray-400 mt-0.5">{application?.program?.name ?? '—'}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <FiX className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <p className="text-sm text-gray-400">Loading details…</p>
              </div>
            ) : application ? (
              <>
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={cn('px-3 py-1.5 rounded-full text-xs font-semibold', {
                    'bg-green-100 text-green-700': application.status === 'approved',
                    'bg-yellow-100 text-yellow-700': application.status === 'pending',
                    'bg-red-100 text-red-700': application.status === 'rejected',
                    'bg-gray-100 text-gray-600': application.status === 'cancelled',
                  })}>
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </span>
                </div>

                {/* Beneficiary Type */}
                {application.submittedData?.['Beneficiary Type'] && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Beneficiary Type</span>
                    <span className="font-medium text-heading-700">{application.submittedData['Beneficiary Type']}</span>
                  </div>
                )}

                {/* Classification Type */}
                {application.submittedData?.['Classification Type'] && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Classification Type</span>
                    <span className="font-medium text-heading-700">{application.submittedData['Classification Type']}</span>
                  </div>
                )}

                {/* Dates */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date Applied</span>
                    <span className="font-medium text-heading-700">{formatDate(application.appliedAt)}</span>
                  </div>
                  {application.reviewedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Date Reviewed</span>
                      <span className="font-medium text-heading-700">{formatDate(application.reviewedAt)}</span>
                    </div>
                  )}
                </div>

                {/* Admin notes */}
                {application.adminNotes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Admin Notes</p>
                    <p className="text-sm text-heading-700">{application.adminNotes}</p>
                  </div>
                )}

                {/* Submitted data */}
                {(() => {
                  const submittedData = application.submittedData;
                  if (!submittedData) return null;
                  // Filter out the dedicated display fields (Beneficiary Type, Classification Type)
                  const otherEntries = Object.entries(submittedData).filter(
                    ([k]) => k !== 'Beneficiary Type' && k !== 'Classification Type'
                  );
                  if (otherEntries.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Submitted Information</p>
                      <div className="space-y-2">
                        {otherEntries.map(([k, value]) => (
                          <div key={k} className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-400">{k}</span>
                            <span className="text-sm text-heading-700">{value || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Attachments */}
                {application.attachments && application.attachments.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Attachments</p>
                    <div className="space-y-2">
                      {application.attachments.map((att, i) => (
                        <button
                          key={i}
                          onClick={() => { setLightboxUrl(att.url); setLightboxLabel(att.label); }}
                          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 underline"
                        >
                          <FileText size={14} />
                          {att.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {application.status === 'approved' && !application.adminNotes && Object.keys(application.submittedData || {}).length === 0 && !application.attachments?.length && (
                  <p className="text-sm text-gray-400 text-center py-2">No additional details available.</p>
                )}

                <div className="flex justify-between pt-2 border-t">
                  {beneficiaryStatus === 'PENDING' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={onCancel}
                      disabled={isCancelling}
                    >
                      {isCancelling ? (
                        <><Loader2 className="w-3 h-3 animate-spin mr-1" />Cancelling…</>
                      ) : (
                        'Cancel Application'
                      )}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <p className="text-sm text-gray-400">No application found.</p>
                <div className="flex justify-end pt-2 border-t w-full">
                  <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {lightboxUrl && (
        <Lightbox url={lightboxUrl} label={lightboxLabel} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

export function LibreSakay() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [libreSakayProgram, setLibreSakayProgram] = useState<PortalProgram | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [beneficiaryStatus, setBeneficiaryStatus] = useState<import('@/services/api/portal-programs.service').BeneficiaryEnrollmentStatus | null>(null);
  const [suspendedAt, setSuspendedAt] = useState<string | null>(null);
  const [hasClassification, setHasClassification] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [myApplication, setMyApplication] = useState<ProgramApplication | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  const { data: buses = [], isLoading: busesLoading } = useBusLocations(15_000);
  const { data: routes = [] } = useRoutes();
  const activeBuses = buses.filter(b => b.latitude && b.longitude);

  const fetchLibreSakayProgram = useCallback(async () => {
    if (!isAuthenticated) return;
    setStatusLoading(true);
    try {
      const [programRes, beneficiaryRes] = await Promise.allSettled([
        portalProgramsService.listPrograms({ name: 'Libre Sakay' }),
        portalProgramsService.getMyLibreSakayStatus(),
      ]);

      if (programRes.status === 'fulfilled') {
        setLibreSakayProgram(programRes.value.data[0] ?? null);
      }
      if (beneficiaryRes.status === 'fulfilled' && beneficiaryRes.value) {
        setBeneficiaryStatus(beneficiaryRes.value.status);
        setSuspendedAt(beneficiaryRes.value.suspendedAt);
        setHasClassification(beneficiaryRes.value.hasClassification);
      }
    } catch {
      toast({ title: 'Failed to load', description: 'Could not verify your program status. Please try again.' });
      setLibreSakayProgram(null);
    } finally {
      setStatusLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLibreSakayProgram();
  }, [fetchLibreSakayProgram]);

  // Auto-start location tracking with localStorage placeholder
  useEffect(() => {
    // 1. Hydrate from localStorage immediately (no flash of "needs location")
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      try {
        const coords = JSON.parse(stored) as [number, number];
        setUserLocation(coords);
      } catch {
        // ignore corrupt storage
      }
    }

    // 2. Start periodic location polling (not continuous watch)
    // watchPosition fires every tick (~1-2s) causing ETA refetches and UI blink
    // getCurrentPosition + interval gives us fresh location without the spam
    if (!navigator.geolocation) {
      return;
    }

    const pollLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(coords));
        },
        () => {
          // GPS error — userLocation stays as localStorage value or null
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30_000 }
      );
    };

    pollLocation(); // fetch immediately on mount
    const intervalId = setInterval(pollLocation, 15_000); // then every 15s

    return () => clearInterval(intervalId);
  }, []);

  const handleCancel = async () => {
    if (!libreSakayProgram) return;
    setIsCancelling(true);
    try {
      // Get the application ID first
      const applications = await portalProgramsService.getMyApplications();
      const app = applications.find(a => a.programId === libreSakayProgram.id);
      if (app) {
        await portalProgramsService.cancelApplication(app.id);
        await fetchLibreSakayProgram();
        setDetailsModalOpen(false);
        toast({
          title: 'Application cancelled',
          description: 'Your application has been cancelled successfully.',
        });
      }
    } catch {
      toast({
        title: 'Failed to cancel',
        description: 'Your application could not be cancelled. Please try again.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleViewDetails = async () => {
    if (!libreSakayProgram) return;
    setMyApplication(null);
    setDetailsModalOpen(true);
    setIsLoadingDetails(true);
    try {
      const applications = await portalProgramsService.getMyApplications();
      const app = applications.find(a => a.programId === libreSakayProgram.id);
      setMyApplication(app ?? null);
    } catch {
      setMyApplication(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Back"
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <img src="/da-logo.png" alt="DA" className="h-7 w-auto" />
            <span className="font-semibold text-heading-700">Libre Sakay</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => navigate('/libre-sakay/routes')}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors px-2 py-1 rounded-md hover:bg-primary-50"
            >
              <FiMap size={14} />
              View Routes
            </button>
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className={`w-2 h-2 rounded-full ${activeBuses.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              {busesLoading ? 'Loading…' : `${activeBuses.length} bus${activeBuses.length !== 1 ? 'es' : ''} active`}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* Eligibility / application status */}
        <StatusBanner
          beneficiaryStatus={beneficiaryStatus}
          suspendedAt={suspendedAt}
          isLoading={statusLoading}
          isCancelling={isCancelling}
          isLoadingDetails={isLoadingDetails}
          hasClassification={hasClassification}
          eligible={libreSakayProgram?.eligible ?? false}
          onViewPrograms={() => navigate('/')}
          onApply={() => setApplyModalOpen(true)}
          onCancel={handleCancel}
          onViewDetails={handleViewDetails}
        />

        {/* Live map */}
        <div>
          <h2 className="text-sm font-semibold text-heading-600 uppercase tracking-wide mb-2">
            Live Bus Tracking
          </h2>
          <BusMap
            height="340px"
            userLocation={userLocation}
            onUserLocation={setUserLocation}
            buses={buses}
            isLoading={busesLoading}
            selectedRouteId={selectedRouteId}
            onSelectedRouteChange={setSelectedRouteId}
            routes={routes.map(r => ({ id: r.id, name: r.name }))}
            selectedBusId={selectedBusId}
            onSelectedBusChange={setSelectedBusId}
          />
        </div>

        {/* Bus list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-heading-600 uppercase tracking-wide">
              Active Buses
            </h2>
            {!userLocation && (
              <span className="text-xs text-amber-500 flex items-center gap-1">
                <FiNavigation size={11} />
                Location needed for ETA
              </span>
            )}
          </div>

          {busesLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : activeBuses.length === 0 ? (
            <Card className="border border-dashed border-gray-200">
              <CardContent className="py-10 text-center">
                <p className="text-gray-400 text-sm">No buses are currently being tracked.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {(selectedRouteId ? activeBuses.filter(b => b.bus?.route?.id === selectedRouteId) : activeBuses).map(bus => (
                <BusCard
                  key={bus.id}
                  bus={bus}
                  userLocation={userLocation}
                  onFocus={() => setSelectedBusId(bus.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply modal */}
      {applyModalOpen && libreSakayProgram && (
        <ApplyModal
          program={libreSakayProgram}
          beneficiaryTypes={user?.beneficiaryTypes ?? []}
          onClose={() => setApplyModalOpen(false)}
          onSuccess={fetchLibreSakayProgram}
        />
      )}

      {detailsModalOpen && (
        <ApplicationDetailsModal
          application={myApplication}
          isLoading={isLoadingDetails}
          isCancelling={isCancelling}
          beneficiaryStatus={beneficiaryStatus}
          onClose={() => setDetailsModalOpen(false)}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
