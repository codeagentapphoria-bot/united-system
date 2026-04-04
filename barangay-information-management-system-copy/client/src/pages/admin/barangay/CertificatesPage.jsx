/**
 * CertificatesPage.jsx  (AC3)
 *
 * Barangay admin page — unified certificate request queue.
 *
 * Shows both sources in one list:
 *   • Walk-in   — submitted at the barangay counter (requests table, type='certificate')
 *   • Portal    — submitted online by residents     (transactions table, Barangay Certificate category)
 *
 * Per-row actions:
 *   Generate PDF  → POST /api/certificates/generate/request/:id   (walk-in)
 *                   POST /api/certificates/generate/transaction/:id (portal)
 *   Update status → PUT  /api/certificates/queue/walkin/:id/status
 *                   PUT  /api/certificates/queue/portal/:id/status
 *
 * Route: /admin/barangay/certificates
 */

import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import useAuth from '@/hooks/useAuth';
import { getToken } from '@/constants/token';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Maximize2, Minimize2, Printer, Download, ScanLine, UserPlus, Eye } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const BIMS_API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// ── Certificate type display labels ──────────────────────────────────────────
const CERT_TYPE_LABELS = {
  barangay_clearance:    'Barangay Clearance',
  indigency:             'Certificate of Indigency',
  residency:             'Certificate of Residency',
  good_moral:            'Good Moral Character',
  solo_parent:           'Solo Parent Certificate',
  low_income:            'Certificate of Low Income',
  burial_assistance:     'Burial Assistance Certificate',
  cohabitation:          'Cohabitation Certificate',
  first_time_job_seeker: 'First Time Job Seeker Certificate',
  // Fallback for old walk-in requests that only stored 'certificate'
  certificate:           'Certificate',
};

// ── Walk-in status options ────────────────────────────────────────────────────
const WALKIN_STATUSES = ['pending', 'approved', 'rejected', 'completed'];

// ── Portal status options ─────────────────────────────────────────────────────
const PORTAL_STATUSES = ['PENDING', 'PROCESSING', 'FOR_RELEASE', 'RELEASED', 'CANCELLED', 'REJECTED'];

// ── Status display config ─────────────────────────────────────────────────────
const STATUS_STYLE = {
  // Walk-in
  pending:   'bg-yellow-100 text-yellow-800',
  approved:  'bg-blue-100   text-blue-800',
  rejected:  'bg-red-100    text-red-800',
  completed: 'bg-green-100  text-green-800',
  // Portal
  PENDING:     'bg-yellow-100 text-yellow-800',
  PROCESSING:  'bg-blue-100   text-blue-800',
  FOR_RELEASE: 'bg-purple-100 text-purple-800',
  RELEASED:    'bg-green-100  text-green-800',
  CANCELLED:   'bg-gray-100   text-gray-600',
  REJECTED:    'bg-red-100    text-red-800',
};

