import { z } from "zod";

// Municipality setup schema - updated to match backend structure
export const municipalitySetupSchema = z.object({
  municipalityName: z.string().min(1, "Municipality name is required"),
  region: z.string().min(1, "Region is required"),
  province: z.string().min(1, "Province is required"),
  description: z.string().optional(),
  municipalityCode: z
    .string()
    .min(1, "Municipality code is required")
    .max(4, "Municipality code must be 4 characters or less"),
  municipalityLogoPath: z.instanceof(File).nullable().optional().refine((file) => file !== null, { message: "Municipality logo is required" }),
  idBackgroundFrontPath: z.instanceof(File).nullable().optional(),
  idBackgroundBackPath: z.instanceof(File).nullable().optional(),
});

// Barangay setup schema
export const barangaySetupSchema = z.object({
  name: z.string().min(1, "Barangay name is required"),
  code: z.string().min(1, "Barangay code is required"),
  contact: z.string().min(1, "Contact number is required"),
  email: z.string().email("Invalid email address"),
  gisCode: z.string().optional(),
  barangayLogo: z.instanceof(File).nullable().optional().refine((file) => file !== null, { message: "Barangay logo is required" }),
});

// Classification schema
export const classificationSchema = z.object({
  name: z.string().min(1, "Classification name is required"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
  details: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(["text", "select"]),
    options: z.array(z.object({
      value: z.string(),
      label: z.string()
    })).optional()
  })).optional(),
});

// Interface preferences schema
export const interfacePreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  sidebarCollapsed: z.boolean(),
  notificationsEnabled: z.boolean(),
  autoSave: z.boolean(),
});

// Image files schema (for validation)
export const imageFilesSchema = z
  .object({
    municipalityLogoPath: z.instanceof(File).nullable().optional(),
    certificate: z.instanceof(File).nullable().optional(),
    orgChart: z.instanceof(File).nullable().optional(),
    idBackgroundFrontPath: z.instanceof(File).nullable().optional(),
    idBackgroundBackPath: z.instanceof(File).nullable().optional(),
  })
  .refine(
    (data) => {
      // Validate file types
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];
      const files = [
        data.municipalityLogoPath,
        data.certificate,
        data.orgChart,
        data.idBackgroundFrontPath,
        data.idBackgroundBackPath,
      ];

      return files.every((file) => !file || allowedTypes.includes(file.type));
    },
    {
      message: "Only JPEG, PNG, and WebP files are allowed",
    }
  );

// Combined settings schema
export const settingsSchema = z.object({
  municipality: municipalitySetupSchema.optional(),
  barangay: barangaySetupSchema.optional(),
  interface: interfacePreferencesSchema.optional(),
});
