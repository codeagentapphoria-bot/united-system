import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BusMap } from '@/components/libre-sakay/BusMap';
import { BusCard } from '@/components/libre-sakay/BusCard';
import { ApplyModal } from '@/components/libre-sakay/ApplyModal';
import { useBusLocations } from '@/hooks/useBusLocations';
import { portalProgramsService, type PortalProgram } from '@/services/api/portal-programs.service';
import { useAuth } from '@/context/AuthContext';
import { FiArrowLeft, FiCheck, FiClock, FiX, FiInfo } from 'react-icons/fi';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Status config ──────────────────────────────────────────────────────────────

type AppStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | null;

const STATUS_CONFIG: Record<
  NonNullable<AppStatus> | 'none',
  { label: string; description: string; badgeClass: string; icon: React.ReactNode }
> = {
  none: {
    label: 'Not Applied',
    description: 'You have not applied for Libre Sakay.',
    badgeClass: 'bg-gray-100 text-gray-600',
    icon: <FiInfo size={14} />,
  },
  pending: {
    label: 'Pending Review',
    description: "Your application is being reviewed. We'll notify you once it's processed.",
    badgeClass: 'bg-yellow-100 text-yellow-700',
    icon: <FiClock size={14} />,
  },
  approved: {
    label: 'Beneficiary',
    description: 'You are an approved Libre Sakay beneficiary. Enjoy free rides!',
    badgeClass: 'bg-green-100 text-green-700',
    icon: <FiCheck size={14} />,
  },
  rejected: {
    label: 'Not Approved',
    description: 'Your application was not approved. Contact the LGU office for more information.',
    badgeClass: 'bg-red-100 text-red-700',
    icon: <FiX size={14} />,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Your application was cancelled.',
    badgeClass: 'bg-gray-100 text-gray-600',
    icon: <FiX size={14} />,
  },
};

// ── Status banner ──────────────────────────────────────────────────────────────

interface StatusBannerProps {
  program: PortalProgram | null;
  isLoading: boolean;
  isCancelling: boolean;
  onViewPrograms: () => void;
  onApply: () => void;
  onCancel: () => void;
}

function StatusBanner({ program, isLoading, isCancelling, onViewPrograms, onApply, onCancel }: StatusBannerProps) {
  if (isLoading) {
    return <div className="h-20 rounded-xl bg-gray-100 animate-pulse" />;
  }

  const status = program?.applicationStatus ?? null;
  const eligible = program?.eligible ?? false;
  const key = status ?? 'none';
  const config = STATUS_CONFIG[key];

  return (
    <Card className="border border-gray-100">
      <CardContent className="p-4">
        <div className="flex flex-col-reverse items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 flex-1 min-w-0 -mt-[8px]">
            <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 mt-0.5', config.badgeClass)}>
              {config.icon}
              {config.label}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
            {key === 'none' && !eligible && (
              <Button size="sm" variant="outline" onClick={onViewPrograms}>
                View Programs
              </Button>
            )}
            {key === 'none' && eligible && (
              <Button
                size="sm"
                className="bg-primary-600 hover:bg-primary-700"
                onClick={onApply}
              >
                Apply Now
              </Button>
            )}
            {key === 'pending' && (
              <Button
                size="sm"
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
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
            {(key === 'rejected' || key === 'cancelled') && eligible && (
              <Button
                size="sm"
                className="bg-primary-600 hover:bg-primary-700"
                onClick={onApply}
              >
                Apply Again
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function LibreSakay() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [libreSakayProgram, setLibreSakayProgram] = useState<PortalProgram | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: buses = [], isLoading: busesLoading } = useBusLocations(30_000);
  const activeBuses = buses.filter(b => b.latitude && b.longitude);

  const fetchLibreSakayProgram = useCallback(async () => {
    if (!isAuthenticated) return;
    setStatusLoading(true);
    try {
      const { data } = await portalProgramsService.listPrograms({ search: 'libre sakay' });
      const libreProgram = data[0] ?? null;
      setLibreSakayProgram(libreProgram);
    } catch {
      setLibreSakayProgram(null);
    } finally {
      setStatusLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchLibreSakayProgram();
  }, [fetchLibreSakayProgram]);

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
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsCancelling(false);
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
          program={libreSakayProgram}
          isLoading={statusLoading}
          isCancelling={isCancelling}
          onViewPrograms={() => navigate('/')}
          onApply={() => setApplyModalOpen(true)}
          onCancel={handleCancel}
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
          />
        </div>

        {/* Bus list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-heading-600 uppercase tracking-wide">
              Active Buses
            </h2>
            {!userLocation && (
              <span className="text-xs text-gray-400">Enable location for ETA</span>
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
              {activeBuses.map(bus => (
                <BusCard
                  key={bus.id}
                  bus={bus}
                  userLocation={userLocation}
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
          onClose={() => setApplyModalOpen(false)}
          onSuccess={fetchLibreSakayProgram}
        />
      )}
    </div>
  );
}
