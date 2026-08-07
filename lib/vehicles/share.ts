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
};

const OWNERSHIP_ORDINALS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth"];

export function formatOwnership(count: number | null): string | null {
  if (!count || count < 1) return null;
  const label = OWNERSHIP_ORDINALS[count - 1] ?? `${count}th`;
  return `${label} Owner`;
}

/** WhatsApp-flavored Markdown: *bold*, no headings/links syntax. */
export function buildVehicleShareMessage(vehicle: ShareableVehicle, publicUrl: string): string {
  const title = [vehicle.brandName, vehicle.model].filter(Boolean).join(" ") || vehicle.name;
  const heading = vehicle.registrationYear ? `${title} ${vehicle.registrationYear}` : title;

  const lines = [`🚗 *${heading}*`, "", `💰 Price: ₹${vehicle.leaseAmount.toLocaleString("en-IN")} / ${vehicle.leasePeriod}`];

  if (vehicle.registrationYear) lines.push(`📅 Year: ${vehicle.registrationYear}`);
  if (vehicle.fuelType) lines.push(`⛽ Fuel: ${vehicle.fuelType}`);
  if (vehicle.transmission) lines.push(`⚙️ Transmission: ${vehicle.transmission}`);
  if (vehicle.kmDriven != null) lines.push(`🛣️ KM Driven: ${vehicle.kmDriven.toLocaleString("en-IN")} km`);

  const ownership = formatOwnership(vehicle.ownershipCount);
  if (ownership) lines.push(`👤 Owner: ${ownership}`);
  if (vehicle.districtName) lines.push(`📍 Location: ${vehicle.districtName}`);
  if (vehicle.condition) lines.push(`✨ Condition: ${vehicle.condition}`);

  lines.push("", "🔗 View Vehicle", publicUrl, "", "_Powered by Kerala Lease Hub_");

  return lines.join("\n");
}

/** wa.me with no phone segment opens WhatsApp's own chat/contact/group
 * picker — this is the whole point: never pick a recipient for the admin. */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