const statusLabel = (s) =>
  (s ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ── Source badge ──────────────────────────────────────────────────────────────
const SourceBadge = ({ source }) =>
  source === 'portal' ? (
    <Badge className="bg-indigo-100 text-indigo-700 text-xs">Portal</Badge>
  ) : (
    <Badge className="bg-orange-100 text-orange-700 text-xs">Walk-in</Badge>
  );

// ── Walk-in certificate type options ─────────────────────────────────────────
const CERT_TYPE_OPTIONS = [
  { value: 'barangay_clearance', label: 'Barangay Clearance' },
  { value: 'residency',          label: 'Certificate of Residency' },
  { value: 'indigency',          label: 'Certificate of Indigency' },
  { value: 'good_moral',         label: 'Good Moral Character' },
  { value: 'business_clearance', label: 'Business Clearance' },
];

// ── Walk-in request modal ─────────────────────────────────────────────────────
const WALKIN_SCANNER_ID = 'qr-reader-walkin';

const walkinScannerCss = `
  #${WALKIN_SCANNER_ID} { width:100% !important; border:none !important; }
  #${WALKIN_SCANNER_ID} video { width:100% !important; height:100% !important; object-fit:cover !important; }
  #${WALKIN_SCANNER_ID} img { display:none !important; }
  #${WALKIN_SCANNER_ID}__scan_region { background:transparent !important; }
  #${WALKIN_SCANNER_ID}__dashboard { display:none !important; }
`;

const WalkinModal = ({ open, onClose, barangayId, onSuccess }) => {
  const { toast }     = useToast();
  const qrRef         = useRef(null);
  const scanStartedRef = useRef(false);

  const [step,          setStep]         = useState('scan'); // 'scan' | 'form'
  const [searchLoading, setSearchLoading] = useState(false);
  const [manualId,      setManualId]     = useState('');
  const [resident,      setResident]     = useState(null);
  const [submitting,    setSubmitting]   = useState(false);
  const [form,          setForm]         = useState({ certificateType: '', urgency: 'normal', purpose: '' });

  // Auto-start scanner once dialog is fully open
  useEffect(() => {
    if (open && step === 'scan') {
      // Delay lets Radix Dialog finish its open animation before touching the DOM
      const t = setTimeout(() => { if (open) startScanner(); }, 350);
      return () => clearTimeout(t);
    }
  }, [open, step]);

  // Full cleanup when modal closes or unmounts
  useEffect(() => {
    if (!open) {
      stopScanner();
      setStep('scan');
      setManualId('');
      setResident(null);
      setForm({ certificateType: '', urgency: 'normal', purpose: '' });
    }
  }, [open]);

  const stopScanner = async () => {
    scanStartedRef.current = false;
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch {}
      try { await qrRef.current.clear(); } catch {}
      qrRef.current = null;
    }
    // Clear any leftover DOM from the library
    const el = document.getElementById(WALKIN_SCANNER_ID);
    if (el) el.innerHTML = '';
  };

  const startScanner = () => {
    if (scanStartedRef.current) return;
    const el = document.getElementById(WALKIN_SCANNER_ID);
    if (!el) return;

    scanStartedRef.current = true;
    const qr = new Html5Qrcode(WALKIN_SCANNER_ID);
    qrRef.current = qr;

    qr.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 200, height: 200 } },
      (decodedText) => { handleLookup(decodedText, true); },
      () => {}
    ).catch(() => {
      scanStartedRef.current = false;
      toast({ variant: 'destructive', title: 'Camera error', description: 'Could not access camera. Use manual entry below.' });
    });
  };

  const handleLookup = async (rawId, isQr = false) => {
    await stopScanner();

    // QR codes are base64-encoded resident IDs
    let residentId = rawId.trim();
    if (isQr) {
      try { residentId = atob(residentId); } catch {}
    }

    setSearchLoading(true);
    try {
      const res = await apiClient.get(`/public/${residentId}/resident/public-qr`);
      const data = res.data.data;
      if (!data?.resident_id) throw new Error('Not found');

      if (barangayId && String(data.barangay_id) !== String(barangayId)) {
        toast({
          variant: 'destructive',
          title: 'Wrong barangay',
          description: 'This resident is not registered in this barangay.',
        });
        // Restart scanner so they can try again
        setTimeout(() => { if (open) startScanner(); }, 300);
        return;
      }

      setResident(data);
      setStep('form');
      toast({ title: 'Resident found', description: data.full_name });
    } catch {
      toast({ variant: 'destructive', title: 'Not found', description: 'No resident matches this ID.' });
      // Restart scanner on failure
      setTimeout(() => { if (open) startScanner(); }, 300);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleManualSearch = () => {
    if (!manualId.trim()) return;
    handleLookup(manualId.trim(), false);
  };

  const handleSubmit = async () => {
    if (!form.certificateType || !form.purpose.trim()) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Certificate type and purpose are required.' });
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/public/requests/certificate', {
        residentId:      resident.id,
        barangayId:      resident.barangay_id,
        certificateType: form.certificateType,
        urgency:         form.urgency,
        purpose:         form.purpose,
      });
      toast({ title: 'Request submitted', description: 'Walk-in certificate request has been created.' });
      onSuccess();
      onClose();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Submit failed', description: err.response?.data?.message || err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        {/* Scoped styles for the Html5Qrcode library */}
        <style dangerouslySetInnerHTML={{ __html: walkinScannerCss }} />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> New Walk-in Request
          </DialogTitle>
          <DialogDescription>
            {step === 'scan'
              ? "Point the camera at the resident's ID card QR code, or enter the ID manually."
              : 'Fill in the certificate details.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'scan' ? (
          <div className="space-y-3">
            {/* Manual ID input */}
            <div className="flex gap-2">
              <Input
                placeholder="Enter Resident ID manually…"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                disabled={searchLoading}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleManualSearch}
                disabled={!manualId.trim() || searchLoading}
              >
                Search
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex-1 h-px bg-gray-200" />
              or scan QR code below
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Camera viewport — Html5Qrcode renders into this div */}
            <div
              id={WALKIN_SCANNER_ID}
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ height: '260px' }}
            />

            {searchLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-1">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                Looking up resident…
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resident info — read-only */}
            <div className="bg-gray-50 rounded-lg p-4 border space-y-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Resident</p>
              <p className="font-semibold text-gray-800">{resident?.full_name}</p>
              <p className="text-sm text-gray-500">
                {resident?.resident_id} · {resident?.barangay}
              </p>
            </div>

            {/* Certificate type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Certificate Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.certificateType}
                onValueChange={(v) => setForm((f) => ({ ...f, certificateType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select certificate type…" />
                </SelectTrigger>
                <SelectContent>
                  {CERT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Urgency */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Urgency</label>
              <Select
                value={form.urgency}
                onValueChange={(v) => setForm((f) => ({ ...f, urgency: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal (1–2 days)</SelectItem>
                  <SelectItem value="urgent">Urgent (Same day)</SelectItem>
                  <SelectItem value="express">Express (2–3 hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]"
                placeholder="State the purpose of the certificate…"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setStep('scan'); setResident(null); }}
                disabled={submitting}
              >
                ← Rescan
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Detail drawer component ───────────────────────────────────────────────────
const RequestDetail = ({ item, onClose, onStatusUpdated }) => {
  const { toast }     = useToast();
  const queryClient   = useQueryClient();
  const [generating,  setGenerating]  = useState(false);
  const [maximized,   setMaximized]   = useState(false);

  const isWalkin = item.source === 'walkin';
  const statuses = isWalkin ? WALKIN_STATUSES : PORTAL_STATUSES;

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: (newStatus) => {
      const url = isWalkin
        ? `/certificates/queue/walkin/${item.source_id}/status`
        : `/certificates/queue/portal/${item.source_id}/status`;
      return apiClient.put(url, { status: newStatus }).then((r) => r.data);
    },
    onSuccess: (_, newStatus) => {
      toast({ title: 'Status updated' });
      onStatusUpdated(newStatus);
      queryClient.invalidateQueries(['certificate-queue']);
    },
    onError: (err) =>
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err.response?.data?.message || err.message,
      }),
  });

  // Build preview URL (no auth needed — returns HTML)
  const previewUrl = item.certificate_type && item.certificate_type !== 'certificate'
    ? isWalkin
      ? `${BIMS_API}/certificates/preview/request/${item.source_id}?certificateType=${item.certificate_type}`
      : `${BIMS_API}/certificates/preview/transaction/${item.source_id}?certificateType=${item.certificate_type}`
    : null;

  // PDF download — POSTs to generate endpoint with Bearer token
  const handleDownload = async () => {
    setGenerating(true);
    try {
      const url = isWalkin
        ? `${BIMS_API}/certificates/generate/request/${item.source_id}`
        : `${BIMS_API}/certificates/generate/transaction/${item.source_id}`;

      const token = getToken();
      const resp = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ certificateType: item.certificate_type }),
      });

      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}));
        throw new Error(json.message || 'PDF generation failed');
      }

      const blob      = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a         = document.createElement('a');
      a.href          = objectUrl;
      a.download      = `${item.certificate_type}_${item.source_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);

      toast({ title: 'Certificate downloaded' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Download failed', description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  // Print — fetches the certificate HTML, writes it into a hidden same-origin
  // iframe (avoids cross-origin block), waits for all images to load, then
  // triggers the browser's native print dialog inline (no new tab).
  const handlePrint = async () => {
    if (!previewUrl) return;
    try {
      const html = await fetch(previewUrl).then((r) => r.text());

      // A4 dimensions off-screen — real size ensures images actually load
      const frame = document.createElement('iframe');
      frame.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:794px;height:1123px;border:none;visibility:hidden;';
      document.body.appendChild(frame);

      frame.contentDocument.open();
      frame.contentDocument.write(html);
      frame.contentDocument.close();

      // Wait for every <img> to finish loading before opening the print dialog
      const images = Array.from(frame.contentDocument.querySelectorAll('img'));
      await Promise.all(
        images.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; })
        )
      );

      frame.contentWindow.focus();
      frame.contentWindow.print();
      setTimeout(() => document.body.removeChild(frame), 2000);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Print failed', description: err.message });
    }
  };

  const certLabel =
    CERT_TYPE_LABELS[item.certificate_type] || item.service_name || item.certificate_type;

  return (
    <>
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <DialogTitle className="text-sm font-semibold leading-none truncate">
              {item.applicant_name}
            </DialogTitle>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{certLabel}</p>
          </div>
          <SourceBadge source={item.source} />
        </div>
        <div className="flex items-center gap-2 mr-6">
          {maximized && (
            <>
              <Button size="sm" variant="outline" onClick={handlePrint} disabled={!previewUrl} className="gap-1.5">
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={generating || !previewUrl} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                {generating ? 'Generating…' : 'Download'}
              </Button>
            </>
          )}
          <button
            onClick={() => setMaximized((v) => !v)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
            title={maximized ? 'Restore panel' : 'Maximize preview'}
          >
            {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — details + actions (hidden when maximized) */}
        {!maximized && (
          <div className="w-72 shrink-0 border-r flex flex-col overflow-y-auto bg-white">
            <div className="p-5 space-y-5 flex-1">

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Purpose</p>
                  <p className="text-gray-700">{item.purpose || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Date Submitted</p>
                  <p className="text-gray-700">
                    {new Date(item.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                  <Badge className={`text-xs ${STATUS_STYLE[item.status_col] ?? 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel(item.status_col)}
                  </Badge>
                </div>
                {item.payment_status && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Payment</p>
                    <p className="text-gray-700">{statusLabel(item.payment_status)}</p>
                  </div>
                )}
              </div>

              {/* Update status */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {statuses
                    .filter((s) => s.toLowerCase() !== (item.status_col ?? '').toLowerCase())
                    .map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate(s)}
                      >
                        → {statusLabel(s)}
                      </Button>
                    ))}
                </div>
              </div>

            </div>

            {/* Action buttons pinned to bottom */}
            <div className="p-5 border-t space-y-2 shrink-0">
              <Button className="w-full gap-2" variant="outline" onClick={handlePrint} disabled={!previewUrl}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button className="w-full gap-2" onClick={handleDownload} disabled={generating || !previewUrl}>
                <Download className="h-4 w-4" />
                {generating ? 'Generating…' : 'Download'}
              </Button>
              {!previewUrl && (
                <p className="text-xs text-orange-600 text-center">
                  Certificate type not set — preview unavailable.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Right panel — iframe preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="Certificate Preview"
              className="flex-1 border-0 w-full"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-400">No preview available</p>
                <p className="text-xs text-gray-400 mt-1">Certificate type not specified.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CertificatesPage() {
  const { user }        = useAuth();
  const { toast }       = useToast();
  const queryClient     = useQueryClient();

  const [page,         setPage]         = useState(1);
  const [perPage,      setPerPage]      = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selected,     setSelected]     = useState(null);  // currently open detail
  const [localStatus,  setLocalStatus]  = useState({});    // optimistic status updates
  const [walkinOpen,   setWalkinOpen]   = useState(false);

  const barangayId = user?.target_id;

  // ── Fetch queue ─────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ['certificate-queue', barangayId, statusFilter, sourceFilter, page, perPage],
    queryFn: () =>
      apiClient
        .get('/certificates/queue', {
          params: {
            barangayId,
            status:  statusFilter,
            source:  sourceFilter,
            page,
            perPage,
          },
        })
        .then((r) => r.data),
    enabled: !!barangayId,
    keepPreviousData: true,
  });

  const items      = data?.data         ?? [];
  const pagination = data?.pagination   ?? { total: 0, totalPages: 1 };

  // Merge optimistic status overrides
  const displayItems = items.map((item) =>
    localStatus[item.source_id]
      ? { ...item, status_col: localStatus[item.source_id] }
      : item
  );

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Certificate Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Unified queue — walk-in counter requests and portal submissions for this barangay.
          </p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setWalkinOpen(true)}>
          <UserPlus className="h-4 w-4" /> Walk-in
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="walkin">Walk-in</SelectItem>
            <SelectItem value="portal">Portal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="FOR_RELEASE">For Release</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="RELEASED">Released</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-gray-400 ml-auto">
          {pagination.total} request{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
          ) : isError ? (
            <div className="py-16 text-center text-red-500 text-sm">
              Failed to load queue. Check that the BIMS server is running.
            </div>
          ) : displayItems.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500 font-medium">No certificate requests found</p>
              <p className="text-sm text-gray-400 mt-1">
                {statusFilter !== 'all' || sourceFilter !== 'all'
                  ? 'Try clearing the filters.'
                  : 'Walk-in requests and portal submissions will appear here.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Certificate Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayItems.map((item) => (
                  <TableRow key={`${item.source}-${item.source_id}`}>
                    <TableCell className="font-medium">
                      {item.applicant_name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {CERT_TYPE_LABELS[item.certificate_type] ||
                        item.service_name ||
                        item.certificate_type ||
                        '—'}
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={item.source} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                      {item.purpose || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs ${STATUS_STYLE[item.status_col] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {statusLabel(item.status_col)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelected(item); setLocalStatus({}); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-xs sm:text-sm text-gray-500">
          Page {page} of {pagination.totalPages || 1}
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-xs sm:text-sm"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (pagination.totalPages || 1)}
            onClick={() => setPage((p) => p + 1)}
            className="text-xs sm:text-sm"
          >
            Next
          </Button>
        </div>
        <select
          className="w-full sm:w-24 border rounded px-2 py-1 text-xs sm:text-sm"
          value={perPage}
          onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {/* Request detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 sm:p-0 gap-0 overflow-hidden">
          {selected && (
            <RequestDetail
              item={
                localStatus[selected.source_id]
                  ? { ...selected, status_col: localStatus[selected.source_id] }
                  : selected
              }
              onClose={() => setSelected(null)}
              onStatusUpdated={(newStatus) =>
                setLocalStatus((prev) => ({ ...prev, [selected.source_id]: newStatus }))
              }
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Walk-in request modal */}
      <WalkinModal
        open={walkinOpen}
        onClose={() => setWalkinOpen(false)}
        barangayId={barangayId}
        onSuccess={() => queryClient.invalidateQueries(['certificate-queue'])}
      />
    </div>
  );
}
