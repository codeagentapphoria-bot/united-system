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
import { EditSeniorCitizenFields } from '@/components/social-amelioration/forms/EditSeniorCitizenFields';
import { useCitizenSearch, createReactSelectStyles } from '@/components/social-amelioration/shared';

// Hooks
import { useToast } from '@/hooks/use-toast';
import { useGovernmentPrograms } from '@/hooks/social-amelioration/useGovernmentPrograms';

// Types and Schemas
import { seniorCitizenSchema, type SeniorCitizenInput } from '@/validations/beneficiary.schema';

// Utils
import { cn } from '@/lib/utils';

interface EditSeniorCitizenModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: (data: SeniorCitizenInput) => Promise<void>;
  initialData?: any;
  existingBeneficiaries?: any[];
}

export const EditSeniorCitizenModal: React.FC<EditSeniorCitizenModalProps> = ({
  open,
  onClose,
  onEdit,
  initialData,
  existingBeneficiaries = [],
}) => {
  const { toast } = useToast();
  const { getActiveProgramsByType } = useGovernmentPrograms();
  const {
    citizens,
    selectedCitizen,
    setSelectedCitizen,
    resetSearch,
  } = useCitizenSearch();

  const form = useForm<SeniorCitizenInput>({
    resolver: zodResolver(seniorCitizenSchema),
    defaultValues: {
      citizenId: '',
      pensionTypes: [],
      governmentPrograms: [],
    },
  });

  const programOptions = getActiveProgramsByType('SENIOR_CITIZEN').map(program => ({
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
        pensionTypes: [],
        governmentPrograms: [],
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
        const existingPensions = initialData.pensionTypes || 
          (initialData.pensionType ? [initialData.pensionType] : []) ||
          (initialData.typeOfPension ? [initialData.typeOfPension] : []);
        const governmentPrograms = initialData.governmentPrograms || [];

        form.reset({
          citizenId,
          pensionTypes: existingPensions,
          governmentPrograms,
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

  const handleSubmit = async (data: SeniorCitizenInput) => {
    if (!data.pensionTypes || data.pensionTypes.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select at least one pension type',
      });
      return;
    }

    try {
      await onEdit(data);
      form.reset();
      resetSearch();
      onClose();
    } catch {
      // Errors handled upstream
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
            Edit Senior Citizen
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
              <EditSeniorCitizenFields
                selectedCitizen={selectedCitizen}
                initialData={initialData}
                existingBeneficiaries={existingBeneficiaries}
                programOptions={programOptions}
                reactSelectStyles={reactSelectStyles}
              />
            </form>
          </Form>
        </div>

        {/* Action Buttons */}
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
            {form.formState.isSubmitting ? 'Updating...' : 'Update Senior Citizen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

