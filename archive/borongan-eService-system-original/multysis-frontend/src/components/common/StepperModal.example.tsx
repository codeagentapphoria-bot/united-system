/**
 * StepperModal Usage Example
 * 
 * This file demonstrates how to use the reusable StepperModal component
 * for creating multi-step forms with progress indicators.
 */

// React imports
import React from 'react';

// Third-party libraries
import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Custom Components
import { StepperModal, type StepConfig } from '@/components/common/StepperModal';

// Example: Using StepperModal for a multi-step form

// 1. Define your form schema
const exampleSchema = z.object({
  step1Field1: z.string().min(1, 'Field 1 is required'),
  step1Field2: z.string().min(1, 'Field 2 is required'),
  step2Field1: z.string().min(1, 'Field 1 is required'),
  step2Field2: z.string().email('Invalid email'),
  step3Field1: z.string().min(1, 'Field 1 is required'),
});

type ExampleFormData = z.infer<typeof exampleSchema>;

// 2. Define your steps configuration
const exampleSteps: StepConfig[] = [
  { 
    number: 1, 
    title: 'Step 1', 
    fields: ['step1Field1', 'step1Field2'] 
  },
  { 
    number: 2, 
    title: 'Step 2', 
    fields: ['step2Field1', 'step2Field2'] 
  },
  { 
    number: 3, 
    title: 'Step 3', 
    fields: ['step3Field1'] 
  },
];

// 3. Create your form fields component
interface ExampleFieldsProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  validateStepRef: React.MutableRefObject<((step: number) => Promise<boolean>) | null>;
}

const ExampleFields: React.FC<ExampleFieldsProps> = ({ 
  currentStep, 
  validateStepRef 
}) => {
  const form = useFormContext<ExampleFormData>();
  
  // Define validation function
  const validateStep = React.useCallback(async (step: number): Promise<boolean> => {
    const stepFields = exampleSteps[step - 1]?.fields;
    if (!stepFields) return false;
    const result = await form.trigger(stepFields as any);
    return result;
  }, [form]);

  // Expose validation function via ref
  React.useEffect(() => {
    if (validateStepRef) {
      validateStepRef.current = validateStep;
    }
  }, [validateStep, validateStepRef]);

  return (
    <>
      {currentStep === 1 && (
        <div>
          {/* Step 1 fields */}
          <h3>Step 1 Content</h3>
        </div>
      )}
      {currentStep === 2 && (
        <div>
          {/* Step 2 fields */}
          <h3>Step 2 Content</h3>
        </div>
      )}
      {currentStep === 3 && (
        <div>
          {/* Step 3 fields */}
          <h3>Step 3 Content</h3>
        </div>
      )}
    </>
  );
};

// 4. Create your modal component
interface ExampleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ExampleFormData) => void;
}

export const ExampleModal: React.FC<ExampleModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const form = useForm<ExampleFormData>({
    resolver: zodResolver(exampleSchema),
    defaultValues: {
      step1Field1: '',
      step1Field2: '',
      step2Field1: '',
      step2Field2: '',
      step3Field1: '',
    },
  });

  const handleSubmit = async (data: ExampleFormData) => {
    try {
      // Your submit logic here
      await onSubmit(data);
    } catch (error) {
      // Error handling
      throw error; // Re-throw to prevent modal from closing
    }
  };

  return (
    <StepperModal<ExampleFormData>
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      form={form}
      title="Example Multi-Step Form"
      steps={exampleSteps}
      submitButtonText="Submit"
      submittingButtonText="Submitting..."
    >
      {({ currentStep, onStepChange, validateStepRef }) => (
        <ExampleFields 
          currentStep={currentStep}
          onStepChange={onStepChange}
          validateStepRef={validateStepRef}
        />
      )}
    </StepperModal>
  );
};

/**
 * Key Points:
 * 
 * 1. StepperModal is generic and accepts any form data type
 * 2. Steps configuration defines which fields to validate per step
 * 3. The children render prop receives:
 *    - currentStep: current step number
 *    - onStepChange: function to change step programmatically
 *    - validateStepRef: ref to expose validation function
 * 4. Your fields component must expose validateStep via the ref
 * 5. onSubmit should throw errors to prevent modal from closing on error
 * 6. The modal handles all navigation, progress indicators, and form submission
 */

