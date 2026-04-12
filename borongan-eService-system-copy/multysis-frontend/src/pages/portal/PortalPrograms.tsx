import React, { useCallback, useEffect, useState } from 'react';
import { FiAlertCircle, FiBookOpen, FiCheck, FiChevronLeft, FiClock, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { ApplyForProgramModal } from '@/components/modals/government-programs';
import { AttachmentGrid } from '@/components/common/AttachmentPreview';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import {
  portalProgramsService,
  type PortalProgram,
  type ProgramApplication,
} from '@/services/api/portal-programs.service';
import type { GovernmentProgramType } from '@/services/api/government-program.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REQ_TYPE_STYLES: Record<string, string> = {
  file: 'bg-blue-100 text-blue-700',
  text: 'bg-gray-100 text-gray-600',
  textarea: 'bg-gray-100 text-gray-600',
  number: 'bg-amber-100 text-amber-700',
  email: 'bg-emerald-100 text-emerald-700',
  tel: 'bg-teal-100 text-teal-700',
  url: 'bg-indigo-100 text-indigo-700',
  date: 'bg-purple-100 text-purple-700',
  time: 'bg-purple-100 text-purple-700',
  'datetime-local': 'bg-purple-100 text-purple-700',
  month: 'bg-purple-100 text-purple-700',
  week: 'bg-purple-100 text-purple-700',
};

const TYPE_LABELS: Record<GovernmentProgramType, string> = {
  SENIOR_CITIZEN: 'Senior Citizen',
  PWD: 'PWD',
  STUDENT: 'Student',
  SOLO_PARENT: 'Solo Parent',
  ALL: 'All Residents',
};

const TYPE_FILTER_OPTIONS: { value: GovernmentProgramType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Programs' },
  { value: 'ALL', label: 'For Everyone' },
  { value: 'SENIOR_CITIZEN', label: 'Senior Citizen' },
  { value: 'PWD', label: 'PWD' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'SOLO_PARENT', label: 'Solo Parent' },
];

const APPLICATION_STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending Review',
    className: 'bg-yellow-100 text-yellow-700',
    icon: <FiClock size={12} />,
  },
  approved: {
    label: 'Enrolled',
    className: 'bg-purple-100 text-purple-700',
    icon: <FiCheck size={12} />,
  },
  rejected: {
    label: 'Not Approved',
    className: 'bg-red-100 text-red-700',
    icon: <FiX size={12} />,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600',
    icon: <FiX size={12} />,
  },
};

// ---------------------------------------------------------------------------
// ProgramCard
// ---------------------------------------------------------------------------

interface ProgramCardProps {
  program: PortalProgram;
  onApply: (program: PortalProgram) => void;
}

