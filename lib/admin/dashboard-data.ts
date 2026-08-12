import "server-only";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getLocationLookup } from "@/lib/vehicles/location-lookup";

export type DashboardStats = {
  totalUsers: number;
  totalListings: number;
  pendingListings: number;
  approvedListings: number;
  rejectedListings: number;
  featuredListings: number;
  newListingsToday: number;
  activeUsers: number;
};

const STATUS_COLUMN_QUERY = (status: string) => ({ status });

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { count: totalUsers },
    { count: totalListings },
    { count: pendingListings },
    { count: approvedListings },
    { count: rejectedListings },
    { data: featuredSetting },
    { count: newListingsToday },
    activeUsers,
  ] = await Promise.all([
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("is_deleted", false),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).match(STATUS_COLUMN_QUERY("pending_approval")).eq("is_deleted", false),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).match(STATUS_COLUMN_QUERY("published")).eq("is_deleted", false),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).match(STATUS_COLUMN_QUERY("rejected")).eq("is_deleted", false),
    supabase.from("site_settings").select("value").eq("key", "featured_listing_ids").maybeSingle(),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString()).eq("is_deleted", false),
    getActiveUserCount(),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    totalListings: totalListings ?? 0,
    pendingListings: pendingListings ?? 0,
    approvedListings: approvedListings ?? 0,
    rejectedListings: rejectedListings ?? 0,
    featuredListings: Array.isArray(featuredSetting?.value) ? featuredSetting.value.length : 0,
    newListingsToday: newListingsToday ?? 0,
    activeUsers,
  };
}

/** "Active" = signed in within the last 30 days, via auth.users.last_sign_in_at
 * (Supabase Admin API — needs the service-role client, since regular RLS-scoped
 * clients can't read auth.users). This doesn't scale to a large user base
 * (listUsers() pages through everyone); fine at current volume, but a real
 * last_active_at column + indexed query would be the right fix once the user
 * base grows past a few thousand. */
async function getActiveUserCount(): Promise<number> {
  const service = createServiceRoleClient();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let page = 1;
  let active = 0;
  for (;;) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    active += data.users.filter((user) => user.last_sign_in_at && new Date(user.last_sign_in_at).getTime() >= thirtyDaysAgo).length;
    if (data.users.length < 200) break;
    page += 1;
  }
  return active;
}

export type ActivityLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actorName: string | null;
};

export async function getRecentActivity(limit = 8): Promise<ActivityLogItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, actor_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = data ?? [];
  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase.from("admin_profiles").select("id, full_name").in("id", actorIds);
    for (const actor of actors ?? []) actorNames.set(actor.id, actor.full_name ?? "Admin");
  }

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
    actorName: row.actor_id ? (actorNames.get(row.actor_id) ?? "Unknown") : null,
  }));
}

export type LatestUser = { id: string; fullName: string | null; createdAt: string };

export async function getLatestUsers(limit = 5): Promise<LatestUser[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("user_profiles").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map((row) => ({ id: row.id, fullName: row.full_name, createdAt: row.created_at }));
}

export type LatestListing = {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  status: string;
  createdAt: string;
  leaseAmount: number;
  leasePeriod: string;
  registrationYear: number | null;
  districtName: string | null;
  coverImageUrl: string | null;
  coverThumbnailUrl: string | null;
  bookingStatus: "available" | "booked";
};

type LatestListingRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  lease_amount: number;
  lease_period: string;
  registration_year: number | null;
  location_id: string | null;
  booking_status: "available" | "booked";
  brands: { name: string } | null;
  vehicle_images: { url: string; thumbnail_url: string | null; is_cover: boolean; sort_order: number }[];
};

export async function getLatestListings(limit = 5): Promise<LatestListing[]> {
  const supabase = await createClient();
  const [{ data }, locations] = await Promise.all([
    supabase
      .from("vehicles")
      .select(
        `id, name, slug, status, created_at, lease_amount, lease_period, registration_year, location_id, booking_status,
         brands ( name ),
         vehicle_images ( url, thumbnail_url, is_cover, sort_order )`
      )
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit),
    getLocationLookup(),
  ]);

  const rows = (data ?? []) as unknown as LatestListingRow[];

  return rows.map((row) => {
    const cover = row.vehicle_images.find((image) => image.is_cover) ?? [...row.vehicle_images].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      brandName: row.brands?.name ?? null,
      status: row.status,
      createdAt: row.created_at,
      leaseAmount: row.lease_amount,
      leasePeriod: row.lease_period,
      registrationYear: row.registration_year,
      districtName: row.location_id ? (locations.get(row.location_id)?.districtName ?? null) : null,
      coverImageUrl: cover?.url ?? null,
      coverThumbnailUrl: cover?.thumbnail_url ?? null,
      bookingStatus: row.booking_status,
    };
  });
}

export type MostViewedListing = { id: string; name: string; viewCount: number };

export async function getMostViewedListings(limit = 5): Promise<MostViewedListing[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("vehicles").select("id, name, view_count").eq("is_deleted", false).order("view_count", { ascending: false }).limit(limit);
  return (data ?? []).map((row) => ({ id: row.id, name: row.name, viewCount: row.view_count }));
}

export type DistributionEntry = { label: string; count: number };

export async function getStatusDistribution(): Promise<DistributionEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_vehicle_status_distribution");
  return (data ?? []).map((row) => ({ label: row.status.replaceAll("_", " "), count: Number(row.vehicle_count) }));
}

export async function getFuelTypeDistribution(): Promise<DistributionEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_fuel_type_distribution");
  return (data ?? [])
    .filter((row): row is { fuel_type: string; vehicle_count: number } => Boolean(row.fuel_type))
    .map((row) => ({ label: row.fuel_type, count: Number(row.vehicle_count) }));
}

export async function getTransmissionDistribution(): Promise<DistributionEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_transmission_distribution");
  return (data ?? [])
    .filter((row): row is { transmission: string; vehicle_count: number } => Boolean(row.transmission))
    .map((row) => ({ label: row.transmission, count: Number(row.vehicle_count) }));
}

export async function getTopBrands(limit = 5): Promise<DistributionEntry[]> {
  const supabase = await createClient();
  const [{ data: counts }, { data: brands }] = await Promise.all([
    supabase.rpc("get_brand_vehicle_counts"),
    supabase.from("brands").select("id, name"),
  ]);
  const nameById = new Map((brands ?? []).map((brand) => [brand.id, brand.name]));
  return (counts ?? [])
    .map((row) => ({ label: nameById.get(row.brand_id) ?? "Unknown", count: Number(row.vehicle_count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getTopDistricts(limit = 5): Promise<DistributionEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_district_vehicle_counts");
  return (data ?? [])
    .map((row) => ({ label: row.district_name, count: Number(row.vehicle_count) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
