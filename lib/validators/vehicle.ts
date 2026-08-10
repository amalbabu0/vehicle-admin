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

/** Optional-string helper: treats "" the same as "not provided", so a field
 * the lister left blank doesn't fail validation. */
const blankable = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());

/**
 * Quick Listing's submit schema. Deliberately far more permissive than
 * vehicleCreateSchema above: a pasted WhatsApp message often won't mention
 * the year, fuel type, transmission or location, and the lister shouldn't
 * be forced to invent them just to save what the message *did* contain.
 *
 * The required set here is exactly what the `vehicles` table physically
 * cannot store as null — contact_phone, lease_amount, lease_period, and
 * name (built from brand + model). Everything else is nullable at the DB
 * level and is written as null when absent.
 *
 * vehicleCreateSchema is untouched and still governs the Detailed Listing
 * form and PUT /api/vehicles/[id].
 */
export const quickVehicleCreateSchema = z.object({
  brand: z.string().trim().min(1, "Brand is required."),
  model: z.string().trim().min(1, "Model is required."),
  contactPhone: z.string().trim().min(6, "Contact number is required."),
  leaseAmount: z.string().trim().min(1, "Lease amount is required.").regex(/^[0-9]+$/, "Enter a numeric amount."),
  leasePeriod: z.string().trim().min(1, "Lease period is required."),

  year: blankable(z.string().regex(/^[0-9]{4}$/, "Enter a valid 4-digit year.")),
  locationId: blankable(z.string()),
  fuelType: blankable(z.enum(FUEL_TYPES)),
  transmission: blankable(z.enum(TRANSMISSIONS)),
  description: blankable(z.string()),
  engineCapacity: blankable(z.string()),
  condition: blankable(z.string()),
  features: blankable(z.string()),
  directOwner: z.preprocess((value) => value === "true" || value === true, z.boolean()),
  serviceChargePercent: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? null : Number(value)),
    z.number().min(0).max(100).nullable()
  ),
  imageUrls: z.array(imageEntrySchema).min(1, "At least one vehicle image is required.").max(20),
});

export type QuickVehicleCreateInput = z.infer<typeof quickVehicleCreateSchema>;
