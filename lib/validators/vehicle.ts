import * as z from "zod";

export const vehicleCreateSchema = z.object({
  listingType: z.enum(["lease", "sale"]),
  name: z.string().min(1, "Vehicle name is required."),
  brand: z.string().min(1, "Brand is required."),
  year: z.string().min(1, "Year is required.").regex(/^[0-9]{4}$/, "Enter a valid 4-digit year."),
  leaseAmount: z.string().min(1, "Lease amount is required.").regex(/^[0-9]+$/, "Enter a numeric amount."),
  leasePeriod: z.string().min(1, "Lease period is required."),
  directOwner: z.preprocess((value) => value === "true" || value === true, z.boolean()),
  contactPhone: z.string().min(6, "Contact number is required."),
  serviceChargePercent: z.preprocess((value) => value === undefined || value === null || value === "" ? null : Number(value), z.number().min(0).max(100).nullable()),
  locationId: z.string().min(1, "Location is required."),
  description: z.string().min(10, "Description is required."),
  fuelType: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  registrationYear: z.preprocess((value) => value === undefined || value === null || value === "" ? null : Number(value), z.number().int().min(1900).max(new Date().getFullYear()).nullable()),
  ownershipCount: z.preprocess((value) => value === undefined || value === null || value === "" ? null : Number(value), z.number().int().nonnegative().nullable()),
  engineCapacity: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  features: z.string().optional().nullable(),
  imageUrls: z.string().min(1, "At least one vehicle image is required.").transform((value) => {
    try { return JSON.parse(value); } catch { return []; }
  }).pipe(z.array(z.string().url("Enter valid image URLs.")).min(1, "At least one valid image URL is required.")),
});

export type VehicleCreateInput = z.infer<typeof vehicleCreateSchema>;

export type QuickListing = {
  listingType?: "lease" | "sale"; name?: string; brand?: string; model?: string; year?: string;
  leaseAmount?: string; leasePeriod?: string; directOwner?: boolean; contactPhone?: string;
  serviceChargePercent?: string; locationId?: string; description?: string; fuelType?: string;
  transmission?: string; kmDriven?: string; registrationYear?: string; ownershipCount?: string;
  engineCapacity?: string; seats?: string; color?: string; condition?: string;
};

const vehicleBrands = ["Maruti Suzuki", "Mercedes-Benz", "Land Rover", "Volkswagen", "Mitsubishi", "Chevrolet", "Mahindra", "Hyundai", "Toyota", "Honda", "Tata", "Kia", "Nissan", "Renault", "Skoda", "BMW", "Audi", "Ford", "Jeep", "Volvo", "Lexus", "Porsche", "Jaguar", "MG", "BYD", "Fiat", "Isuzu"];

