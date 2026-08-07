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
  featured: boolean;
  kmDriven: number | null;
  ownershipCount: number | null;
  condition: string | null;
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

const LISTING_SELECT = `
  id, name, slug, model, registration_year, lease_amount, lease_period, fuel_type,
  transmission, status, created_at, location_id, lister_id, km_driven, ownership_count, condition,
  brands ( name ),
  admin_profiles ( full_name ),
  vehicle_images ( url, is_cover, sort_order )
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
  brands: { name: string } | null;
  admin_profiles: { full_name: string | null } | null;
  vehicle_images: { url: string; is_cover: boolean; sort_order: number }[];
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
  let query = supabase.from("vehicles").select(LISTING_SELECT, { count: "exact" });

  const [featuredIds, locations] = await Promise.all([getFeaturedIds(), getLocationLookup()]);

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
    const ids = await resolveDistrictLocationIds(filter.districtSlug);
    query = ids.length ? query.in("location_id", ids) : query.eq("id", "00000000-0000-0000-0000-000000000000");
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
      featured: featuredSet.has(row.id),
      kmDriven: row.km_driven,
      ownershipCount: row.ownership_count,
      condition: row.condition,
    };
  });

  return { listings, total: count ?? 0 };
}

export type ListerOption = { id: string; name: string };

export async function getListerOptions(): Promise<ListerOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_profiles").select("id, full_name").order("full_name");
  return (data ?? []).map((row) => ({ id: row.id, name: row.full_name ?? "Unnamed" }));
}
