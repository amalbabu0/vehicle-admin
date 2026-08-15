import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getLocationLookup } from "@/lib/vehicles/location-lookup";
import type { Database } from "@/lib/supabase/database.types";

type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];

export type AdminListingRow = {
  id: string;
  name: string;
  slug: string;
  model: string | null;
  brandName: string | null;
  registrationYear: number | null;
  leaseAmount: number;
  leasePeriod: string;
  fuelType: string | null;
  transmission: string | null;
  districtName: string | null;
  listerName: string | null;
  status: VehicleStatus;
  createdAt: string;
  coverImageUrl: string | null;
  coverThumbnailUrl: string | null;
  featured: boolean;
  kmDriven: number | null;
  ownershipCount: number | null;
  condition: string | null;
  bookingStatus: Database["public"]["Enums"]["vehicle_booking_status"];
};

export type ListingsFilter = {
  tab?: "all" | "pending" | "approved" | "rejected" | "featured";
  status?: VehicleStatus;
  brandId?: string;
  categoryId?: string;
  fuelType?: string;
  transmission?: string;
  districtSlug?: string;
  listerId?: string;
  from?: string;
  to?: string;
  search?: string;
};

// admin_profiles must be disambiguated (!vehicles_lister_id_fkey) — vehicles
// has two FKs into admin_profiles (lister_id and approved_by), so an
// unqualified `admin_profiles ( ... )` embed is ambiguous to PostgREST and
// errors the whole query. That error was going unnoticed here because nothing
// downstream checked it, silently rendering as "0 listings found".
const LISTING_SELECT = `
  id, name, slug, model, registration_year, lease_amount, lease_period, fuel_type,
  transmission, status, created_at, location_id, lister_id, km_driven, ownership_count, condition, booking_status,
  brands ( name ),
  admin_profiles!vehicles_lister_id_fkey ( full_name ),
  vehicle_images ( url, thumbnail_url, is_cover, sort_order )
`;

type ListingRow = {
  id: string;
  name: string;
  slug: string;
  model: string | null;
  registration_year: number | null;
  lease_amount: number;
  lease_period: string;
  fuel_type: string | null;
  transmission: string | null;
  status: VehicleStatus;
  created_at: string;
  location_id: string | null;
  lister_id: string;
  km_driven: number | null;
  ownership_count: number | null;
  condition: string | null;
  booking_status: Database["public"]["Enums"]["vehicle_booking_status"];
  brands: { name: string } | null;
  admin_profiles: { full_name: string | null } | null;
  vehicle_images: { url: string; thumbnail_url: string | null; is_cover: boolean; sort_order: number }[];
};

async function getFeaturedIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "featured_listing_ids").maybeSingle();
  return Array.isArray(data?.value) ? (data.value as string[]) : [];
}

async function resolveDistrictLocationIds(slug: string): Promise<string[]> {
  const supabase = await createClient();
  const { data: district } = await supabase.from("locations").select("id").eq("slug", slug).is("parent_location_id", null).maybeSingle();
  if (!district) return [];
  const { data: taluks } = await supabase.from("locations").select("id").eq("parent_location_id", district.id);
  return [district.id, ...(taluks ?? []).map((t) => t.id)];
}

export async function getListingsPage(
  filter: ListingsFilter,
  page: number,
  pageSize: number
): Promise<{ listings: AdminListingRow[]; total: number }> {
  const supabase = await createClient();
  // Admin's own RLS (vehicles_select_admin) has no is_deleted restriction —
  // it sees everything, deliberately, so the Deleted Listings page
  // (getDeletedListingsPage below) can reuse the same select. This
  // function is specifically the *active* listings table, so the exclusion
  // has to happen here at the query level.
  let query = supabase.from("vehicles").select(LISTING_SELECT, { count: "exact" }).eq("is_deleted", false);

  // districtLocationIds only actually runs a query when the filter is set
  // (undefined otherwise) — folded into the same Promise.all as the other
  // two independent lookups rather than awaited afterward on its own.
  const [featuredIds, locations, districtLocationIds] = await Promise.all([
    getFeaturedIds(),
    getLocationLookup(),
    filter.districtSlug ? resolveDistrictLocationIds(filter.districtSlug) : Promise.resolve(undefined),
  ]);

  if (filter.tab === "pending") query = query.eq("status", "pending_approval");
  else if (filter.tab === "approved") query = query.eq("status", "published");
  else if (filter.tab === "rejected") query = query.eq("status", "rejected");
  else if (filter.tab === "featured") query = query.in("id", featuredIds.length ? featuredIds : ["00000000-0000-0000-0000-000000000000"]);

  if (filter.search?.trim()) {
    const safe = filter.search.replace(/[,()%]/g, " ").trim();
    query = query.ilike("name", `%${safe}%`);
  }
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.brandId) query = query.eq("brand_id", filter.brandId);
  if (filter.categoryId) query = query.eq("category_id", filter.categoryId);
  if (filter.fuelType) query = query.eq("fuel_type", filter.fuelType);
  if (filter.transmission) query = query.eq("transmission", filter.transmission);
  if (filter.listerId) query = query.eq("lister_id", filter.listerId);
  if (filter.from) query = query.gte("created_at", filter.from);
  if (filter.to) query = query.lte("created_at", filter.to);
  if (filter.districtSlug) {
    query = districtLocationIds?.length ? query.in("location_id", districtLocationIds) : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const from = (page - 1) * pageSize;
  query = query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);

  const { data, count } = await query;
  const rows = (data ?? []) as unknown as ListingRow[];
  const featuredSet = new Set(featuredIds);

  const listings: AdminListingRow[] = rows.map((row) => {
    const location = row.location_id ? locations.get(row.location_id) : undefined;
    const cover = row.vehicle_images.find((image) => image.is_cover) ?? [...row.vehicle_images].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      model: row.model,
      brandName: row.brands?.name ?? null,
      registrationYear: row.registration_year,
      leaseAmount: row.lease_amount,
      leasePeriod: row.lease_period,
      fuelType: row.fuel_type,
      transmission: row.transmission,
      districtName: location?.districtName ?? null,
      listerName: row.admin_profiles?.full_name ?? null,
      status: row.status,
      createdAt: row.created_at,
      coverImageUrl: cover?.url ?? null,
      coverThumbnailUrl: cover?.thumbnail_url ?? null,
      featured: featuredSet.has(row.id),
      kmDriven: row.km_driven,
      ownershipCount: row.ownership_count,
      condition: row.condition,
      bookingStatus: row.booking_status,
    };
  });

  return { listings, total: count ?? 0 };
}

