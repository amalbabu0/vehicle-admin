import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getLocationLookup } from "@/lib/vehicles/location-lookup";
import type { Database } from "@/lib/supabase/database.types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

export type ListerVehicleRow = {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  registrationYear: number | null;
  leaseAmount: number;
  leasePeriod: string;
  status: VehicleStatus;
  rejectedReason: string | null;
  districtName: string | null;
  coverImageUrl: string | null;
  createdAt: string;
};

const VEHICLE_SELECT = `
  id, name, slug, registration_year, lease_amount, lease_period, status, rejected_reason,
  location_id, created_at,
  brands ( name ),
  vehicle_images ( url, is_cover, sort_order )
`;

type VehicleRow = {
  id: string;
  name: string;
  slug: string;
  registration_year: number | null;
  lease_amount: number;
  lease_period: string;
  status: VehicleStatus;
  rejected_reason: string | null;
  location_id: string | null;
  created_at: string;
  brands: { name: string } | null;
  vehicle_images: { url: string; is_cover: boolean; sort_order: number }[];
};

/** RLS (vehicles_select_own) scopes this to the signed-in lister's own
 * vehicles via the normal cookie-bound client — same reasoning as
 * dashboard-data.ts, no service-role client needed. */
export async function getListerVehicles(listerId: string): Promise<ListerVehicleRow[]> {
  const supabase = await createClient();
  const [{ data }, locations] = await Promise.all([
    supabase.from("vehicles").select(VEHICLE_SELECT).eq("lister_id", listerId).order("created_at", { ascending: false }),
    getLocationLookup(),
  ]);

  const rows = (data ?? []) as unknown as VehicleRow[];

  return rows.map((row) => {
    const cover = row.vehicle_images.find((image) => image.is_cover) ?? [...row.vehicle_images].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      brandName: row.brands?.name ?? null,
      registrationYear: row.registration_year,
      leaseAmount: row.lease_amount,
      leasePeriod: row.lease_period,
      status: row.status,
      rejectedReason: row.rejected_reason,
      districtName: row.location_id ? (locations.get(row.location_id)?.districtName ?? null) : null,
      coverImageUrl: cover?.url ?? null,
      createdAt: row.created_at,
    };
  });
}
