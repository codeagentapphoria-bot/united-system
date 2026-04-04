import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const serviceSchema = z.object({
  code: z.string().min(1, 'Service code is required').regex(/^[A-Z_]+$/, 'Service code must be uppercase letters and underscores only'),
  name: z.string().min(1, 'Service name is required').min(2, 'Service name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  requiresPayment: z.boolean().optional().default(true),
  defaultAmount: z.number().min(0).optional(),
  paymentStatuses: z.array(z.string()).optional(),
  formFields: z.any().optional(),
  displayInSidebar: z.boolean().optional().default(true),
  displayInSubscriberTabs: z.boolean().optional().default(true),
  requiresAppointment: z.boolean().optional().default(false),
  appointmentDuration: z.union([
    z.number().int().min(1),
    z.null(),
    z.undefined()
  ]).optional(),
}).refine((data) => {
  // Only require appointmentDuration if requiresAppointment is true
  if (data.requiresAppointment === true) {
    return data.appointmentDuration !== null && data.appointmentDuration !== undefined && data.appointmentDuration >= 1;
  }
  return true;
}, {
  message: 'Appointment duration is required when appointment is required',
  path: ['appointmentDuration'],
});

export type ServiceFormInput = z.infer<typeof serviceSchema>;

export const useServiceForm = (initialData?: Partial<ServiceFormInput>) => {
  const form = useForm<ServiceFormInput>({
    resolver: zodResolver(serviceSchema),
      defaultValues: {
      code: initialData?.code || '',
      name: initialData?.name || '',
      description: initialData?.description || '',
      category: initialData?.category || '',
      icon: initialData?.icon || '',
      order: initialData?.order || 0,
      isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
      requiresPayment: initialData?.requiresPayment !== undefined ? initialData.requiresPayment : true,
      defaultAmount: initialData?.defaultAmount !== undefined 
        ? (typeof initialData.defaultAmount === 'string' 
          ? Number(initialData.defaultAmount) 
          : initialData.defaultAmount)
        : undefined,
      paymentStatuses: initialData?.paymentStatuses || [],
      formFields: initialData?.formFields || {},
      displayInSidebar: initialData?.displayInSidebar !== undefined ? initialData.displayInSidebar : true,
      displayInSubscriberTabs: initialData?.displayInSubscriberTabs !== undefined ? initialData.displayInSubscriberTabs : true,
      requiresAppointment: initialData?.requiresAppointment !== undefined ? initialData.requiresAppointment : false,
      appointmentDuration: initialData?.appointmentDuration ?? undefined,
    },
  });

  return form;
};

