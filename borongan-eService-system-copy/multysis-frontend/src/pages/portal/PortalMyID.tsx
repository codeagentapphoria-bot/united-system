/**
 * PortalMyID.tsx
 *
 * Resident portal page: view and download personal Resident ID card.
 * Shows QR code linking to public profile.
 */

import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000';

export const PortalMyID: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  const resident = user as any;

  // Redirect if not logged in or pending
  if (!resident) {
    navigate('/portal/login');
    return null;
  }

  const isActive = resident.status === 'active';
  const hasResidentId = !!resident.residentId;

  const fullName = [
    resident.firstName,
    resident.middleName ? resident.middleName.charAt(0) + '.' : '',
    resident.lastName,
    resident.extensionName || '',
  ].filter(Boolean).join(' ');

  const birthdate = resident.birthdate
    ? new Date(resident.birthdate).toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  // QR encodes the portal registration-status URL (publicly accessible, no auth required).
  // Previously pointed to a non-existent /api/public/:id/resident/public-qr endpoint.
  const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || window.location.origin;
  const qrValue = resident.username
    ? `${PORTAL_URL}/portal/register/status?username=${encodeURIComponent(resident.username)}`
    : '';

  // Download as PDF (triggers browser print dialog for the card div)
  const handleDownload = () => {
    const printContent = cardRef.current?.innerHTML;
    if (!printContent) return;

    const win = window.open('', '_blank');
    if (!win) {
      toast({ variant: 'destructive', title: 'Pop-up blocked', description: 'Please allow pop-ups to download your ID.' });
      return;
    }
    win.document.write(`
      <html><head><title>Resident ID</title>
      <style>
        body { margin: 0; font-family: sans-serif; }
        .id-card { width: 85.6mm; height: 54mm; border: 1px solid #ccc; padding: 8px; box-sizing: border-box; position: relative; overflow: hidden; }
        @media print { body { margin: 0; } @page { size: 85.6mm 54mm; margin: 0; } }
      </style>
      </head><body>${printContent}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="max-w-sm mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">My Resident ID</h1>
        {isActive && hasResidentId && (
          <Button size="sm" onClick={handleDownload}>
            Download / Print
          </Button>
        )}
      </div>

      {!isActive && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-800">
              Your Resident ID will be available once your registration is approved.
            </p>
          </CardContent>
        </Card>
      )}

      {isActive && !hasResidentId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-800">
              Your account is approved. Your Resident ID is being generated.
            </p>
          </CardContent>
        </Card>
      )}

      {isActive && hasResidentId && (
        <div ref={cardRef}>
          {/* ID Card — CR80 proportions */}
          <div className="id-card border rounded-lg overflow-hidden shadow-lg bg-white" style={{ aspectRatio: '1.586', width: '100%' }}>
            <div className="flex h-full">
              {/* Left: photo */}
              <div className="w-28 bg-primary-50 flex items-center justify-center border-r">
                {resident.picturePath ? (
                  <img
                    src={resident.picturePath?.startsWith('http') ? resident.picturePath : `${BACKEND_URL}/${resident.picturePath?.startsWith('/') ? resident.picturePath.slice(1) : resident.picturePath}`}
                    alt="Photo"
                    className="w-24 h-24 object-cover rounded"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-3xl">
                    {(resident.firstName || 'R').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Right: info */}
              <div className="flex-1 p-3 flex flex-col justify-between">
                {/* Header */}
                <div className="text-center border-b pb-1 mb-1">
                  <p className="text-xs font-bold text-primary uppercase tracking-wide">
                    {resident.barangay?.municipality?.name || 'Local Government Unit'}
                  </p>
                  <p className="text-xs text-gray-500">{resident.barangay?.name || 'Barangay'}</p>
                  <p className="text-xs text-gray-400">RESIDENT IDENTIFICATION CARD</p>
                </div>

                {/* Name + ID */}
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm leading-tight">{fullName}</p>
                  <p className="text-xs text-gray-500 mb-1">{birthdate}</p>
                  <p className="font-mono text-xs bg-gray-100 rounded px-1 py-0.5 inline-block text-primary font-bold">
                    {resident.residentId}
                  </p>
                </div>

                {/* QR */}
                <div className="flex justify-end">
                  {qrValue && (
                    <QRCodeSVG
                      value={qrValue}
                      size={56}
                      level="M"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Present this ID to access barangay and municipal government services.
      </p>
    </div>
  );
};
