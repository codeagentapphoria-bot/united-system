import { z } from "zod";

export const barangaySchema = z.object({
  barangayName: z.string().min(1, "Barangay name is required"),
  barangayCode: z.string().min(1, "Barangay code is required"),
  fullName: z.string().min(1, "Full name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address format")
    .refine((email) => {
      // Additional validation for common email issues
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }, "Please enter a valid email address")
    .refine((email) => {
      // Check for common typos in email domains
      const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'gov.ph'];
      const domain = email.split('@')[1]?.toLowerCase();
      return !domain || commonDomains.some(d => domain.includes(d)) || domain.endsWith('.ph') || domain.endsWith('.com');
    }, "Please use a valid email domain"),
});
