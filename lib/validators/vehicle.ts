import * as z from "zod";
import indiaCarBrands from "@/lib/data/india-car-brands.json";

export const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "LPG", "Electric", "Hybrid", "Hydrogen"] as const;

export const TRANSMISSIONS = [
  "Manual", "Automatic (AT)", "AMT", "CVT", "DCT", "iMT", "Tiptronic", "Sequential", "Semi-Automatic",
] as const;

export const vehicleCreateSchema = z.object({
  listingType: z.enum(["lease", "sale"]),
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

export type QuickListing = {
  listingType?: "lease" | "sale"; name?: string; brand?: string; model?: string; year?: string;
  leaseAmount?: string; leasePeriod?: string; directOwner?: boolean; contactPhone?: string;
  serviceChargePercent?: string; locationId?: string; description?: string; fuelType?: string;
  transmission?: string; kmDriven?: string; registrationYear?: string; ownershipCount?: string;
  engineCapacity?: string; seats?: string; color?: string; condition?: string;
};

const vehicleBrands = indiaCarBrands.brands.map((brand) => brand.name);

// Real-world ads very often name only the model ("2021 WAGONR VXI") and
// never the manufacturer — sorted longest-first so e.g. "Grand i10 Nios"
// matches before the plainer "i10" would.
const modelToBrand = new Map(
  indiaCarBrands.brands
    .flatMap((brand) => brand.models.map((model) => [model, brand.name] as const))
    .sort((a, b) => b[0].length - a[0].length)
);

function bareWordPattern(value: string): string {
  // Matches "WagonR" against "WAGONR" or "Wagon R" — real ads are
  // inconsistent about spacing/casing that the source name doesn't have.
  return value.split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*");
}

function findModelMatch(text: string): { brand: string; model: string } | undefined {
  for (const [model, brand] of modelToBrand) {
    if (new RegExp(`\\b${bareWordPattern(model)}\\b`, "i").test(text)) {
      return { brand, model };
    }
  }
  return undefined;
}

function labelledValue(text: string, labels: string[]): string | undefined {
  // Regex alternation tries left-to-right and stops at the first match —
  // without sorting longest-first, a bare label like "lease" matches the
  // start of "Lease Period:" before the more specific "lease amount" ever
  // gets a chance, silently capturing the wrong line's value.
  const labelsPattern = [...labels]
    .sort((a, b) => b.length - a.length)
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:${labelsPattern})\\s*[:\\-–]?\\s*([^\\n]+)`, "im"));
  return match?.[1]?.trim().replace(/^[|•·]+|[|•·]+$/g, "") || undefined;
}

const fuelTypeAliases: Record<string, (typeof FUEL_TYPES)[number]> = {
  petrol: "Petrol", diesel: "Diesel", cng: "CNG", lpg: "LPG",
  electric: "Electric", ev: "Electric", hybrid: "Hybrid", hydrogen: "Hydrogen",
};

const transmissionAliases: Record<string, (typeof TRANSMISSIONS)[number]> = {
  manual: "Manual", mt: "Manual", automatic: "Automatic (AT)", auto: "Automatic (AT)", at: "Automatic (AT)",
  amt: "AMT", cvt: "CVT", dct: "DCT", imt: "iMT", tiptronic: "Tiptronic",
  sequential: "Sequential", "semi-automatic": "Semi-Automatic", "semi automatic": "Semi-Automatic",
};

function normalizeFuelType(value: string | undefined): (typeof FUEL_TYPES)[number] | undefined {
  return value ? fuelTypeAliases[value.trim().toLowerCase()] : undefined;
}

function normalizeTransmission(value: string | undefined): (typeof TRANSMISSIONS)[number] | undefined {
  return value ? transmissionAliases[value.trim().toLowerCase()] : undefined;
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
    ?? lines.find((line) => findModelMatch(line))
    ?? lines.find((line) => /\b(19\d{2}|20\d{2})\b/.test(line) && !/(price|rent|lease|amount|km|phone|contact)/i.test(line))
    ?? lines.find((line) => !/(price|rent|lease|amount|km|phone|contact|location|owner)/i.test(line));
  const directBrandMatch = vehicleBrands.find((candidate) => new RegExp(`\\b${candidate.replace(" ", "\\s+")}\\b`, "i").test(vehicleLine ?? source));
  // Ads frequently name only the model ("2021 WAGONR VXI") and never the
  // manufacturer — infer both from the known model list when a direct
  // brand name isn't present.
  const modelMatch = findModelMatch(vehicleLine ?? source);
  const brand = directBrandMatch ?? modelMatch?.brand;
  const name = vehicleLine?.replace(/^[^A-Za-z0-9]*(?:for\s+)?(?:sale|lease)[:\-]?\s*/i, "").trim();
  const model = modelMatch?.model
    ?? (brand && name ? name.replace(new RegExp(`\\b${brand.replace(" ", "\\s+")}\\b`, "i"), "").replace(/\b(19\d{2}|20\d{2})\b/g, "").replace(/\s+/g, " ").trim() : undefined);
  // Bare "lease" deliberately excluded — it would match the start of
  // "Lease Period:" before ever reaching "Lease Amount:" later in the
  // text, since labelledValue finds the first matching line, not the
  // most specific one. "lease amount" alone is unambiguous.
  const priceText = labelledValue(source, ["price", "rent", "lease amount", "monthly rent", "amount", "asking price"]) ?? source.match(/(?:₹|rs\.?|inr)\s*\d[\d,.\s]*(?:lakh|lac|crore|cr|k)?/i)?.[0];
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
    fuelType: normalizeFuelType(labelledValue(source, ["fuel", "fuel type"]) ?? source.match(/\b(petrol|diesel|electric|hybrid|cng|lpg)\b/i)?.[1]),
    transmission: normalizeTransmission(labelledValue(source, ["transmission", "gearbox"]) ?? source.match(/\b(automatic|manual|amt|cvt|dct|imt|tiptronic)\b/i)?.[1]),
    kmDriven, ownershipCount: numberFrom(labelledValue(source, ["owners", "owner count", "ownership"])),
    engineCapacity: labelledValue(source, ["engine", "engine capacity", "cc"]) ?? source.match(/\b\d{3,5}\s*cc\b/i)?.[0],
    seats: numberFrom(labelledValue(source, ["seats", "seating"])), color: labelledValue(source, ["color", "colour"]),
    condition: labelledValue(source, ["condition"]),
  };
}
