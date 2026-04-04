// React imports
import React, { useEffect } from 'react';

// Third-party libraries
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';

// Custom Components
import { AddPWDFields } from '@/components/social-amelioration/forms/AddPWDFields';
import { createReactSelectStyles, useCitizenSearch } from '@/components/social-amelioration/shared';

// Hooks
import { useToast } from '@/hooks/use-toast';
import { useGovernmentPrograms } from '@/hooks/social-amelioration/useGovernmentPrograms';

// Types and Schemas
import { pwdSchema, type PWDInput } from '@/validations/beneficiary.schema';

// Utils
import { cn } from '@/lib/utils';

interface AddPWDModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: PWDInput) => Promise<void>;
  existingBeneficiaries?: any[];
  onEdit?: (beneficiaryId: string) => void;
}

export const AddPWDModal: React.FC<AddPWDModalProps> = ({
  open,
  onClose,
  onAdd,
  existingBeneficiaries = [],
  onEdit,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getActiveProgramsByType } = useGovernmentPrograms();
  const {
    isLoadingCitizens,
    localSearchQuery,
    setLocalSearchQuery,
    selectedCitizen,
    setSelectedCitizen,
    resetSearch,
  } = useCitizenSearch();

  const form = useForm<PWDInput>({
    resolver: zodResolver(pwdSchema),
    defaultValues: {
      citizenId: '',
      disabilityType: '',
      disabilityLevel: '',
      monetaryAllowance: false,
      assistedDevice: false,
      donorDevice: '',
      governmentPrograms: [],
    },
  });

  const programOptions = getActiveProgramsByType('PWD').map(program => ({
    value: program.id,
    label: program.name,
  }));

  const reactSelectStyles = createReactSelectStyles(false);

  // Check if selected citizen is already registered
  const existingBeneficiary = React.useMemo(() => {
    if (!selectedCitizen) return null;
    return existingBeneficiaries.find(
      (b) => b.citizenId === selectedCitizen.id || (b.citizen && b.citizen.id === selectedCitizen.id)
    );
  }, [selectedCitizen, existingBeneficiaries]);

  // Pre-fill form when citizen is selected
  useEffect(() => {
    if (selectedCitizen && open) {
      form.setValue('citizenId', selectedCitizen.id);
    }
  }, [selectedCitizen, open, form]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
      resetSearch();
    }
    // Only reset when modal closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (data: PWDInput) => {
    // Check if citizen is already registered
    if (existingBeneficiary) {
      toast({
        variant: 'destructive',
        title: 'Resident Already Registered',
        description: 'This citizen is already registered as a PWD. Please edit the existing record instead.',
      });
      return;
    }

    try {
      await onAdd(data);
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

  const handleAddNewCitizen = () => {
    handleClose();
    navigate('/admin/residents');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0")}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className={cn("text-2xl font-semibold text-primary-600")}>
            Add PWD
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          {existingBeneficiary && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Resident Already Registered</h4>
              <p className="text-sm text-red-700 mb-3">
                This resident ({selectedCitizen?.firstName} {selectedCitizen?.lastName}) is already registered as a PWD. Please edit the existing record instead.
              </p>
              {onEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onEdit(existingBeneficiary.id);
                    handleClose();
                  }}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Edit Existing Record
                </Button>
              )}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
              <AddPWDFields
                onAddNewCitizen={handleAddNewCitizen}
                isLoadingCitizens={isLoadingCitizens}
                localSearchQuery={localSearchQuery}
                onSearchChange={setLocalSearchQuery}
                selectedCitizen={selectedCitizen}
                onCitizenSelect={setSelectedCitizen}
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
            disabled={form.formState.isSubmitting || !!existingBeneficiary}
          >
            {form.formState.isSubmitting ? 'Adding...' : 'Add PWD'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

