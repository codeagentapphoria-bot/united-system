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
import { EditSoloParentFields } from '@/components/social-amelioration/forms/EditSoloParentFields';
import { useCitizenSearch, createReactSelectStyles } from '@/components/social-amelioration/shared';

// Hooks
import { useGovernmentPrograms } from '@/hooks/social-amelioration/useGovernmentPrograms';

// Types and Schemas
import { soloParentSchema, type SoloParentInput } from '@/validations/beneficiary.schema';

// Utils
import { cn } from '@/lib/utils';

interface EditSoloParentModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: (data: SoloParentInput) => Promise<void>;
  initialData?: any;
}

export const EditSoloParentModal: React.FC<EditSoloParentModalProps> = ({
  open,
  onClose,
  onEdit,
  initialData,
}) => {
  const { getActiveProgramsByType } = useGovernmentPrograms();
  const {
    citizens,
    selectedCitizen,
    setSelectedCitizen,
    resetSearch,
  } = useCitizenSearch();

  const form = useForm<SoloParentInput>({
    resolver: zodResolver(soloParentSchema),
    defaultValues: {
      citizenId: '',
      category: '',
      assistancePrograms: [],
    },
  });

  const programOptions = getActiveProgramsByType('SOLO_PARENT').map(program => ({
    value: program.id,
    label: program.name,
  }));

  const reactSelectStyles = createReactSelectStyles(false);

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
        category: '',
        assistancePrograms: [],
      });
      resetSearch();
    }
    // Only reset when modal closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Initialize form when modal opens with initialData
  useEffect(() => {
    if (open && initialData) {
      const currentInitialDataId = initialData.id;

      // Only initialize if initialData changed or modal just opened
      if (currentInitialDataId !== prevInitialDataIdRef.current || !prevOpenRef.current) {
        prevInitialDataIdRef.current = currentInitialDataId;
        prevOpenRef.current = true;

        const citizenId = initialData.citizenId || initialData.citizen?.id || '';
        const category = initialData.category || '';
        // Handle migration from boolean fields to assistancePrograms array
        const assistancePrograms = initialData.assistancePrograms || [];

        form.reset({
          citizenId,
          category,
          assistancePrograms,
        });
      }
    }
  }, [open, initialData?.id, form]);

  // Set selected citizen separately to avoid infinite loops
  useEffect(() => {
    if (open && initialData && citizens.length > 0) {
      const citizenId = initialData.citizenId || initialData.citizen?.id || '';
      if (citizenId && selectedCitizen?.id !== citizenId) {
        const citizen = citizens.find(c => c.id === citizenId);
        if (citizen) {
          setSelectedCitizen(citizen);
        }
      }
    }
    // Only depend on open, initialData.id, and citizens.length to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.id, citizens.length]);

  const handleSubmit = async (data: SoloParentInput) => {
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
          <DialogTitle className={cn("text-2xl font-semibold text-primary-600")}>
            Edit Solo Parent
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
              <EditSoloParentFields 
                selectedCitizen={selectedCitizen}
                programOptions={programOptions}
                reactSelectStyles={reactSelectStyles}
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
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            className="bg-primary-600 hover:bg-primary-700"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Updating...' : 'Update Solo Parent'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

