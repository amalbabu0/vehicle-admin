import * as z from "zod";

export const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "LPG", "Electric", "Hybrid", "Hydrogen"] as const;

export const TRANSMISSIONS = [
  "Manual", "Automatic (AT)", "AMT", "CVT", "DCT", "iMT", "Tiptronic", "Sequential", "Semi-Automatic",
] as const;

// Accepts either shape: a plain URL string (legacy — kept so any caller
// that isn't updated to the multi-size pipeline still works, per "existing
// uploads should continue to work") or the {url, mediumUrl, thumbnailUrl}
// triple the current upload endpoint returns. Both normalize to the object
// shape, so every consumer downstream (the vehicles insert/update routes)
// can assume one consistent shape regardless of caller.
const imageEntrySchema = z
  .union([
    z.string().url("Enter a valid image URL."),
    z.object({
      url: z.string().url("Enter a valid image URL."),
      mediumUrl: z.string().url().optional(),
      thumbnailUrl: z.string().url().optional(),
    }),
  ])
  .transform((entry) => (typeof entry === "string" ? { url: entry, mediumUrl: undefined, thumbnailUrl: undefined } : entry));

export type VehicleImageEntry = z.infer<typeof imageEntrySchema>;

export const vehicleCreateSchema = z.object({
  brand: z.string().min(1, "Brand is required."),
  model: z.string().min(1, "Model is required."),
  year: z.string().min(1, "Year is required.").regex(/^[0-9]{4}$/, "Enter a valid 4-digit year."),
  leaseAmount: z.string().min(1, "Lease amount is required.").regex(/^[0-9]+$/, "Enter a numeric amount."),
  leasePeriod: z.string().min(1, "Lease period is required."),
  directOwner: z.preprocess((value) => value === "true" || value === true, z.boolean()),
  contactPhone: z.string().min(6, "Contact number is required."),
  serviceChargePercent: z.preprocess((value) => value === undefined || value === null || value === "" ? null : Number(value), z.number().min(0).max(100).nullable()),
  locationId: z.string().min(1, "Location is required."),
  description: z.string().optional().nullable(),
  fuelType: z.enum(FUEL_TYPES, { message: "Select a fuel type." }),
  transmission: z.enum(TRANSMISSIONS, { message: "Select a transmission." }),
  registrationYear: z.preprocess((value) => value === undefined || value === null || value === "" ? null : Number(value), z.number().int().min(1900).max(new Date().getFullYear()).nullable()),
  engineCapacity: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  features: z.string().optional().nullable(),
  imageUrls: z.string().min(1, "At least one vehicle image is required.").transform((value) => {
    try { return JSON.parse(value); } catch { return []; }
  }).pipe(z.array(imageEntrySchema).min(1, "At least one valid image URL is required.").max(20, "You can upload up to 20 images per listing.")),
});

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
