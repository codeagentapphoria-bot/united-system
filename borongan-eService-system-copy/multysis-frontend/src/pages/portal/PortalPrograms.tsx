import React, { useCallback, useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiBookOpen,
  FiCheck,
  FiChevronLeft,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiX,
} from 'react-icons/fi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalLayout } from '@/components/layout/PortalLayout';
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
  isApplying: boolean;
}

const ProgramCard: React.FC<ProgramCardProps> = ({ program, onApply, isApplying }) => {
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
        {program.requirements && (
          <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600 whitespace-pre-line">
            <p className="font-semibold text-gray-700 mb-1">Requirements:</p>
            {program.requirements}
          </div>
        )}

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
              disabled={isApplying}
            >
              {isApplying ? 'Applying...' : 'Apply Now'}
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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="font-medium text-heading-700">{application.program.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Applied{' '}
          {new Date(application.appliedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
        {application.adminNotes && application.status === 'rejected' && (
          <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
            <FiAlertCircle size={12} className="mt-0.5 shrink-0" />
            {application.adminNotes}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {statusConfig && (
          <Badge className={cn('flex items-center gap-1 text-xs shrink-0', statusConfig.className)}>
            {statusConfig.icon}
            {statusConfig.label}
          </Badge>
        )}

        {application.status === 'pending' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(application.id)}
            disabled={isCancelling}
            className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
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
  const [applyingId, setApplyingId] = useState<string | null>(null);

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

  const handleApply = async (program: PortalProgram) => {
    setApplyingId(program.id);
    try {
      await portalProgramsService.applyForProgram(program.id);
      const [programsResult, updatedApps] = await Promise.all([
        portalProgramsService.listPrograms({ search: debouncedSearch || undefined, type: typeFilter, page: pagination.page, limit: 12 }),
        portalProgramsService.getMyApplications(),
      ]);
      setPrograms(programsResult.data);
      setPagination({ page: programsResult.pagination.page, totalPages: programsResult.pagination.totalPages, total: programsResult.pagination.total });
      setApplications(updatedApps);
      toast({ title: 'Application submitted', description: `You applied for ${program.name}.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to apply',
        description: error?.response?.data?.message || error.message || 'Something went wrong',
      });
    } finally {
      setApplyingId(null);
    }
  };

  const handleCancel = async (appId: string) => {
    setCancellingId(appId);
    try {
      await portalProgramsService.cancelApplication(appId);
      const [programsResult, updatedApps] = await Promise.all([
        portalProgramsService.listPrograms({ search: debouncedSearch || undefined, type: typeFilter, page: pagination.page, limit: 12 }),
        portalProgramsService.getMyApplications(),
      ]);
      setPrograms(programsResult.data);
      setPagination({ page: programsResult.pagination.page, totalPages: programsResult.pagination.totalPages, total: programsResult.pagination.total });
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
      <div className="max-w-4xl mx-auto space-y-6 px-4 py-12">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-heading-800 flex items-center gap-2">
            <FiBookOpen className="text-primary-600" />
            Government Programs
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
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
              <p className="text-xs text-gray-500">{pagination.total} program{pagination.total !== 1 ? 's' : ''} found</p>
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
                  <ProgramCard
                    key={program.id}
                    program={program}
                    onApply={handleApply}
                    isApplying={applyingId === program.id}
                  />
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
            <Card>
              <CardContent className="p-0">
                {isLoadingApps ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
                    ))}
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <FiRefreshCw size={40} className="mx-auto mb-3 opacity-50" />
                    <p>You have not applied for any programs yet.</p>
                  </div>
                ) : (
                  <div className="px-6 py-2">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
};