const ProgramCard: React.FC<ProgramCardProps> = ({ program, onApply }) => {
  const appStatus = program.applicationStatus;
  const statusConfig = appStatus ? APPLICATION_STATUS_CONFIG[appStatus] : null;

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-5 flex flex-col h-full gap-3">
        {/* Header */}
        <div>
          <h3 className="font-semibold text-heading-700 text-base">{program.name}</h3>
          {program.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{program.description}</p>}
        </div>

        {/* Type badges */}
        <div className="flex flex-wrap gap-1">
          {program.types.map(t => (
            <span
              key={t}
              className="text-xs bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded-full"
            >
              {TYPE_LABELS[t]}
            </span>
          ))}
        </div>

        {/* Requirements */}
        {program.requirements &&
          (() => {
            let items: { type: string; label: string; required?: boolean }[] = [];
            try {
              const parsed = JSON.parse(program.requirements);
              if (Array.isArray(parsed)) items = parsed;
            } catch {
              items = [{ type: 'text', label: program.requirements }];
            }
            return items.length > 0 ? (
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Requirements</p>
                </div>
                <ul className="divide-y divide-gray-50">
                  {items.map((req, i) => (
                    <li key={i} className="flex items-center gap-2.5 px-3 py-2 bg-white">
                      <span
                        className={cn(
                          'shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase',
                          REQ_TYPE_STYLES[req.type] ?? 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {req.type}
                      </span>
                      <span className="text-sm text-gray-700 flex-1 leading-tight">{req.label}</span>
                      {req.required ? (
                        <span className="shrink-0 text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                          Required
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-gray-400">Optional</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          })()}

        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          {/* Eligibility / application status pill */}
          {statusConfig ? (
            <Badge className={cn('flex items-center gap-1 text-xs', statusConfig.className)}>
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          ) : program.eligible ? (
            <Badge className="bg-green-100 text-green-700 text-xs">Eligible</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-500 text-xs">Not Eligible</Badge>
          )}

          {/* Action button */}
          {program.eligible && (!appStatus || appStatus === 'cancelled' || appStatus === 'rejected') && (
            <Button
              size="sm"
              className="bg-primary-600 hover:bg-primary-700 text-white text-xs"
              onClick={() => onApply(program)}
            >
              Apply Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// MyApplicationRow
// ---------------------------------------------------------------------------

interface MyApplicationRowProps {
  application: ProgramApplication;
  onCancel: (appId: string) => void;
  isCancelling: boolean;
}

const MyApplicationRow: React.FC<MyApplicationRowProps> = ({ application, onCancel, isCancelling }) => {
  const statusConfig = APPLICATION_STATUS_CONFIG[application.status];
  const hasSubmittedData = application.submittedData && Object.keys(application.submittedData).length > 0;
  const hasAttachments = application.attachments && application.attachments.length > 0;
  const showAdminNote =
    application.adminNotes && (application.status === 'approved' || application.status === 'rejected');

  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-heading-700 text-base leading-snug">{application.program.name}</p>
            {application.program.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{application.program.description}</p>
            )}
          </div>
          {statusConfig && (
            <Badge className={cn('flex items-center gap-1 text-xs shrink-0 mt-0.5', statusConfig.className)}>
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          )}
        </div>

        {/* Type badges */}
        {application.program.types?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {application.program.types.map(t => (
              <span
                key={t}
                className="text-[10px] font-medium bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-full"
              >
                {TYPE_LABELS[t]}
              </span>
            ))}
          </div>
        )}

        {/* Dates */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>
            Applied{' '}
            {new Date(application.appliedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          {application.reviewedAt && (
            <span>
              Reviewed{' '}
              {new Date(application.reviewedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>

        {/* Admin note */}
        {showAdminNote && (
          <div
            className={cn(
              'rounded-md px-3 py-2 text-xs flex items-start gap-2',
              application.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-purple-50 text-purple-700'
            )}
          >
            <FiAlertCircle size={12} className="mt-0.5 shrink-0" />
            <span>{application.adminNotes}</span>
          </div>
        )}

        {/* Submitted text data */}
        {hasSubmittedData && (
          <div className="rounded-lg border border-gray-100 overflow-hidden text-xs">
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100">
              <p className="font-semibold text-gray-500 uppercase tracking-wide text-[11px]">Submitted Information</p>
            </div>
            <ul className="divide-y divide-gray-50">
              {Object.entries(application.submittedData!).map(([label, value]) => (
                <li key={label} className="flex gap-3 px-3 py-2 bg-white">
                  <span className="text-gray-500 shrink-0 w-28">{label}</span>
                  <span className="font-medium text-gray-700 flex-1">{value || '—'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Attachments</p>
            <AttachmentGrid attachments={application.attachments!} />
          </div>
        )}

        {/* Cancel */}
        {application.status === 'pending' && (
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCancel(application.id)}
              disabled={isCancelling}
              className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
            >
              Cancel Application
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// PortalPrograms page
// ---------------------------------------------------------------------------

export const PortalPrograms: React.FC = () => {
  const { toast } = useToast();

  // Browse tab state
  const [programs, setPrograms] = useState<PortalProgram[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [typeFilter, setTypeFilter] = useState<GovernmentProgramType | 'all'>('all');
  const [localSearch, setLocalSearch] = useState('');
  const debouncedSearch = useDebounce(localSearch, 300);
  const [applyModalProgram, setApplyModalProgram] = useState<PortalProgram | null>(null);

  // My applications tab state
  const [applications, setApplications] = useState<ProgramApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchPrograms = useCallback(
    async (page = 1) => {
      setIsLoadingPrograms(true);
      try {
        const result = await portalProgramsService.listPrograms({
          search: debouncedSearch || undefined,
          type: typeFilter,
          page,
          limit: 12,
        });
        setPrograms(result.data);
        setPagination({
          page: result.pagination.page,
          totalPages: result.pagination.totalPages,
          total: result.pagination.total,
        });
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load programs' });
      } finally {
        setIsLoadingPrograms(false);
      }
    },
    [typeFilter, debouncedSearch, toast]
  );

  useEffect(() => {
    fetchPrograms(1);
  }, [fetchPrograms]);

  // Fetch my applications
  useEffect(() => {
    let cancelled = false;
    setIsLoadingApps(true);
    portalProgramsService
      .getMyApplications()
      .then(data => {
        if (!cancelled) setApplications(data);
      })
      .catch(() => {
        if (!cancelled) toast({ variant: 'destructive', title: 'Error', description: 'Failed to load applications' });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingApps(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApply = (program: PortalProgram) => {
    setApplyModalProgram(program);
  };

  const handleApplySuccess = async () => {
    const [programsResult, updatedApps] = await Promise.all([
      portalProgramsService.listPrograms({
        search: debouncedSearch || undefined,
        type: typeFilter,
        page: pagination.page,
        limit: 12,
      }),
      portalProgramsService.getMyApplications(),
    ]);
    setPrograms(programsResult.data);
    setPagination({
      page: programsResult.pagination.page,
      totalPages: programsResult.pagination.totalPages,
      total: programsResult.pagination.total,
    });
    setApplications(updatedApps);
  };

  const handleCancel = async (appId: string) => {
    setCancellingId(appId);
    try {
      await portalProgramsService.cancelApplication(appId);
      const [programsResult, updatedApps] = await Promise.all([
        portalProgramsService.listPrograms({
          search: debouncedSearch || undefined,
          type: typeFilter,
          page: pagination.page,
          limit: 12,
        }),
        portalProgramsService.getMyApplications(),
      ]);
      setPrograms(programsResult.data);
      setPagination({
        page: programsResult.pagination.page,
        totalPages: programsResult.pagination.totalPages,
        total: programsResult.pagination.total,
      });
      setApplications(updatedApps);
      toast({ title: 'Application cancelled' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to cancel',
        description: error?.response?.data?.message || 'Something went wrong',
      });
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-heading-700 mb-4">Government Programs</h1>
          <p className="text-lg text-heading-600">
            Browse available government assistance programs and apply for the ones you qualify for.
          </p>
        </div>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Browse Programs</TabsTrigger>
            <TabsTrigger value="my-applications">
              My Applications
              {applications.filter(a => a.status === 'pending').length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {applications.filter(a => a.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ------------------------------------------------------------------ */}
          {/* Browse Programs Tab                                                 */}
          {/* ------------------------------------------------------------------ */}
          <TabsContent value="browse" className="space-y-4">
            {/* Search + type filter row */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              {/* Type filter */}
              <div className="flex flex-wrap gap-2">
                {TYPE_FILTER_OPTIONS.map(opt => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={typeFilter === opt.value ? 'default' : 'outline'}
                    onClick={() => setTypeFilter(opt.value as GovernmentProgramType | 'all')}
                    className={cn(
                      typeFilter === opt.value
                        ? 'bg-primary-600 hover:bg-primary-700 text-white'
                        : 'text-primary-600 border-primary-200 hover:bg-primary-50'
                    )}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64 shrink-0">
                <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search programs..."
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Result count */}
            {!isLoadingPrograms && (
              <p className="text-xs text-gray-500">
                {pagination.total} program{pagination.total !== 1 ? 's' : ''} found
              </p>
            )}

            {isLoadingPrograms ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : programs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FiBookOpen size={40} className="mx-auto mb-3 opacity-50" />
                <p>No programs found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map(program => (
                  <ProgramCard key={program.id} program={program} onApply={handleApply} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchPrograms(pagination.page - 1)}
                  disabled={pagination.page <= 1 || isLoadingPrograms}
                >
                  <FiChevronLeft size={16} />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchPrograms(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || isLoadingPrograms}
                >
                  <FiChevronLeft size={16} className="rotate-180" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ------------------------------------------------------------------ */}
          {/* My Applications Tab                                                 */}
          {/* ------------------------------------------------------------------ */}
          <TabsContent value="my-applications">
            {isLoadingApps ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FiRefreshCw size={40} className="mx-auto mb-3 opacity-50" />
                <p>You have not applied for any programs yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <MyApplicationRow
                    key={app.id}
                    application={app}
                    onCancel={handleCancel}
                    isCancelling={cancellingId === app.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <ApplyForProgramModal
        open={!!applyModalProgram}
        onClose={() => setApplyModalProgram(null)}
        program={applyModalProgram}
        onSuccess={handleApplySuccess}
      />
    </PortalLayout>
  );
};
