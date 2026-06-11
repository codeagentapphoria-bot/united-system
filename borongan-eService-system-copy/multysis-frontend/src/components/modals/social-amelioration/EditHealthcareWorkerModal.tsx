// React imports
import React, { useEffect, useRef } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';

// Custom Components
import { EditHealthcareWorkerFields } from '@/components/social-amelioration/forms/EditHealthcareWorkerFields';
import { useCitizenSearch } from '@/components/social-amelioration/shared';

// Hooks
import { residentService } from '@/services/api/resident.service';

// Types and Schemas
import { healthcareWorkerSchema, type HealthcareWorkerInput } from '@/validations/beneficiary.schema';

// Utils
import { cn } from '@/lib/utils';

interface EditHealthcareWorkerModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: (data: HealthcareWorkerInput) => Promise<void>;
  initialData?: any;
}

export const EditHealthcareWorkerModal: React.FC<EditHealthcareWorkerModalProps> = ({
  open,
  onClose,
  onEdit,
  initialData,
}) => {
  const {
    citizens,
    selectedCitizen,
    setSelectedCitizen,
    resetSearch,
  } = useCitizenSearch();

  const form = useForm<HealthcareWorkerInput>({
    resolver: zodResolver(healthcareWorkerSchema),
    defaultValues: {
      citizenId: '',
      occupation: '',
      workplace: '',
      remarks: '',
    },
  });

  // Pre-fill form when modal opens
  const prevInitialDataIdRef = useRef<string | undefined>(undefined);
  const prevOpenRef = useRef(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!open && prevOpenRef.current) {
      prevInitialDataIdRef.current = undefined;
      prevOpenRef.current = false;
      form.reset({
        citizenId: '',
        occupation: '',
        workplace: '',
        remarks: '',
      });
      resetSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Initialize form when modal opens with initialData
  useEffect(() => {
    if (open && initialData) {
      const currentInitialDataId = initialData.id;

      if (currentInitialDataId !== prevInitialDataIdRef.current || !prevOpenRef.current) {
        prevInitialDataIdRef.current = currentInitialDataId;
        prevOpenRef.current = true;

        const citizenId = initialData.citizenId || initialData.citizen?.id || '';
        const existingClassificationDetails = initialData.classification_details;
        const occupation = existingClassificationDetails?.occupation ?? initialData.occupation ?? '';
        const workplace = existingClassificationDetails?.workplace ?? initialData.workplace ?? '';
        const remarks = existingClassificationDetails?.remarks ?? initialData.remarks ?? '';

        form.reset({
          citizenId,
          occupation,
          workplace,
          remarks,
        });
      }
    }
  }, [open, initialData?.id, form]);

  // Set selected citizen - fetch directly from API when editing
  useEffect(() => {
    if (open && initialData && !selectedCitizen) {
      const citizenId = initialData.citizenId || initialData.citizen?.id || '';
      if (citizenId) {
        residentService.getResident(citizenId)
          .then(citizen => {
            setSelectedCitizen(citizen);
          })
          .catch(() => {
            const citizen = citizens.find(c => c.id === citizenId);
            if (citizen) {
              setSelectedCitizen(citizen);
            }
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.id]);

  const handleSubmit = async (data: HealthcareWorkerInput) => {
    try {
      await onEdit(data);
      form.reset();
      resetSearch();
      onClose();
    } catch {
      // handled upstream
    }
  };

  const handleClose = () => {
    form.reset();
    resetSearch();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0")}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className={cn("text-2xl font-semibold text-teal-600")}>
            Edit Healthcare Worker
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
              <EditHealthcareWorkerFields
                selectedCitizen={selectedCitizen}
              />
            </form>
          </Form>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-white">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={form.formState.isSubmitting}
            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            className="bg-teal-600 hover:bg-teal-700"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Updating...' : 'Update Healthcare Worker'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
