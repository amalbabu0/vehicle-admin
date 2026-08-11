import "server-only";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getLocationLookup } from "@/lib/vehicles/location-lookup";

export type ListerStats = {
  /** Count of this lister's own published vehicles — shown on the
   * dashboard as "Total Vehicles". */
  published: number;
};

/** Scoped to the current lister's own vehicles via the normal cookie-bound
 * client — RLS (vehicles_select_own) already restricts this count to rows
 * where lister_id = auth.uid(), so there's no need for (and no risk of
 * accidentally using) the service-role client. */
export async function getListerStats(listerId: string): Promise<ListerStats> {
  const supabase = await createClient();
  const { count: published } = await supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("lister_id", listerId)
    .eq("status", "published")
    .eq("is_deleted", false);

  return { published: published ?? 0 };
}

/** user_profiles holds only role="user" accounts — admin and lister
 * accounts live in the separate admin_profiles table (see migration 0004)
 * — so a plain row count here is already exactly "number of users", no
 * role filter needed. RLS on user_profiles only lets a row's own owner or
 * an admin read it, so a lister's cookie-bound client would see zero rows;
 * the service-role client is used here only for this narrow, PII-free
 * aggregate count, matching the file's documented "privileged operation
 * already authorized by an explicit role check in the caller" use case —
 * this function is only ever called from the authenticated lister
 * dashboard page. */
export async function getPublicUserCount(): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count } = await supabase.from("user_profiles").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export type ListerRecentVehicle = {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  model: string | null;
  status: string;
  createdAt: string;
  leaseAmount: number;
  leasePeriod: string;
  registrationYear: number | null;
  districtName: string | null;
  coverImageUrl: string | null;
  coverThumbnailUrl: string | null;
  // Same reasoning as ListerVehicleRow: the share message needs the whole
  // listing, not just what the card renders.
  fuelType: string | null;
  transmission: string | null;
  kmDriven: number | null;
  ownershipCount: number | null;
  condition: string | null;
  directOwner: boolean;
  serviceChargePercent: number | null;
  contactPhone: string;
};

type RecentVehicleRow = {
  id: string;
  name: string;
  slug: string;
  model: string | null;
  status: string;
  created_at: string;
  lease_amount: number;
  lease_period: string;
  registration_year: number | null;
  location_id: string | null;
  fuel_type: string | null;
  transmission: string | null;
  km_driven: number | null;
  ownership_count: number | null;
  condition: string | null;
  direct_owner: boolean;
  service_charge_percent: number | null;
  contact_phone: string;
  brands: { name: string } | null;
  vehicle_images: { url: string; thumbnail_url: string | null; is_cover: boolean; sort_order: number }[];
};

export async function getListerRecentVehicles(listerId: string, limit = 5): Promise<ListerRecentVehicle[]> {
  const supabase = await createClient();
  const [{ data }, locations] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        `id, name, slug, model, status, created_at, lease_amount, lease_period, registration_year, location_id,
         fuel_type, transmission, km_driven, ownership_count, condition,
         direct_owner, service_charge_percent, contact_phone,
         brands ( name ),
         vehicle_images ( url, thumbnail_url, is_cover, sort_order )`
      )
      .eq("lister_id", listerId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit),
    getLocationLookup(),
  ]);

  const rows = (data ?? []) as unknown as RecentVehicleRow[];

  return rows.map((row) => {
    const cover = row.vehicle_images.find((image) => image.is_cover) ?? [...row.vehicle_images].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      brandName: row.brands?.name ?? null,
      model: row.model,
      status: row.status,
      createdAt: row.created_at,
      leaseAmount: row.lease_amount,
      leasePeriod: row.lease_period,
      registrationYear: row.registration_year,
      districtName: row.location_id ? (locations.get(row.location_id)?.districtName ?? null) : null,
      coverImageUrl: cover?.url ?? null,
      coverThumbnailUrl: cover?.thumbnail_url ?? null,
      fuelType: row.fuel_type,
      transmission: row.transmission,
      kmDriven: row.km_driven,
      ownershipCount: row.ownership_count,
      condition: row.condition,
      directOwner: row.direct_owner,
      serviceChargePercent: row.service_charge_percent,
      contactPhone: row.contact_phone,
    };
  });
}
