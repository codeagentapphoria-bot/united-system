// React imports
import React, { useState, useRef } from 'react';

// Third-party libraries
import { useForm } from 'react-hook-form';
import type { FieldValues } from 'react-hook-form';
import { FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';

// Utils
import { cn } from '@/lib/utils';

export interface StepConfig {
  number: number;
  title: string;
  fields: string[];
}

export interface StepperModalProps<T extends FieldValues> {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: T) => Promise<void> | void;
  form: ReturnType<typeof useForm<T>>;
  title: string;
  steps: StepConfig[];
  submitButtonText?: string;
  submittingButtonText?: string;
  children: (props: {
    currentStep: number;
    onStepChange: (step: number) => void;
    validateStepRef: React.MutableRefObject<((step: number) => Promise<boolean>) | null>;
  }) => React.ReactNode;
  className?: string;
}

export const StepperModal = <T extends Record<string, any>>({
  open,
  onClose,
  onSubmit,
  form,
  title,
  steps,
  submitButtonText = 'Submit',
  submittingButtonText,
  children,
  className,
}: StepperModalProps<T>) => {
  const [currentStep, setCurrentStep] = useState(1);
  const validateStepRef = useRef<((step: number) => Promise<boolean>) | null>(null);

  const totalSteps = steps.length;

  const handleSubmit = async (data: T) => {
    try {
      await onSubmit(data);
      form.reset();
      setCurrentStep(1);
      onClose();
    } catch (error: any) {
      // Error handling should be done in the parent component
      throw error;
    }
  };

  const handleClose = () => {
    form.reset();
    setCurrentStep(1);
    onClose();
  };

  const handleNext = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (validateStepRef.current) {
      const isValid = await validateStepRef.current(currentStep);
      if (isValid && currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0", className)}>
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className={cn("text-2xl font-semibold text-primary-600")}>
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6">
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(handleSubmit)} 
              id="stepper-form" 
              className="space-y-6 pb-6"
            >
              {/* Progress Steps Indicator */}
              <div className="w-full mb-6">
                <div className="flex items-center justify-between">
                  {steps.map((step, index) => (
                    <React.Fragment key={step.number}>
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                            currentStep > step.number
                              ? "bg-primary-600 text-white"
                              : currentStep === step.number
                              ? "bg-primary-600 text-white ring-4 ring-primary-200"
                              : "bg-gray-200 text-gray-600"
                          )}
                        >
                          {currentStep > step.number ? (
                            <FiCheck className="w-5 h-5" />
                          ) : (
                            step.number
                          )}
                        </div>
                        <p
                          className={cn(
                            "mt-2 text-xs font-medium text-center max-w-[100px]",
                            currentStep >= step.number ? "text-primary-600" : "text-gray-500"
                          )}
                        >
                          {step.title}
                        </p>
                      </div>
                      {index < steps.length - 1 && (
                        <div
                          className={cn(
                            "flex-1 h-1 mx-2 transition-all",
                            currentStep > step.number ? "bg-primary-600" : "bg-gray-200"
                          )}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Step Content */}
              <div className="min-h-[400px]">
                {children({
                  currentStep,
                  onStepChange: setCurrentStep,
                  validateStepRef,
                })}
              </div>
            </form>
          </Form>
        </div>

        {/* Navigation Buttons - Fixed at bottom */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-white">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={form.formState.isSubmitting}
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            Cancel
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Step {currentStep} of {totalSteps}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1 || form.formState.isSubmitting}
                className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
              >
                <FiChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext(e);
                  }}
                  disabled={form.formState.isSubmitting}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  Next
                  <FiChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="stepper-form"
                  onClick={(e) => {
                    e.preventDefault();
                    form.handleSubmit(handleSubmit)(e);
                  }}
                  className="bg-primary-600 hover:bg-primary-700"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting 
                    ? (submittingButtonText || 'Submitting...') 
                    : submitButtonText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

