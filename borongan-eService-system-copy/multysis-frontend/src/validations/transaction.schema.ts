import { z } from 'zod';

// Schema for serviceData - dynamic object with string keys
const serviceDataSchema = z.record(z.any()).optional();

export const createTransactionSchema = z.object({
  // Resident submission — provide residentId
  residentId: z.string().uuid('Invalid resident ID').optional(),
  // Guest submission — provide applicant fields instead
  applicantName: z.string().optional(),
  applicantContact: z.string().optional(),
  applicantEmail: z.string().email().optional().or(z.literal('')),
  applicantAddress: z.string().optional(),
  serviceId: z.string().min(1, 'Service ID is required'),
  serviceData: serviceDataSchema,
  paymentAmount: z.number().min(0, 'Payment amount must be positive').optional(),
  isLocalResident: z.boolean().optional(),
  remarks: z.string().optional(),
  preferredAppointmentDate: z.string().optional(), // ISO 8601 datetime string or empty string
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

