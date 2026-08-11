import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getLocationLookup } from "@/lib/vehicles/location-lookup";
import type { Database } from "@/lib/supabase/database.types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
type BookingStatus = Database["public"]["Enums"]["vehicle_booking_status"];

export type ListerVehicleRow = {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  model: string | null;
  registrationYear: number | null;
  leaseAmount: number;
  leasePeriod: string;
  status: VehicleStatus;
  bookingStatus: BookingStatus;
  featured: boolean;
  rejectedReason: string | null;
  districtName: string | null;
  coverImageUrl: string | null;
  coverThumbnailUrl: string | null;
  createdAt: string;
  // Carried so the WhatsApp share message can include everything the
  // listing actually recorded — see lib/vehicles/share.ts. Adding them to
  // the existing select costs no extra round trip.
  fuelType: string | null;
  transmission: string | null;
  kmDriven: number | null;
  ownershipCount: number | null;
  condition: string | null;
  directOwner: boolean;
  serviceChargePercent: number | null;
  contactPhone: string;
};

const VEHICLE_SELECT = `
  id, name, slug, model, registration_year, lease_amount, lease_period, status, booking_status, rejected_reason,
  location_id, created_at, fuel_type, transmission, km_driven, ownership_count, condition,
  direct_owner, service_charge_percent, contact_phone,
  brands ( name ),
  vehicle_images ( url, thumbnail_url, is_cover, sort_order )
`;

type VehicleRow = {
  id: string;
  name: string;
  slug: string;
  model: string | null;
  registration_year: number | null;
  lease_amount: number;
  lease_period: string;
  status: VehicleStatus;
  booking_status: BookingStatus;
  rejected_reason: string | null;
  location_id: string | null;
  created_at: string;
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

// No pagination UI on the My Vehicles / Deleted Listings pages — safety
// ceiling on an otherwise-unbounded select() rather than a real limit,
// same reasoning as DELETED_LISTINGS_LIMIT in lib/admin/listings-data.ts.
const LISTER_VEHICLES_LIMIT = 200;

/** RLS (vehicles_select_own) scopes this to the signed-in lister's own
 * vehicles via the normal cookie-bound client — same reasoning as
 * dashboard-data.ts, no service-role client needed. */
export async function getListerVehicles(listerId: string): Promise<ListerVehicleRow[]> {
  const supabase = await createClient();
  const [{ data }, locations, { data: featuredSetting }] = await Promise.all([
    supabase
      .from("vehicles")
      .select(VEHICLE_SELECT)
      .eq("lister_id", listerId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(LISTER_VEHICLES_LIMIT),
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
      model: row.model,
      registrationYear: row.registration_year,
      leaseAmount: row.lease_amount,
      leasePeriod: row.lease_period,
      status: row.status,
      bookingStatus: row.booking_status,
      featured: featuredIds.has(row.id),
      rejectedReason: row.rejected_reason,
      districtName: row.location_id ? (locations.get(row.location_id)?.districtName ?? null) : null,
      coverImageUrl: cover?.url ?? null,
      coverThumbnailUrl: cover?.thumbnail_url ?? null,
      createdAt: row.created_at,
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

export type ListerDeletedVehicle = {
  id: string;
  name: string;
  slug: string;
  status: VehicleStatus;
  leaseAmount: number;
  leasePeriod: string;
  deletedByName: string | null;
  deletedByRole: Database["public"]["Enums"]["admin_role"] | null;
  deletedAt: string;
  permanentDeleteAt: string;
  coverImageUrl: string | null;
  coverThumbnailUrl: string | null;
};

const DELETED_VEHICLE_SELECT = `
  id, name, slug, status, lease_amount, lease_period,
  deleted_at, deleted_by_role, permanent_delete_at,
  deleted_by_profile:admin_profiles!vehicles_deleted_by_fkey ( full_name ),
  vehicle_images ( url, thumbnail_url, is_cover, sort_order )
`;

type DeletedVehicleRow = {
  id: string;
  name: string;
  slug: string;
  status: VehicleStatus;
  lease_amount: number;
  lease_period: string;
  deleted_at: string;
  deleted_by_role: Database["public"]["Enums"]["admin_role"] | null;
  permanent_delete_at: string;
  deleted_by_profile: { full_name: string | null } | null;
  vehicle_images: { url: string; thumbnail_url: string | null; is_cover: boolean; sort_order: number }[];
};

/** RLS (vehicles_select_own) scopes this to the caller's own vehicles —
 * a lister can never see another lister's deleted listings through this,
 * regardless of what id is passed anywhere else in the app (see
 * migration 0022 — the select policy isn't restricted by is_deleted, the
 * ownership check is what actually keeps this scoped). */
export async function getListerDeletedVehicles(listerId: string): Promise<ListerDeletedVehicle[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select(DELETED_VEHICLE_SELECT)
    .eq("lister_id", listerId)
    .eq("is_deleted", true)
    .order("deleted_at", { ascending: false })
    .limit(LISTER_VEHICLES_LIMIT);

  const rows = (data ?? []) as unknown as DeletedVehicleRow[];

  return rows.map((row) => {
    const cover = row.vehicle_images.find((image) => image.is_cover) ?? [...row.vehicle_images].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      leaseAmount: row.lease_amount,
      leasePeriod: row.lease_period,
      deletedByName: row.deleted_by_profile?.full_name ?? null,
      deletedByRole: row.deleted_by_role,
      deletedAt: row.deleted_at,
      permanentDeleteAt: row.permanent_delete_at,
      coverImageUrl: cover?.url ?? null,
      coverThumbnailUrl: cover?.thumbnail_url ?? null,
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
  imageUrls: { url: string; mediumUrl?: string; thumbnailUrl?: string }[];
};

const VEHICLE_EDIT_SELECT = `
  id, model, registration_year, lease_amount, lease_period, direct_owner, contact_phone,
  service_charge_percent, location_id, description, fuel_type, transmission,
  engine_capacity, condition, features,
  brands ( name ),
  vehicle_images ( url, medium_url, thumbnail_url, is_cover, sort_order )
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
  vehicle_images: { url: string; medium_url: string | null; thumbnail_url: string | null; is_cover: boolean; sort_order: number }[];
};

/** RLS (vehicles_select_own) scopes this to the caller's own vehicle — a
 * mismatched listerId/id combination simply returns no row, not another
 * lister's data. Excludes soft-deleted rows deliberately: a listing has to
 * be restored before it can be edited again. */
export async function getListerVehicleForEdit(id: string, listerId: string): Promise<ListerVehicleEditData | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select(VEHICLE_EDIT_SELECT)
    .eq("id", id)
    .eq("lister_id", listerId)
    .eq("is_deleted", false)
    .maybeSingle();
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
    imageUrls: images.map((image) => ({
      url: image.url,
      mediumUrl: image.medium_url ?? undefined,
      thumbnailUrl: image.thumbnail_url ?? undefined,
    })),
  };
}
