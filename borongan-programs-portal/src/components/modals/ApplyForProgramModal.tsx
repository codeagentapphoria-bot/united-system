// React imports
import React, { useRef, useState } from 'react';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Types
import type { PortalProgram } from '@/services/api/portal-programs.service';
import type { RequirementItem } from '@/validations/government-program.schema';

// Services
import { portalProgramsService } from '@/services/api/portal-programs.service';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Utils
import { cn } from '@/lib/utils';

const parseRequirements = (raw?: string | null): RequirementItem[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(item => ({ required: false, ...item }));
  } catch {}
  return [{ type: 'text', label: raw, required: false }];
};

interface ApplyForProgramModalProps {
  open: boolean;
  onClose: () => void;
  program: PortalProgram | null;
  onSuccess: () => void;
}

export const ApplyForProgramModal: React.FC<ApplyForProgramModalProps> = ({ open, onClose, program, onSuccess }) => {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!program) return null;

  const requirements = parseRequirements(program.requirements);

  const handleClose = () => {
    setValues({});
    setFiles({});
    setErrors({});
    onClose();
  };

  const handleSubmit = async () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};
    for (const req of requirements) {
      if (req.required) {
        if (req.type === 'file' && !files[req.label]) {
          newErrors[req.label] = 'This file is required';
        } else if (req.type !== 'file' && !values[req.label]?.trim()) {
          newErrors[req.label] = 'This field is required';
        }
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formData = new FormData();

    // Collect non-file field values
    const textValues: Record<string, string> = {};
    for (const req of requirements) {
      if (req.type !== 'file') {
        textValues[req.label] = values[req.label] || '';
      }
    }
    formData.append('submittedData', JSON.stringify(textValues));

    // Append uploaded files (fieldname = requirement label so backend knows which field it belongs to)
    for (const [label, file] of Object.entries(files)) {
      formData.append(label, file, file.name);
    }

    setIsSubmitting(true);
    try {
      await portalProgramsService.applyForProgram(program.id, formData);
      onSuccess();
      handleClose();
      toast({ title: 'Application submitted', description: `You applied for ${program.name}.` });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to apply',
        description: error?.response?.data?.message || error.message || 'Something went wrong',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-primary-600">Apply for Program</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Program info */}
          <div className="bg-primary-50 rounded-lg p-4">
            <p className="font-semibold text-heading-700">{program.name}</p>
            {program.description && <p className="text-sm text-gray-500 mt-1">{program.description}</p>}
          </div>

          {/* Dynamic requirement fields */}
          {requirements.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Application Form</p>
                <span className="text-xs text-gray-400">
                  {requirements.filter(r => r.required).length} required field
                  {requirements.filter(r => r.required).length !== 1 ? 's' : ''}
                </span>
              </div>
              {requirements.map((req, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'rounded-lg border p-3 space-y-2',
                    errors[req.label] ? 'border-red-300 bg-red-50/30' : 'border-gray-100 bg-gray-50/60'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-700 flex-1">
                      {req.label}
                      {req.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {req.required ? (
                      <span className="text-[10px] font-semibold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">
                        Required
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">Optional</span>
                    )}
                  </div>

                  {req.type === 'file' ? (
                    <div
                      className={cn(
                        'rounded-md border-2 border-dashed p-3 transition-colors',
                        files[req.label] ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                      )}
                    >
                      <input
                        type="file"
                        ref={el => {
                          fileInputRefs.current[req.label] = el;
                        }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFiles(prev => ({ ...prev, [req.label]: file }));
                            setErrors(prev => ({ ...prev, [req.label]: '' }));
                          }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200"
                      />
                      {files[req.label] && (
                        <p className="text-xs text-green-700 font-medium mt-1.5 flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full bg-green-500 text-white flex items-center justify-center text-[8px]">
                            ✓
                          </span>
                          {files[req.label].name}
                        </p>
                      )}
                    </div>
                  ) : req.type === 'textarea' ? (
                    <Textarea
                      rows={3}
                      value={values[req.label] || ''}
                      onChange={e => {
                        setValues(prev => ({ ...prev, [req.label]: e.target.value }));
                        setErrors(prev => ({ ...prev, [req.label]: '' }));
                      }}
                      placeholder={`Enter ${req.label.toLowerCase()}…`}
                      className={cn('bg-white', errors[req.label] && 'border-red-400')}
                    />
                  ) : (
                    <Input
                      type={req.type}
                      value={values[req.label] || ''}
                      onChange={e => {
                        setValues(prev => ({ ...prev, [req.label]: e.target.value }));
                        setErrors(prev => ({ ...prev, [req.label]: '' }));
                      }}
                      placeholder={`Enter ${req.label.toLowerCase()}…`}
                      className={cn('bg-white', errors[req.label] && 'border-red-400')}
                    />
                  )}

                  {errors[req.label] && <p className="text-xs text-red-500 font-medium">{errors[req.label]}</p>}
                </div>
              ))}
            </div>
          )}

          {requirements.length === 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-500">
                No additional information required. Click <span className="font-semibold">Confirm</span> to submit your
                application.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary-600 hover:bg-primary-700">
              {isSubmitting ? 'Submitting...' : 'Confirm Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
