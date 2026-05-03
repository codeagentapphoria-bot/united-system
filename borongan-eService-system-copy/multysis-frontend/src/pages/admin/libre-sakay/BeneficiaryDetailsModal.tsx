import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiUser, FiCreditCard, FiMapPin, FiPhone, FiAlertCircle, FiX, FiFile } from 'react-icons/fi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { libreSakayBeneficiaryService } from '@/services/api/libre-sakay-beneficiary.service';
import type { BeneficiaryDetails } from '@/services/api/libre-sakay-beneficiary.service';
import queryKeys from '@/lib/query-keys';

interface BeneficiaryDetailsModalProps {
  id: string | null;
  open: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  SENIOR_CITIZEN: 'Senior Citizen',
  PWD: 'PWD',
  STUDENT: 'Student',
  SOLO_PARENT: 'Solo Parent',
};

const ENROLLMENT_STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

const APPLICATION_STATUS_STYLES: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

function fmt(v: string | null | undefined, fallback = '—') {
  return v ?? fallback;
}

/** Renders any submittedData value — handles nested name objects, arrays, etc. */
function renderValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  // Nested name object e.g. { firstName, middleName, lastName, extension }
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).firstName !== undefined
  ) {
    const v = value as Record<string, unknown>;
    const parts = [
      v.firstName as string | undefined,
      v.middleName as string | undefined,
      v.lastName as string | undefined,
      v.extensionName as string | undefined,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  }
  // Generic object — try JSON stringify, fall back to placeholder
  try {
    const str = JSON.stringify(value);
    return str === '{}' || str === 'null' ? '—' : str;
  } catch {
    return '—';
  }
}

