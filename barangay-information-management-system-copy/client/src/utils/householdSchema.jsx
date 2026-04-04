import { z } from "zod";

export const householdSchema = z.object({
  houseNumber: z.string().optional(),
  street: z.string().optional(),
  houseHead: z.string().min(1, "House head is required"),
  housingType: z.string().optional(),
  structureType: z.string().optional(),
  electricity: z.string().min(1, "Electricity status is required"),
  waterSource: z.string().optional(),
  toiletFacility: z.string().optional(),
  geom: z
    .object({
      lat: z.string().optional(),
      lng: z.string().optional(),
    })
    .optional(),
  area: z.string().optional(),
  images: z.array(z.any()).optional(), // File objects for images
  families: z
    .array(
      z.object({
        head: z.string().min(1, "Family head is required"),
        members: z.array(z.string().min(1, "Family member name is required")),
      })
    )
    .optional(),
});
