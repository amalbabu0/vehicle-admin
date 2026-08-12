import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type DuplicateVehicleMatch = {
  id: string;
  slug: string;
  name: string;
  status: Database["public"]["Enums"]["vehicle_status"];
};

/**
 * A lister re-submitting the exact same vehicle (most often: pasting the
 * same WhatsApp message into Quick Listing twice) should be told so rather
 * than getting a second draft. "Same vehicle" means every one of lease
 * period, lease amount, location, and registration year matches one of
 * their own active listings, AND at least one uploaded photo's content hash
 * matches a photo already on that listing.
 *
 * Specs alone aren't enough to call it a duplicate — two different vehicles
 * can genuinely share a price/year/location — but specs plus an identical
 * photo is a safe signal. Scoped to this lister only (not every lister site-
 * wide) and to active listings (excludes soft-deleted, sold, archived, and
 * rejected ones — relisting the same vehicle after one of those is
 * legitimate, not a mistake).
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

  let query = supabase
    .from("vehicles")
    .select("id, slug, name, status, vehicle_images ( content_hash )")
    .eq("lister_id", params.listerId)
    .is("deleted_at", null)
    .in("status", ["draft", "pending_approval", "published"])
    .eq("lease_period", params.leasePeriod)
    .eq("lease_amount", params.leaseAmount);

  query = params.locationId ? query.eq("location_id", params.locationId) : query.is("location_id", null);
  query = params.registrationYear != null ? query.eq("registration_year", params.registrationYear) : query.is("registration_year", null);

  const { data } = await query;
  if (!data) return null;

  type Candidate = DuplicateVehicleMatch & { vehicle_images: { content_hash: string | null }[] };
  for (const row of data as unknown as Candidate[]) {
    const existingHashes = new Set(row.vehicle_images.map((image) => image.content_hash).filter(Boolean));
    if (hashes.some((hash) => existingHashes.has(hash))) {
      return { id: row.id, slug: row.slug, name: row.name, status: row.status };
    }
  }
  return null;
}
