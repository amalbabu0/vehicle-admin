import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type DuplicateVehicleMatch = {
  id: string;
  slug: string;
  name: string;
  status: Database["public"]["Enums"]["vehicle_status"];
};

/** Collapses lease-period formatting noise down to just the digits. Quick
 * Listing's lease period comes from free-text AI extraction (see
 * lib/ai/extract-vehicle.ts — the model is only told "always in months",
 * not given a fixed enum), so the exact same underlying message can come
 * back as "3-6 months" one time and "3 – 6 Months" (en dash, different
 * spacing/case) the next. Comparing digits-only avoids that formatting
 * noise defeating an otherwise-genuine duplicate match. */
function normalizeLeasePeriod(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/**
 * A lister re-submitting the exact same vehicle (most often: pasting the
 * same WhatsApp message into Quick Listing twice) should be told so rather
 * than getting a second draft. "Same vehicle" means lease amount and at
 * least one uploaded photo's content hash both match one of their own
 * active listings — the strongest, most deterministic signals available —
 * corroborated by lease period, location, and registration year wherever
 * both listings actually stated a value (any of those left blank on either
 * side is treated as unknown, not as a mismatch, since Quick Listing's
 * extraction can genuinely miss a field that was present the first time).
 *
 * Specs alone aren't enough to call it a duplicate — two different vehicles
 * can genuinely share a price — but price plus an identical photo is a safe
 * signal. Scoped to this lister only (not every lister site-wide) and to
 * active listings (excludes soft-deleted, sold, archived, and rejected ones
 * — relisting the same vehicle after one of those is legitimate).
 */
export async function findDuplicateVehicle(
  supabase: SupabaseClient<Database>,
  params: {
    listerId: string;
    leasePeriod: string;
    leaseAmount: number;
    locationId: string | null;
    registrationYear: number | null;
    imageHashes: (string | undefined)[];
  }
): Promise<DuplicateVehicleMatch | null> {
  const hashes = params.imageHashes.filter((hash): hash is string => Boolean(hash));
  if (hashes.length === 0) return null;

  const { data } = await supabase
    .from("vehicles")
    .select("id, slug, name, status, lease_period, location_id, registration_year, vehicle_images ( content_hash )")
    .eq("lister_id", params.listerId)
    .is("deleted_at", null)
    .in("status", ["draft", "pending_approval", "published"])
    .eq("lease_amount", params.leaseAmount)
    .limit(200);
  if (!data) return null;

  const targetPeriod = normalizeLeasePeriod(params.leasePeriod);

  type Candidate = DuplicateVehicleMatch & {
    lease_period: string;
    location_id: string | null;
    registration_year: number | null;
    vehicle_images: { content_hash: string | null }[];
  };

  for (const row of data as unknown as Candidate[]) {
    const periodConflicts = targetPeriod && normalizeLeasePeriod(row.lease_period) ? normalizeLeasePeriod(row.lease_period) !== targetPeriod : false;
    if (periodConflicts) continue;

    const locationConflicts = params.locationId && row.location_id ? row.location_id !== params.locationId : false;
    if (locationConflicts) continue;

    const yearConflicts = params.registrationYear != null && row.registration_year != null ? row.registration_year !== params.registrationYear : false;
    if (yearConflicts) continue;

    const existingHashes = new Set(row.vehicle_images.map((image) => image.content_hash).filter(Boolean));
    if (hashes.some((hash) => existingHashes.has(hash))) {
      return { id: row.id, slug: row.slug, name: row.name, status: row.status };
    }
  }
  return null;
}
