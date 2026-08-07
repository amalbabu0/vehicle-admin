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
  featured: boolean;
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
  const [{ data }, locations, { data: featuredSetting }] = await Promise.all([
    supabase.from("vehicles").select(VEHICLE_SELECT).eq("lister_id", listerId).order("created_at", { ascending: false }),
    getLocationLookup(),
    // site_settings is publicly readable (RLS: using (true)), so this is a
    // plain select through the normal client, same admin-owned mechanism
    // the admin dashboard's Feature/Unfeature action already writes to.
    supabase.from("site_settings").select("value").eq("key", "featured_listing_ids").maybeSingle(),
  ]);

  const featuredIds = new Set(Array.isArray(featuredSetting?.value) ? (featuredSetting.value as string[]) : []);
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
      featured: featuredIds.has(row.id),
      rejectedReason: row.rejected_reason,
      districtName: row.location_id ? (locations.get(row.location_id)?.districtName ?? null) : null,
      coverImageUrl: cover?.url ?? null,
      createdAt: row.created_at,
    };
  });
}

export type ListerVehicleEditData = {
  id: string;
  brand: string;
  model: string | null;
  year: string;
  leaseAmount: string;
  leasePeriod: string;
  directOwner: boolean;
  contactPhone: string;
  serviceChargePercent: string;
  locationId: string;
  description: string;
  fuelType: string;
  transmission: string;
  engineCapacity: string;
  condition: string;
  features: string;
  imageUrls: string[];
};

const VEHICLE_EDIT_SELECT = `
  id, model, registration_year, lease_amount, lease_period, direct_owner, contact_phone,
  service_charge_percent, location_id, description, fuel_type, transmission,
  engine_capacity, condition, features,
  brands ( name ),
  vehicle_images ( url, is_cover, sort_order )
`;

type VehicleEditRow = {
  id: string;
  model: string | null;
  registration_year: number | null;
  lease_amount: number;
  lease_period: string;
  direct_owner: boolean;
  contact_phone: string;
  service_charge_percent: number | null;
  location_id: string | null;
  description: string | null;
  fuel_type: string | null;
  transmission: string | null;
  engine_capacity: string | null;
  condition: string | null;
  features: string[];
  brands: { name: string } | null;
  vehicle_images: { url: string; is_cover: boolean; sort_order: number }[];
};

/** RLS (vehicles_select_own) scopes this to the caller's own vehicle — a
 * mismatched listerId/id combination simply returns no row, not another
 * lister's data. */
export async function getListerVehicleForEdit(id: string, listerId: string): Promise<ListerVehicleEditData | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("vehicles").select(VEHICLE_EDIT_SELECT).eq("id", id).eq("lister_id", listerId).maybeSingle();
  if (!data) return null;

  const row = data as unknown as VehicleEditRow;
  const images = [...row.vehicle_images].sort((a, b) => (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0) || a.sort_order - b.sort_order);

  return {
    id: row.id,
    brand: row.brands?.name ?? "",
    model: row.model,
    year: row.registration_year ? String(row.registration_year) : "",
    leaseAmount: String(row.lease_amount),
    leasePeriod: row.lease_period,
    directOwner: row.direct_owner,
    contactPhone: row.contact_phone,
    serviceChargePercent: row.service_charge_percent != null ? String(row.service_charge_percent) : "",
    locationId: row.location_id ?? "",
    description: row.description ?? "",
    fuelType: row.fuel_type ?? "",
    transmission: row.transmission ?? "",
    engineCapacity: row.engine_capacity ?? "",
    condition: row.condition ?? "",
    features: row.features.join(", "),
    imageUrls: images.map((image) => image.url),
  };
}
