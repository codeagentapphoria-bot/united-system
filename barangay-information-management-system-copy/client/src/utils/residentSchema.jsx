import { z } from "zod";

export const residentSchema = z.object({
  lastName: z.string().min(1, "Last name is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  suffix: z.string().optional(),
  sex: z.string().min(1, "Sex is required"),
  civilStatus: z.string().min(1, "Civil status is required"),
  birthdate: z.string().min(1, "Birthdate is required"),
  birth_region: z.string().optional(),
  birth_province: z.string().optional(),
  birth_municipality: z.string().optional(),
  contactNumber: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine((val) => !val || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val), {
      message: "Invalid email",
    }),
  occupation: z.string().optional(),
  monthlyIncome: z.string().optional(),
  employmentStatus: z.string().min(1, "Employment status is required"),
  educationAttainment: z.string().min(1, "Educational attainment is required"),
  residentStatus: z.string().min(1, "Resident status is required"),
  indigenousPerson: z.string().optional(),
});
