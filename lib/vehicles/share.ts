// Pure formatting helpers — no env/server imports, so this is safe to use
// from both the vehicles list Server Component (which computes the public
// URL) and any client component that needs to re-render the message.

export type ShareableVehicle = {
  name: string;
  brandName: string | null;
  model: string | null;
  registrationYear: number | null;
  leaseAmount: number;
  leasePeriod: string;
  fuelType: string | null;
  transmission: string | null;
  kmDriven: number | null;
  ownershipCount: number | null;
  districtName: string | null;
  condition: string | null;
  slug: string;
  /** Optional so the admin-side callers, which fetch a narrower row, still
   * compile — they simply omit these lines. The lister paths pass all three,
   * since a lease listing without the fee and a contact number is missing the
   * two things a prospective lessee acts on. */
  directOwner?: boolean | null;
  serviceChargePercent?: number | null;
  contactPhone?: string | null;
};

const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029Vb7g7FCICVfuoWjwAR3A";

const OWNERSHIP_ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];

export function formatOwnership(count: number | null): string | null {
  if (!count || count < 1) return null;
  const label = OWNERSHIP_ORDINALS[count - 1] ?? `${count}th`;
  return `${label} Owner`;
}

/**
 * WhatsApp-flavored Markdown: *bold*, no headings/links syntax.
 *
 * Deliberately mirrors the layout listers already post by hand in the
 * WhatsApp channel (🚨 FOR LEASE header, uppercase labels, ₹.../- amounts),
 * so a shared listing reads as native there rather than as obviously
 * machine-generated. Every line except the amount and duration is
 * conditional — a listing that never captured, say, fuel type just omits
 * that row instead of printing an empty label.
 */
export function buildVehicleShareMessage(vehicle: ShareableVehicle, publicUrl: string): string {
  const title = [vehicle.brandName, vehicle.model].filter(Boolean).join(" ") || vehicle.name;

  const lines = [`🚨 *FOR LEASE – ${title.toUpperCase()}* 🚨`, ""];

  if (vehicle.registrationYear) lines.push(`🗓️ MODEL : ${vehicle.registrationYear}`);
  if (vehicle.fuelType) lines.push(`⛽ FUEL : ${vehicle.fuelType}`);
  if (vehicle.transmission) lines.push(`⚙️ TRANSMISSION : ${vehicle.transmission}`);
  if (vehicle.kmDriven != null) lines.push(`🛣️ KM DRIVEN : ${vehicle.kmDriven.toLocaleString("en-IN")} km`);
  if (vehicle.condition) lines.push(`❗ ${vehicle.condition.toUpperCase()}`);

  lines.push(
    `💰 LEASE AMOUNT : ₹${vehicle.leaseAmount.toLocaleString("en-IN")}/-`,
    `⏳ LEASING DURATION : ${vehicle.leasePeriod}`
  );

  if (vehicle.districtName) lines.push(`📍 LOCATION : ${vehicle.districtName}`);

  // Direct owner and Nth owner are different facts: the first is who you'd
  // be leasing from, the second is the vehicle's history. Show whichever
  // the listing actually recorded.
  const ownership = formatOwnership(vehicle.ownershipCount);
  if (vehicle.directOwner) lines.push("👤 DIRECT OWNER");
  else if (ownership) lines.push(`👤 OWNER : ${ownership}`);

  if (vehicle.serviceChargePercent) lines.push(`💼 SERVICE CHARGE : ${vehicle.serviceChargePercent}%`);
  if (vehicle.contactPhone) lines.push(`📞 CONTACT : ${vehicle.contactPhone}`);

  lines.push(
    "",
    "🔗 View Vehicle",
    publicUrl,
    "",
    "📢 Join our WhatsApp Channel for more listings",
    WHATSAPP_CHANNEL_URL,
    "",
    "_Powered by Kerala Lease Hub_"
  );

  return lines.join("\n");
}

/** wa.me with no phone segment opens WhatsApp's own chat/contact/group
 * picker — this is the whole point: never pick a recipient for the admin. */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
