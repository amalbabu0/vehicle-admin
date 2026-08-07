import * as z from "zod";

export const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "LPG", "Electric", "Hybrid", "Hydrogen"] as const;

export const TRANSMISSIONS = [
  "Manual", "Automatic (AT)", "AMT", "CVT", "DCT", "iMT", "Tiptronic", "Sequential", "Semi-Automatic",
] as const;

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
  }).pipe(z.array(z.string().url("Enter valid image URLs.")).min(1, "At least one valid image URL is required.")),
});

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;
