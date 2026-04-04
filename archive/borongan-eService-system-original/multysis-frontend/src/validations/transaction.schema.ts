import { z } from 'zod';

// Schema for serviceData - dynamic object with string keys
const serviceDataSchema = z.record(z.any()).optional();

export const createTransactionSchema = z.object({
  subscriberId: z.string().uuid('Invalid subscriber ID'),
  serviceId: z.string().uuid('Invalid service ID'),
  serviceData: serviceDataSchema,
  paymentAmount: z.number().min(0, 'Payment amount must be positive').optional(),
  isResidentOfBorongan: z.boolean().optional(),
  remarks: z.string().optional(),
  preferredAppointmentDate: z.string().optional(), // ISO 8601 datetime string or empty string
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