export function BeneficiaryDetailsModal({ id, open, onClose }: BeneficiaryDetailsModalProps) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.libreSakay.beneficiaries.detail(id!),
    queryFn: () => libreSakayBeneficiaryService.getById(id!),
    enabled: !!id && open,
  });

  useEffect(() => {
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to load beneficiary details' });
    }
  }, [error, toast]);

  const b = data;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary-600">
            Beneficiary Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
            Loading…
          </div>
        ) : !b ? null : (
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="application">Application</TabsTrigger>
              <TabsTrigger value="rides">Rides</TabsTrigger>
              <TabsTrigger value="attachments">Attachments</TabsTrigger>
            </TabsList>

            {/* ── INFO TAB ─────────────────────────────────────────── */}
            <TabsContent value="info" className="mt-4 space-y-4">
              {/* Identity header */}
              <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-lg border border-primary-100">
                <div className="w-16 h-16 rounded-full bg-white border-2 border-primary-200 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                  {b.picturePath ? (
                    <img src={b.picturePath} alt={b.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <FiUser size={28} className="text-primary-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{b.fullName}</p>
                  <p className="text-xs font-mono text-primary-600 mt-0.5">{b.residentIdNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{b.barangay}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      ENROLLMENT_STATUS_STYLES[b.enrollmentStatus] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {b.enrollmentStatus.charAt(0) + b.enrollmentStatus.slice(1).toLowerCase()}
                  </span>
                  {b.suspendedAt && (
                    <span className="text-xs text-gray-400">
                      Suspended {new Date(b.suspendedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      APPLICATION_STATUS_STYLES[b.applicationStatus] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {b.applicationStatus.charAt(0) + b.applicationStatus.slice(1).toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Personal info grid */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Personal Information</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100 text-sm">
                  <div className="grid grid-cols-2">
                    <div className="flex flex-col px-4 py-3 border-r border-gray-100">
                      <span className="text-xs text-gray-500">Category</span>
                      <span className="font-medium mt-0.5">{CATEGORY_LABELS[b.category] ?? b.category}</span>
                    </div>
                    <div className="flex flex-col px-4 py-3">
                      <span className="text-xs text-gray-500">Sex</span>
                      <span className="font-medium mt-0.5">{fmt(b.sex)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2">
                    <div className="flex flex-col px-4 py-3 border-r border-gray-100">
                      <span className="text-xs text-gray-500">Date of Birth</span>
                      <span className="font-medium mt-0.5">
                        {b.birthdate
                          ? new Date(b.birthdate).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col px-4 py-3">
                      <span className="text-xs text-gray-500">Contact Number</span>
                      <span className="font-medium mt-0.5">{fmt(b.contactNumber)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col px-4 py-3">
                    <span className="text-xs text-gray-500">Address</span>
                    <span className="font-medium mt-0.5">{renderValue(b.address)}</span>
                  </div>
                </div>
              </div>

              {/* Pass info */}
              {b.passNumber && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Libre Sakay Pass</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100 text-sm">
                    <div className="grid grid-cols-2">
                      <div className="flex flex-col px-4 py-3 border-r border-gray-100">
                        <span className="text-xs text-gray-500">Pass Number</span>
                        <span className="font-medium mt-0.5 font-mono">{b.passNumber}</span>
                      </div>
                      <div className="flex flex-col px-4 py-3">
                        <span className="text-xs text-gray-500">Expiry</span>
                        <span className="font-medium mt-0.5">
                          {b.passExpiry
                            ? new Date(b.passExpiry).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                              })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency contact */}
              {b.emergencyContactName && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Emergency Contact</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100 text-sm">
                    <div className="grid grid-cols-2">
                      <div className="flex flex-col px-4 py-3 border-r border-gray-100">
                        <span className="text-xs text-gray-500">Name</span>
                        <span className="font-medium mt-0.5">{b.emergencyContactName}</span>
                      </div>
                      <div className="flex flex-col px-4 py-3">
                        <span className="text-xs text-gray-500">Phone</span>
                        <span className="font-medium mt-0.5">{fmt(b.emergencyContactPhone)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── APPLICATION TAB ─────────────────────────────────── */}
            <TabsContent value="application" className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Application Details</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100 text-sm">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-500">Status</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        APPLICATION_STATUS_STYLES[b.applicationStatus] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {b.applicationStatus.charAt(0) + b.applicationStatus.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-500">Applied</span>
                    <span className="font-medium">
                      {new Date(b.appliedAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-500">Reviewed</span>
                    <span className="font-medium">
                      {b.reviewedAt
                        ? new Date(b.reviewedAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-500">Enrolled</span>
                    <span className="font-medium">
                      {new Date(b.enrolledAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {b.adminNotes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Admin Notes</p>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
                    {b.adminNotes}
                  </div>
                </div>
              )}

              {b.submittedData && Object.keys(b.submittedData).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Submitted Data</p>
                  <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100 text-sm">
                    {Object.entries(b.submittedData).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between px-4 py-3">
                        <span className="text-gray-500 text-xs capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-right">{renderValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ── RIDES TAB ───────────────────────────────────────── */}
            <TabsContent value="rides" className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ride Summary</p>
                <div className="rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100 text-sm">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-500">Total Rides</span>
                    <span className="font-semibold text-primary-700">{b.totalRides}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-gray-500">Last Ride</span>
                    <span className="font-medium">
                      {b.lastRideDate
                        ? new Date(b.lastRideDate).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })
                        : 'No rides yet'}
                    </span>
                  </div>
                </div>
              </div>

              {b.totalRides === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <FiAlertCircle className="text-3xl" />
                  <p className="text-sm font-medium">No rides recorded</p>
                  <p className="text-xs">This beneficiary has not used the Libre Sakay service yet.</p>
                </div>
              )}
            </TabsContent>

            {/* ── ATTACHMENTS TAB ────────────────────────────────── */}
            <TabsContent value="attachments" className="mt-4 space-y-4">
              {Array.isArray(b.attachments) && b.attachments.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submitted Documents</p>
                  {b.attachments.map((att, i) => (
                    <button
                      key={i}
                      onClick={() => setPreviewUrl(att.url)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm text-left"
                    >
                      <FiCreditCard className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">{att.label ?? 'Document'}</span>
                      <span className="ml-auto text-xs text-gray-400">View</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <FiAlertCircle className="text-3xl" />
                  <p className="text-sm font-medium">No attachments</p>
                  <p className="text-xs">No documents were submitted with this application.</p>
                </div>
              )}

              {/* ── INLINE FILE PREVIEW ──────────────────────────────── */}
              {previewUrl && (
                <div className="relative rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
                    <span className="text-xs font-medium text-gray-600">Preview</span>
                    <button
                      onClick={() => setPreviewUrl(null)}
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      <FiX size={14} className="text-gray-500" />
                    </button>
                  </div>
                  {/\.(jpg|jpeg|png|gif|webp)$/i.test(previewUrl) ? (
                    <div className="flex justify-center p-4 bg-gray-50">
                      <img
                        src={previewUrl}
                        alt="Attachment preview"
                        className="max-h-96 rounded object-contain"
                      />
                    </div>
                  ) : /\.(pdf)$/i.test(previewUrl) ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-96"
                      title="Attachment preview"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-400">
                      <FiFile size={32} />
                      <p className="text-sm">Preview not available for this file type</p>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline"
                      >
                        Open in new tab →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
