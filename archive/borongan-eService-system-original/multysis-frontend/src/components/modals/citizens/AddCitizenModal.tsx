// React imports
import React from 'react';

// Custom Components
import { StepperModal, type StepConfig } from '@/components/common/StepperModal';
import { AddCitizenFields } from '@/components/citizens/forms/AddCitizenFields';

// Hooks
import { useAddCitizen } from '@/hooks/citizens/useCitizens';
import { useToast } from '@/hooks/use-toast';

// Types and Schemas
import type { AddCitizenInput } from '@/validations/citizen.schema';

interface AddCitizenModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const AddCitizenModal: React.FC<AddCitizenModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const { form, handleAddCitizen } = useAddCitizen();
  const { toast } = useToast();

  const steps: StepConfig[] = [
    { number: 1, title: 'Personal Information', fields: ['firstName', 'lastName', 'civilStatus', 'sex', 'birthdate', 'region', 'province', 'municipality'] },
    { number: 2, title: 'Contact & Address', fields: ['phoneNumber', 'emergencyContactPerson', 'emergencyContactNumber', 'addressRegion', 'addressProvince', 'addressMunicipality', 'addressBarangay', 'addressPostalCode', 'addressStreetAddress'] },
    { number: 3, title: 'Additional Info', fields: ['citizenship', 'username', 'pin'] },
    { number: 4, title: 'Documents', fields: ['idType', 'proofOfIdentificationFile'] },
  ];

  const handleSubmit = async (data: AddCitizenInput) => {
    try {
      await handleAddCitizen(data);
      toast({
        title: 'Success',
        description: 'Citizen created successfully',
      });
      // Call parent onSubmit after successful creation to refresh list
      onSubmit(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to create citizen',
      });
      // Re-throw error so StepperModal doesn't close/reset on error
      throw error;
    }
  };

  return (
    <StepperModal<AddCitizenInput>
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      form={form}
      title="Add New Citizen"
      steps={steps}
      submitButtonText="Add Citizen"
      submittingButtonText="Adding..."
    >
      {({ currentStep, onStepChange, validateStepRef }) => (
        <AddCitizenFields 
          currentStep={currentStep} 
          onStepChange={onStepChange} 
          validateStepRef={validateStepRef}
        />
      )}
    </StepperModal>
  );
};
