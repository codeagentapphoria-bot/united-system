import React, { useState } from 'react';
import { FiFile, FiX, FiZoomIn } from 'react-icons/fi';
import { cn } from '@/lib/utils';
import type { ApplicationAttachment } from '@/services/api/portal-programs.service';

// Fixes URLs where the backend stored an absolute filesystem path instead of a
// relative URL. Handles both backslash and forward-slash Windows paths.
// e.g. "http://localhost:3000/C:\Users\...\uploads\foo.jpg"
//   → "http://localhost:3000/uploads/foo.jpg"
export const fixAttachmentUrl = (url: string): string => {
  // Normalise backslashes first so we can search for /uploads/ uniformly
  const s = url.replace(/\\/g, '/');
  const uploadsIdx = s.indexOf('/uploads/');
  if (uploadsIdx === -1) return s;
  // Only fix if there's a Windows drive letter before /uploads/
  const before = s.slice(0, uploadsIdx);
  if (!/\/[A-Za-z]:/.test(before)) return s;
  const baseMatch = s.match(/^https?:\/\/[^/]+/);
  return baseMatch ? baseMatch[0] + s.slice(uploadsIdx) : s;
};

// ---------------------------------------------------------------------------
// Lightbox — shown when an image thumbnail is clicked
// ---------------------------------------------------------------------------

interface LightboxProps {
  url: string;
  label: string;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ url, label, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
    <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between bg-black/60 px-4 py-2 rounded-t-lg">
        <p className="text-white text-sm font-medium truncate">{label}</p>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors ml-4 shrink-0">
          <FiX size={20} />
        </button>
      </div>
      {/* Image */}
      <img src={url} alt={label} className="w-full max-h-[80vh] object-contain rounded-b-lg bg-black" />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// AttachmentGrid
// ---------------------------------------------------------------------------

interface AttachmentGridProps {
  attachments: ApplicationAttachment[];
  /** Called when an image thumbnail is clicked — parent manages the lightbox state */
  onImageClick?: (url: string, label: string) => void;
}

export const AttachmentGrid: React.FC<AttachmentGridProps> = ({ attachments, onImageClick }) => {
  if (!attachments.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {attachments.map((att, i) => {
        const url = fixAttachmentUrl(att.url);
        const isImage = att.mimetype?.startsWith('image/');
        const isPdf = att.mimetype === 'application/pdf';
        const ext = att.filename.split('.').pop()?.toUpperCase() ?? 'FILE';

        const footer = (
          <div className="px-2.5 py-2 bg-white border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-700 truncate">{att.label}</p>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              {att.filename} · {(att.size / 1024).toFixed(0)} KB
            </p>
          </div>
        );

        if (isImage) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onImageClick?.(url, att.label)}
              className="group block rounded-lg border border-gray-200 overflow-hidden hover:border-primary-400 hover:shadow-sm transition-all text-left w-full"
            >
              <div className="relative h-28 bg-gray-100 overflow-hidden">
                <img
                  src={url}
                  alt={att.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <FiZoomIn
                    size={22}
                    className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
                  />
                </div>
              </div>
              {footer}
            </button>
          );
        }

        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="group block rounded-lg border border-gray-200 overflow-hidden hover:border-primary-400 hover:shadow-sm transition-all"
          >
            <div
              className={cn(
                'h-28 flex flex-col items-center justify-center gap-2',
                isPdf ? 'bg-red-50' : 'bg-gray-50'
              )}
            >
              <FiFile size={30} className={isPdf ? 'text-red-400' : 'text-gray-400'} />
              <span
                className={cn(
                  'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase',
                  isPdf ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'
                )}
              >
                {ext}
              </span>
            </div>
            {footer}
          </a>
        );
      })}
    </div>
  );
};
