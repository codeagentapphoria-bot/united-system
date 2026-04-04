/**
 * PortalTrack.tsx
 *
 * Public transaction status tracker — no login required.
 * URL: /portal/track?ref=TXN-2026-XXXXXX
 *
 * Works for both resident-owned and guest transactions.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { PortalLayout } from '@/components/layout/PortalLayout';
import api from '@/services/api/auth.service';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiSearch,
  FiUser,
  FiXCircle,
} from 'react-icons/fi';

// ── Types ─────────────────────────────────────────────────────────────────
interface TrackedTransaction {
  transactionId:     string;
  referenceNumber:   string;
  status:            string | null;
  paymentStatus:     string;
  paymentAmount:     number;
  appointmentStatus: string | null;
  applicationDate:   string | null;
  createdAt:         string;
  updatedAt:         string;
  applicantName:     string;
  isGuest:           boolean;
  service: {
    id:          string;
    name:        string;
    code:        string;
    description: string | null;
  };
}

// ── Status helpers ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  PENDING:     { label: 'Pending',     icon: <FiClock size={16} />,       className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  PROCESSING:  { label: 'Processing',  icon: <FiClock size={16} />,       className: 'bg-blue-100 text-blue-800 border-blue-300' },
  FOR_RELEASE: { label: 'For Release', icon: <FiCheckCircle size={16} />, className: 'bg-green-100 text-green-800 border-green-300' },
  RELEASED:    { label: 'Released',    icon: <FiCheckCircle size={16} />, className: 'bg-green-200 text-green-900 border-green-400' },
  CANCELLED:   { label: 'Cancelled',   icon: <FiXCircle size={16} />,     className: 'bg-red-100 text-red-800 border-red-300' },
  REJECTED:    { label: 'Rejected',    icon: <FiXCircle size={16} />,     className: 'bg-red-100 text-red-800 border-red-300' },
};

const PAYMENT_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Payment Pending', className: 'bg-yellow-100 text-yellow-800' },
  PAID:    { label: 'Paid',            className: 'bg-green-100 text-green-800' },
  WAIVED:  { label: 'Waived',          className: 'bg-gray-100 text-gray-700' },
  FAILED:  { label: 'Payment Failed',  className: 'bg-red-100 text-red-800' },
};

const StatusBadge: React.FC<{ status?: string | null }> = ({ status }) => {
  const key = (status ?? '').toUpperCase();
  const config = STATUS_CONFIG[key] ?? {
    label:     key || 'Unknown',
    icon:      <FiFileText size={16} />,
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  };
  return (
    <Badge className={`flex items-center gap-1.5 text-sm px-3 py-1 border ${config.className}`}>
      {config.icon} {config.label}
    </Badge>
  );
};

// ── Timeline step ─────────────────────────────────────────────────────────
const STEPS = ['Submitted', 'Processing', 'For Release', 'Released'];
const stepIndex = (status?: string | null) => {
  const s = (status ?? '').toUpperCase();
  if (s === 'PROCESSING') return 1;
  if (s === 'FOR_RELEASE') return 2;
  if (s === 'RELEASED') return 3;
  return 0;
};

// ── Component ──────────────────────────────────────────────────────────────
export const PortalTrack: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [refInput, setRefInput]       = useState(searchParams.get('ref') ?? '');
  const [isLoading, setIsLoading]     = useState(false);
  const [result, setResult]           = useState<TrackedTransaction | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const handleSearch = async (ref: string) => {
    const cleaned = ref.trim().toUpperCase();
    if (!cleaned) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.get(`/transactions/track/${encodeURIComponent(cleaned)}`);
      setResult(response.data.data);
      setSearchParams({ ref: cleaned }, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.status === 404
          ? `No transaction found with reference number "${cleaned}". Please check and try again.`
          : err.response?.data?.message || 'Failed to retrieve transaction. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-search if ref is in URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setRefInput(ref);
      handleSearch(ref);
    }
  }, []);

  return (
    <PortalLayout>
      <div className="max-w-2xl mx-auto py-10 px-4">

        {/* Back */}
        <button
          onClick={() => navigate('/portal/e-government')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <FiArrowLeft size={14} /> Back to Services
        </button>

        <h1 className="text-2xl font-bold text-heading-700 mb-2 flex items-center gap-2">
          <FiSearch className="text-primary-600" /> Track Application
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Enter your reference number to check the status of your application.
        </p>

        {/* Search */}
        <div className="flex gap-2 mb-8">
          <Input
            placeholder="e.g. BC-2026-000001"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(refInput)}
            className="font-mono"
          />
          <Button
            onClick={() => handleSearch(refInput)}
            disabled={isLoading || !refInput.trim()}
            className="bg-primary-600 hover:bg-primary-700 shrink-0"
          >
            {isLoading ? 'Searching…' : 'Track'}
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="py-4 flex items-start gap-3 text-red-700">
              <FiAlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-lg">{result.service.name}</CardTitle>
                  <p className="font-mono text-sm text-primary-600 mt-0.5">{result.referenceNumber}</p>
                </div>
                <StatusBadge status={result.status} />
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Progress tracker */}
              {result.status && !['CANCELLED', 'REJECTED'].includes(result.status.toUpperCase()) && (
                <div className="flex items-center gap-1">
                  {STEPS.map((step, i) => {
                    const current = stepIndex(result.status);
                    const done    = i <= current;
                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center gap-1 flex-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                              ${done ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'}`}
                          >
                            {i + 1}
                          </div>
                          <span className={`text-xs text-center leading-tight ${done ? 'text-primary-700 font-medium' : 'text-gray-400'}`}>
                            {step}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`h-0.5 flex-1 -mt-4 ${i < current ? 'bg-primary-500' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              <Separator />

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Applicant</p>
                  <p className="font-medium text-heading-700 flex items-center gap-1">
                    <FiUser size={12} className="text-gray-400" /> {result.applicantName}
                    {result.isGuest && (
                      <Badge className="text-xs bg-gray-100 text-gray-600 ml-1">Guest</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Service Code</p>
                  <p className="font-mono font-medium">{result.service.code}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment</p>
                  <Badge className={`text-xs ${PAYMENT_CONFIG[result.paymentStatus?.toUpperCase()]?.className ?? 'bg-gray-100 text-gray-700'}`}>
                    {PAYMENT_CONFIG[result.paymentStatus?.toUpperCase()]?.label ?? result.paymentStatus}
                  </Badge>
                </div>
                {result.paymentAmount > 0 && (
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="font-medium">₱{Number(result.paymentAmount).toFixed(2)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Date Applied</p>
                  <p className="font-medium flex items-center gap-1">
                    <FiCalendar size={11} className="text-gray-400" />
                    {new Date(result.applicationDate ?? result.createdAt).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Updated</p>
                  <p className="font-medium">
                    {new Date(result.updatedAt).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>

              {result.service.description && (
                <>
                  <Separator />
                  <p className="text-xs text-gray-500">{result.service.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PortalLayout>
  );
};
