import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2, FileText, Upload, CheckCircle, ZoomIn } from 'lucide-react';
import { portalProgramsService, type PortalProgram } from '@/services/api/portal-programs.service';

interface RequirementItem {
  type: 'text' | 'file';
  label: string;
  required: boolean;
}

function parseRequirements(raw?: string): RequirementItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as RequirementItem[];
  } catch { /* ignore */ }
  return [];
}

// ── Lightbox ───────────────────────────────────────────────────────────────────

function Lightbox({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-black/60 px-4 py-2 rounded-t-lg">
          <p className="text-white text-sm font-medium truncate">{label}</p>
          <button onClick={onClose} className="text-white/70 hover:text-white ml-4 shrink-0">
            <X size={20} />
          </button>
        </div>
        <img
          src={url}
          alt={label}
          className="w-full max-h-[80vh] object-contain rounded-b-lg bg-black"
        />
      </div>
    </div>
  );
}

// ── File preview tile ──────────────────────────────────────────────────────────

function FilePreviewTile({
  file,
  label,
  onReplace,
}: {
  file: File;
  label: string;
  onReplace: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const isImage = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
  const sizeKb = (file.size / 1024).toFixed(0);

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file, isImage]);

  return (
    <>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {/* Preview area */}
        {isImage && objectUrl ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group relative w-full h-36 bg-gray-100 block overflow-hidden"
          >
            <img
              src={objectUrl}
              alt={label}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn
                size={22}
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow"
              />
            </div>
          </button>
        ) : (
          <div
            className={`h-36 flex flex-col items-center justify-center gap-2 ${
              isPdf ? 'bg-red-50' : 'bg-gray-50'
            }`}
          >
            <FileText size={30} className={isPdf ? 'text-red-400' : 'text-gray-400'} />
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                isPdf ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'
              }`}
            >
              {ext}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="px-2.5 py-2 bg-white border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">{file.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sizeKb} KB</p>
          </div>
          <button
            type="button"
            onClick={onReplace}
            className="text-[10px] text-primary-600 hover:text-primary-800 shrink-0 font-medium"
          >
            Change
          </button>
        </div>
      </div>

      {lightboxOpen && objectUrl && (
        <Lightbox url={objectUrl} label={label} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

interface ApplyModalProps {
  program: PortalProgram;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplyModal({ program, onClose, onSuccess }: ApplyModalProps) {
  const requirements = parseRequirements(program.requirements);

  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [fileValues, setFileValues] = useState<Record<string, File | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'pdf'];

  function validateFile(file: File): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: 5MB`;
    }
    return null;
  }

  const handleFileChange = (label: string, file: File | null) => {
    if (file) {
      const error = validateFile(file);
      if (error) {
        setError(error);
        return;
      }
    }
    setError(null);
    setFileValues(prev => ({ ...prev, [label]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    for (const req of requirements) {
      if (!req.required) continue;
      if (req.type === 'text' && !textValues[req.label]?.trim()) {
        setError(`"${req.label}" is required.`);
        return;
      }
      if (req.type === 'file' && !fileValues[req.label]) {
        setError(`"${req.label}" is required.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const hasFiles = requirements.some(r => r.type === 'file');
      const hasText = requirements.some(r => r.type === 'text');

      let formData: FormData | undefined;

      if (hasFiles || hasText) {
        formData = new FormData();

        if (hasText) {
          const submittedData: Record<string, string> = {};
          for (const req of requirements) {
            if (req.type === 'text' && textValues[req.label] !== undefined) {
              submittedData[req.label] = textValues[req.label] ?? '';
            }
          }
          formData.append('submittedData', JSON.stringify(submittedData));
        }

        for (const req of requirements) {
          if (req.type === 'file') {
            const file = fileValues[req.label];
            if (file) formData.append(req.label, file);
          }
        }
      }

      await portalProgramsService.applyForProgram(program.id, formData);
      setSubmitted(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch {
      setError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-heading-900">Apply for Libre Sakay</h2>
            <p className="text-xs text-gray-400 mt-0.5">{program.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {submitted ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-heading-900">Application Submitted!</p>
              <p className="text-sm text-gray-500">Your application is now pending review.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {requirements.length === 0 ? (
                <div className="bg-primary-50 rounded-lg p-4 text-center">
                  <FileText className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                  <p className="text-sm text-primary-800 font-medium">No additional requirements</p>
                  <p className="text-xs text-primary-600 mt-1">
                    Click submit to apply for this program.
                  </p>
                </div>
              ) : (
                requirements.map(req => (
                  <div key={req.label} className="space-y-1.5">
                    <label className="block text-sm font-medium text-heading-700">
                      {req.label}
                      {req.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {req.type === 'text' ? (
                      <input
                        type="text"
                        value={textValues[req.label] ?? ''}
                        onChange={e =>
                          setTextValues(prev => ({ ...prev, [req.label]: e.target.value }))
                        }
                        placeholder={`Enter ${req.label.toLowerCase()}`}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 bg-white"
                      />
                    ) : fileValues[req.label] ? (
                      <>
                        <FilePreviewTile
                          file={fileValues[req.label]!}
                          label={req.label}
                          onReplace={() => fileInputRefs.current[req.label]?.click()}
                        />
                        <input
                          ref={el => { fileInputRefs.current[req.label] = el; }}
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={e =>
                            handleFileChange(req.label, e.target.files?.[0] ?? null)
                          }
                        />
                      </>
                    ) : (
                      <div
                        className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                        onClick={() => fileInputRefs.current[req.label]?.click()}
                      >
                        <input
                          ref={el => { fileInputRefs.current[req.label] = el; }}
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={e =>
                            handleFileChange(req.label, e.target.files?.[0] ?? null)
                          }
                        />
                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1.5" />
                        <p className="text-xs text-gray-500">Click to upload</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Image or PDF</p>
                      </div>
                    )}
                  </div>
                ))
              )}

              {error && (
                <div className="bg-red-50 rounded-lg px-3 py-2.5 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary-600 hover:bg-primary-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Submitting…
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
