// React imports
import React from 'react';

// Custom Components
import { StepperModal, type StepConfig } from '@/components/common/StepperModal';
import { EditCitizenFields } from '@/components/citizens/forms/EditCitizenFields';

// Hooks
import { useEditCitizen } from '@/hooks/citizens/useCitizens';
import { useToast } from '@/hooks/use-toast';

// Types and Schemas
import type { EditCitizenInput } from '@/validations/citizen.schema';

interface EditCitizenModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Partial<EditCitizenInput>;
  citizenId?: string;
}

export const EditCitizenModal: React.FC<EditCitizenModalProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  citizenId,
}) => {
  const { form, handleEditCitizen, previewImage, handleImageChange, proofOfIdentificationPreview, handleProofOfIdentificationChange } = useEditCitizen(initialData, citizenId);
  const { toast } = useToast();

  const steps: StepConfig[] = [
    { number: 1, title: 'Personal Information', fields: ['firstName', 'lastName', 'civilStatus', 'sex', 'birthdate', 'region', 'province', 'municipality'] },
    { number: 2, title: 'Contact & Address', fields: ['phoneNumber', 'emergencyContactPerson', 'emergencyContactNumber', 'addressRegion', 'addressProvince', 'addressMunicipality', 'addressBarangay', 'addressPostalCode', 'addressStreetAddress'] },
    { number: 3, title: 'Additional Info', fields: ['citizenship', 'username', 'pin'] },
    { number: 4, title: 'Documents', fields: ['idType', 'proofOfIdentificationFile'] },
  ];

  const handleSubmit = async (data: EditCitizenInput) => {
    try {
      await handleEditCitizen(data);
      toast({
        title: 'Success',
        description: 'Citizen updated successfully',
      });
      onSubmit(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to update citizen',
      });
      throw error; // Re-throw to prevent modal from closing
    }
  };

  return (
    <StepperModal<EditCitizenInput>
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      form={form}
      title="Edit Citizen Profile"
      steps={steps}
      submitButtonText="Save Changes"
      submittingButtonText="Saving..."
    >
      {({ currentStep, onStepChange, validateStepRef }) => (
        <EditCitizenFields
          currentStep={currentStep}
          onStepChange={onStepChange}
          validateStepRef={validateStepRef}
          citizenPicturePreview={previewImage || undefined}
          proofOfIdentificationPreview={proofOfIdentificationPreview || undefined}
          onCitizenPictureChange={handleImageChange}
          onProofOfIdentificationChange={handleProofOfIdentificationChange}
          citizenId={citizenId}
        />
      )}
    </StepperModal>
  );
};