function labelledValue(text: string, labels: string[]): string | undefined {
  const labelsPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${labelsPattern})\\s*[:\\-–]?\\s*([^\\n]+)`, "im"));
  return match?.[1]?.trim().replace(/^[|•·]+|[|•·]+$/g, "") || undefined;
}

function numberFrom(value: string | undefined): string | undefined {
  const match = value?.match(/\d[\d,\s]*/);
  return match?.[0].replace(/[,\s]/g, "") || undefined;
}

function moneyFrom(value: string | undefined): string | undefined {
  const match = value?.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|crore|cr|k)?/i);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const multiplier = /^(lakh|lac)$/i.test(match[2] ?? "") ? 100_000
    : /^(crore|cr)$/i.test(match[2] ?? "") ? 10_000_000
    : /^k$/i.test(match[2] ?? "") ? 1_000 : 1;
  return String(Math.round(amount * multiplier));
}

/** Extracts common labelled and free-form fields from WhatsApp vehicle advertisements. */
export function parseQuickListing(text: string): QuickListing {
  const normalized = text.replace(/\r/g, "").replace(/\u00a0/g, " ").trim();
  if (!normalized) return {};
  const source = normalized.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "").replace(/\n\s*\n/g, "\n").trim();
  const lines = source.split("\n").map((line) => line.trim()).filter(Boolean);
  const listingType = /\b(for\s+sale|sale|selling|asking\s+price)\b/i.test(source) ? "sale" : "lease";
  const year = (labelledValue(source, ["year", "model year", "registration year"])?.match(/\b(19\d{2}|20\d{2})\b/) ?? source.match(/\b(19\d{2}|20\d{2})\b/))?.[1];
  const vehicleLine = labelledValue(source, ["vehicle", "car", "bike", "vehicle name"])
    ?? lines.find((line) => vehicleBrands.some((brand) => new RegExp(`\\b${brand.replace(" ", "\\s+")}\\b`, "i").test(line)))
    ?? lines.find((line) => /\b(19\d{2}|20\d{2})\b/.test(line) && !/(price|rent|lease|amount|km|phone|contact)/i.test(line))
    ?? lines.find((line) => !/(price|rent|lease|amount|km|phone|contact|location|owner)/i.test(line));
  const brand = vehicleBrands.find((candidate) => new RegExp(`\\b${candidate.replace(" ", "\\s+")}\\b`, "i").test(vehicleLine ?? source));
  const name = vehicleLine?.replace(/^[^A-Za-z0-9]*(?:for\s+)?(?:sale|lease)[:\-]?\s*/i, "").trim();
  const model = brand && name ? name.replace(new RegExp(`\\b${brand.replace(" ", "\\s+")}\\b`, "i"), "").replace(/\b(19\d{2}|20\d{2})\b/g, "").replace(/\s+/g, " ").trim() : undefined;
  const priceText = labelledValue(source, ["price", "rent", "lease", "lease amount", "monthly rent", "amount", "asking price"]) ?? source.match(/(?:₹|rs\.?|inr)\s*\d[\d,.\s]*(?:lakh|lac|crore|cr|k)?/i)?.[0];
  const periodText = labelledValue(source, ["period", "lease period", "tenure"]) ?? source.match(/\b(?:per\s*(?:month|week|day)|\d+\s*(?:months?|years?|days?))\b/i)?.[0];
  const phoneText = labelledValue(source, ["phone", "mobile", "contact", "call", "whatsapp"]) ?? source.match(/(?:\+?\d[\d\s()-]{7,}\d)/)?.[0];
  const ownerText = labelledValue(source, ["owner", "ownership", "seller"]);
  const directOwner = /\b(direct\s+owner|owner\s+direct|self\s+owner)\b/i.test(source) ? true : /\b(agent|dealer|broker|not\s+direct)\b/i.test(ownerText ?? source) ? false : undefined;
  const kmDriven = numberFrom(labelledValue(source, ["km", "kms", "kilometers", "odometer"]) ?? source.match(/\b\d[\d,]*\s*(?:km|kms|kilometers)\b/i)?.[0]);
  return {
    listingType, name, brand, model, year, registrationYear: year, leaseAmount: moneyFrom(priceText),
    leasePeriod: periodText?.replace(/^per\s+/i, "").trim(), directOwner, contactPhone: phoneText?.replace(/\D/g, ""),
    serviceChargePercent: numberFrom(labelledValue(source, ["service charge", "commission", "brokerage"]) ?? source.match(/\b\d+(?:\.\d+)?\s*%/i)?.[0]),
    locationId: labelledValue(source, ["location", "city", "area", "place"]), description: source,
    fuelType: labelledValue(source, ["fuel", "fuel type"]) ?? source.match(/\b(petrol|diesel|electric|hybrid|cng|lpg)\b/i)?.[1],
    transmission: labelledValue(source, ["transmission", "gearbox"]) ?? source.match(/\b(automatic|manual|amt|cvt)\b/i)?.[1],
    kmDriven, ownershipCount: numberFrom(labelledValue(source, ["owners", "owner count", "ownership"])),
    engineCapacity: labelledValue(source, ["engine", "engine capacity", "cc"]) ?? source.match(/\b\d{3,5}\s*cc\b/i)?.[0],
    seats: numberFrom(labelledValue(source, ["seats", "seating"])), color: labelledValue(source, ["color", "colour"]),
    condition: labelledValue(source, ["condition"]),
  };
}
