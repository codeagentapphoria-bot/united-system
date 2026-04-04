import { z } from 'zod';

export const faqSchema = z.object({
  question: z.string().min(1, 'Question is required').min(3, 'Question must be at least 3 characters'),
  answer: z.string().min(1, 'Answer is required').min(3, 'Answer must be at least 3 characters'),
  order: z.number().int().min(0, 'Order must be a non-negative integer').optional(),
  isActive: z.boolean().default(true),
});

export type FAQInput = z.infer<typeof faqSchema>;


