import React, { useState } from 'react';
import { libreSakayService } from '@/services/api/libre-sakay.service';

type LookupField = 'residentId' | 'email';

export const VerificationSection: React.FC = () => {
  const [field, setField] = useState<LookupField>('residentId');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    exists: boolean;
    approved: boolean;
    resident_id: string | null;
    full_name: string | null;
    barangay_name: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await libreSakayService.verifyResident(trimmed);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <select
          value={field}
          onChange={e => {
            setField(e.target.value as LookupField);
            setInput('');
            setResult(null);
            setError(null);
          }}
          className="h-9 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="residentId">Resident ID</option>
          <option value="email">Email</option>
        </select>
        <input
          type={field === 'email' ? 'email' : 'text'}
          placeholder={
            field === 'residentId'
              ? 'Enter Resident ID (e.g. BRGN-2026-0010001)'
              : 'Enter Email (e.g. name@example.com)'
          }
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleVerify}
          disabled={loading || !input.trim()}
          className="h-9 px-4 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div
            className={`px-4 py-2 text-sm font-semibold text-white ${
              !result.exists
                ? 'bg-gray-400'
                : result.approved
                  ? 'bg-green-600'
                  : 'bg-orange-500'
            }`}
          >
            {!result.exists ? 'NOT FOUND' : result.approved ? 'VERIFIED' : 'NOT APPROVED'}
          </div>

          {/* Body */}
          <div className="bg-white px-4 py-3 text-sm">
            {!result.exists ? (
              <p className="text-gray-600">
                No resident found with {field === 'residentId' ? 'ID' : 'email'} &quot;{input.trim()}&quot;
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <span className="text-gray-500">Full Name</span>
                <span className="font-medium text-gray-900">{result.full_name ?? '—'}</span>

                <span className="text-gray-500">Resident ID</span>
                <span className="font-medium text-gray-900">{result.resident_id ?? '—'}</span>

                <span className="text-gray-500">Barangay</span>
                <span className="font-medium text-gray-900">{result.barangay_name ?? '—'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
