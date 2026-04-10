// React imports
import React, { useCallback, useEffect, useState } from 'react';

// Icons
import {
  FiBookOpen,
  FiCheck,
  FiChevronLeft,
  FiClock,
  FiEye,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Services
import {
  portalProgramsService,
  type AdminProgramApplication,
  type AdminProgramApplicationDetail,
} from '@/services/api/portal-programs.service';

// Utils
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
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

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-700',
    icon: <FiClock size={12} />,
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-700',
    icon: <FiCheck size={12} />,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700',
    icon: <FiX size={12} />,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-500',
    icon: <FiX size={12} />,
  },
};

const fmt = (v?: string | null) =>
  v ? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

// ---------------------------------------------------------------------------
// Resident Preview Dialog
// ---------------------------------------------------------------------------

interface ResidentPreviewDialogProps {
  appId: string | null;
  open: boolean;
  onClose: () => void;
}

const ResidentPreviewDialog: React.FC<ResidentPreviewDialogProps> = ({ appId, open, onClose }) => {
  const { toast } = useToast();
  const [detail, setDetail] = useState<AdminProgramApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!appId || !open) return;
    let cancelled = false;
    setIsLoading(true);
    setDetail(null);
    portalProgramsService
      .getApplicationAdmin(appId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch(() => {
        if (!cancelled) toast({ variant: 'destructive', title: 'Failed to load resident info' });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appId, open, toast]);

  const r = detail?.resident;
  const fullName = r
    ? [r.firstName, r.middleName, r.lastName, r.extensionName].filter(Boolean).join(' ')
    : '';

  const beneficiaries = r
    ? [
        { label: 'Senior Citizen', data: r.seniorCitizenBeneficiary, idField: r.seniorCitizenBeneficiary?.seniorCitizenId },
        { label: 'PWD', data: r.pwdBeneficiary, idField: r.pwdBeneficiary?.pwdId },
        { label: 'Student', data: r.studentBeneficiary, idField: r.studentBeneficiary?.studentId },
        { label: 'Solo Parent', data: r.soloParentBeneficiary, idField: r.soloParentBeneficiary?.soloParentId },
      ].filter((b) => b.data)
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading-700">Resident Information</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
            Loading…
          </div>
        ) : !detail ? null : (
          <div className="space-y-4">
            {/* Identity */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {r?.picturePath
                  ? <img src={r.picturePath} alt={fullName} className="w-full h-full object-cover" />
                  : <FiUser size={28} className="text-primary-500" />}
              </div>
              <div>
                <p className="font-semibold text-heading-700 text-base">{fullName}</p>
                {r?.residentId && (
                  <p className="text-xs font-mono text-primary-600">{r.residentId}</p>
                )}
                <p className="text-xs text-gray-500">{r?.barangay?.barangayName || '—'}</p>
              </div>
            </div>

            {/* Personal details */}
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Sex</p>
                <p className="font-medium">{fmt(r?.sex)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Civil Status</p>
                <p className="font-medium">{fmt(r?.civilStatus)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date of Birth</p>
                <p className="font-medium">
                  {r?.birthdate
                    ? new Date(r.birthdate).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Street Address</p>
                <p className="font-medium">{r?.streetAddress || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Contact Number</p>
                <p className="font-medium">{r?.contactNumber || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium break-all">{r?.email || '—'}</p>
              </div>
            </div>

            {/* Application details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Program</span>
                <span className="font-medium text-heading-700">{detail.program.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Applied</span>
                <span>
                  {new Date(detail.appliedAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                {STATUS_CONFIG[detail.status] ? (
                  <Badge className={cn('flex items-center gap-1 text-xs', STATUS_CONFIG[detail.status].className)}>
                    {STATUS_CONFIG[detail.status].icon}
                    {STATUS_CONFIG[detail.status].label}
                  </Badge>
                ) : (
                  <span className="font-medium">{detail.status}</span>
                )}
              </div>
              {detail.adminNotes && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
                  <p className="text-xs bg-white border border-gray-200 rounded p-2">{detail.adminNotes}</p>
                </div>
              )}
            </div>

            {/* Beneficiary statuses */}
            {beneficiaries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Beneficiary Records</p>
                <div className="space-y-1.5">
                  {beneficiaries.map((b) => (
                    <div key={b.label} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                      <span className="text-gray-700">{b.label}</span>
                      <div className="flex items-center gap-2">
                        {b.idField && <span className="text-xs font-mono text-gray-500">{b.idField}</span>}
                        <Badge
                          className={cn(
                            'text-xs',
                            b.data?.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {b.data?.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Review Dialog
// ---------------------------------------------------------------------------

interface ReviewDialogProps {
  application: AdminProgramApplication | null;
  open: boolean;
  onClose: () => void;
  onReview: (action: 'approve' | 'reject', notes?: string) => Promise<void>;
  isLoading: boolean;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({ application, open, onClose, onReview, isLoading }) => {
  const [notes, setNotes] = useState('');

  if (!application) return null;

  const fullName = [
    application.resident.firstName,
    application.resident.middleName,
    application.resident.lastName,
    application.resident.extensionName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading-700">Review Application</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Applicant: </span>
              <span className="font-medium text-heading-700">{fullName}</span>
            </div>
            <div>
              <span className="text-gray-500">Program: </span>
              <span className="font-medium text-heading-700">{application.program.name}</span>
            </div>
            <div>
              <span className="text-gray-500">Barangay: </span>
              <span className="font-medium">{application.resident.barangay?.barangayName || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Applied: </span>
              <span>
                {new Date(application.appliedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Admin Notes (optional)</label>
            <Textarea
              placeholder="Add notes or reason for rejection..."
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => onReview('reject', notes)}
              disabled={isLoading}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {isLoading ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              onClick={() => onReview('approve', notes)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// ProgramApplicationsTab
// ---------------------------------------------------------------------------

export const ProgramApplicationsTab: React.FC = () => {
  const { toast } = useToast();

  const [applications, setApplications] = useState<AdminProgramApplication[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [localSearch, setLocalSearch] = useState('');
  const debouncedSearch = useDebounce(localSearch, 300);

  const [selectedApp, setSelectedApp] = useState<AdminProgramApplication | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const [previewAppId, setPreviewAppId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchApplications = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const result = await portalProgramsService.listApplicationsAdmin({
          status: statusFilter || undefined,
          search: debouncedSearch || undefined,
          page,
          limit: 20,
        });
        setApplications(result.data);
        setPagination({
          page: result.pagination.page,
          totalPages: result.pagination.totalPages,
          total: result.pagination.total,
        });
      } catch {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load applications' });
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, debouncedSearch, toast]
  );

  useEffect(() => {
    fetchApplications(1);
  }, [fetchApplications]);

  const handleReview = async (action: 'approve' | 'reject', notes?: string) => {
    if (!selectedApp) return;
    setIsReviewing(true);
    try {
      await portalProgramsService.reviewApplication(selectedApp.id, action, notes);
      toast({
        title: action === 'approve' ? 'Application approved' : 'Application rejected',
      });
      setIsReviewDialogOpen(false);
      setSelectedApp(null);
      fetchApplications(pagination.page);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed',
        description: error?.response?.data?.message || 'Something went wrong',
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const fullName = (r: AdminProgramApplication['resident']) =>
    [r.firstName, r.middleName, r.lastName, r.extensionName].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['pending', 'approved', 'rejected', 'cancelled', ''] as const).map(s => (
            <Button
              key={s || 'all'}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
              className={cn(
                statusFilter === s
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'text-primary-600 border-primary-200 hover:bg-primary-50'
              )}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search by name..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500">
        {pagination.total} application{pagination.total !== 1 ? 's' : ''} found
      </p>

      {/* Applications list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiBookOpen size={40} className="mx-auto mb-3 opacity-50" />
          <p>No applications found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {applications.map(app => {
            const statusConf = STATUS_CONFIG[app.status];
            return (
              <Card
                key={app.id}
                className="cursor-pointer hover:border-primary-300 transition-colors"
                onClick={() => {
                  setSelectedApp(app);
                  if (app.status === 'pending') setIsReviewDialogOpen(true);
                }}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-heading-700">{fullName(app.resident)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {app.resident.barangay?.barangayName || '—'} ·{' '}
                      {new Date(app.appliedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-1.5">
                    <p className="text-sm font-medium text-heading-700">{app.program.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1 flex-wrap">
                        {app.program.types.map(t => (
                          <span key={t} className="text-xs bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded">
                            {TYPE_LABELS[t]}
                          </span>
                        ))}
                      </div>
                      {statusConf && (
                        <Badge className={cn('flex items-center gap-1 text-xs shrink-0', statusConf.className)}>
                          {statusConf.icon}
                          {statusConf.label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-600 border-gray-200 hover:bg-gray-50"
                      onClick={() => {
                        setPreviewAppId(app.id);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <FiEye size={14} className="mr-1" />
                      Preview
                    </Button>

                    {app.status === 'pending' && (
                      <Button
                        size="sm"
                        className="bg-primary-600 hover:bg-primary-700 text-white"
                        onClick={() => {
                          setSelectedApp(app);
                          setIsReviewDialogOpen(true);
                        }}
                      >
                        Review
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchApplications(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
          >
            <FiChevronLeft size={16} />
          </Button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchApplications(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
          >
            <FiChevronLeft size={16} className="rotate-180" />
          </Button>
        </div>
      )}

      {/* Resident Preview Dialog */}
      <ResidentPreviewDialog
        appId={previewAppId}
        open={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewAppId(null);
        }}
      />

      {/* Review Dialog */}
      <ReviewDialog
        application={selectedApp}
        open={isReviewDialogOpen}
        onClose={() => {
          setIsReviewDialogOpen(false);
          setSelectedApp(null);
        }}
        onReview={handleReview}
        isLoading={isReviewing}
      />
    </div>
  );
};