// Deleted Listings (admin sees every lister's + admins' own deletions) —
// deliberately a separate select from LISTING_SELECT above rather than a
// tab within it: different columns entirely (who deleted it, when, days
// remaining), and admin_profiles needs disambiguating a third way since
// vehicles now has three FKs into it (lister_id, approved_by, deleted_by).
const DELETED_LISTING_SELECT = `
  id, name, slug, status, lease_amount, lease_period,
  deleted_at, deleted_by_role, permanent_delete_at,
  admin_profiles!vehicles_lister_id_fkey ( full_name ),
  deleted_by_profile:admin_profiles!vehicles_deleted_by_fkey ( full_name ),
  vehicle_images ( url, thumbnail_url, is_cover, sort_order )
`;

type DeletedListingRow = {
  id: string;
  name: string;
  slug: string;
  status: VehicleStatus;
  lease_amount: number;
  lease_period: string;
  deleted_at: string;
  deleted_by_role: Database["public"]["Enums"]["admin_role"] | null;
  permanent_delete_at: string;
  admin_profiles: { full_name: string | null } | null;
  deleted_by_profile: { full_name: string | null } | null;
  vehicle_images: { url: string; thumbnail_url: string | null; is_cover: boolean; sort_order: number }[];
};

export type DeletedListingItem = {
  id: string;
  name: string;
  slug: string;
  status: VehicleStatus;
  leaseAmount: number;
  leasePeriod: string;
  listerName: string | null;
  deletedByName: string | null;
  deletedByRole: Database["public"]["Enums"]["admin_role"] | null;
  deletedAt: string;
  permanentDeleteAt: string;
  coverImageUrl: string | null;
  coverThumbnailUrl: string | null;
};

// No pagination UI on this page (it's expected to stay small — the 10-day
// auto-cleanup cron naturally caps steady-state volume), but an unbounded
// select() is still a real query-cost ceiling risk if bulk-delete is used
// repeatedly within a 10-day window. 200 matches the cap already used for
// a single bulk action (see app/api/admin/listings/bulk/route.ts) as a
// sane "should never realistically be hit" ceiling — add real .range()
// pagination if it ever is.
const DELETED_LISTINGS_LIMIT = 200;

/** Every currently-soft-deleted listing, any lister — admin's own
 * vehicles_select_admin RLS policy has no is_deleted restriction, so this
 * is just the mirror-image filter of getListingsPage's is_deleted=false. */
export async function getDeletedListings(): Promise<DeletedListingItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select(DELETED_LISTING_SELECT)
    .eq("is_deleted", true)
    .order("deleted_at", { ascending: false })
    .limit(DELETED_LISTINGS_LIMIT);

  const rows = (data ?? []) as unknown as DeletedListingRow[];

  return rows.map((row) => {
    const cover = row.vehicle_images.find((image) => image.is_cover) ?? [...row.vehicle_images].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      leaseAmount: row.lease_amount,
      leasePeriod: row.lease_period,
      listerName: row.admin_profiles?.full_name ?? null,
      deletedByName: row.deleted_by_profile?.full_name ?? null,
      deletedByRole: row.deleted_by_role,
      deletedAt: row.deleted_at,
      permanentDeleteAt: row.permanent_delete_at,
      coverImageUrl: cover?.url ?? null,
      coverThumbnailUrl: cover?.thumbnail_url ?? null,
    };
  });
}

export type ListerOption = { id: string; name: string };

export async function getListerOptions(): Promise<ListerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_profiles").select("id, full_name").order("full_name");
  return (data ?? []).map((row) => ({ id: row.id, name: row.full_name ?? "Unnamed" }));
}
