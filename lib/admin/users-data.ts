import "server-only";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export type AdminUserRow = {
  id: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  email: string | null;
  suspended: boolean;
  lastSignInAt: string | null;
  favoritesCount: number;
};

export type UsersFilter = { search?: string; status?: "all" | "active" | "suspended" };

function isSuspended(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false;
  return new Date(bannedUntil).getTime() > Date.now();
}

/**
 * Ban status and email live in auth.users, not user_profiles, so this
 * enriches each profile row with a per-user admin API lookup (bounded to
 * the current page, not every user) rather than the alternative of
 * paginating through auth.admin.listUsers() for everyone — that only
 * scales for the "how many signed in recently" dashboard stat, not a
 * searchable/filterable table. Status filtering and pagination happen in
 * JS after enrichment since suspended/active isn't a column we can filter
 * on at the DB level without a denormalized mirror column — fine at
 * today's user counts; revisit (add a synced is_suspended column) once the
 * user base is large enough for this fetch to matter.
 */
export async function getUsersPage(
  filter: UsersFilter,
  page: number,
  pageSize: number
): Promise<{ users: AdminUserRow[]; total: number }> {
  const supabase = await createClient();
  let query = supabase.from("user_profiles").select("id, full_name, phone, avatar_url, created_at").order("created_at", { ascending: false });

  if (filter.search?.trim()) {
    const safe = filter.search.replace(/[,()%]/g, " ").trim();
    query = query.ilike("full_name", `%${safe}%`);
  }

  const { data: profiles } = await query.limit(500);
  const rows = profiles ?? [];

  const service = createServiceRoleClient();
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const { data: authData } = await service.auth.admin.getUserById(row.id);
      const bannedUntil = authData?.user?.banned_until ?? null;
      return {
        id: row.id,
        fullName: row.full_name,
        phone: row.phone,
        avatarUrl: row.avatar_url,
        createdAt: row.created_at,
        email: authData?.user?.email ?? null,
        suspended: isSuspended(bannedUntil),
        lastSignInAt: authData?.user?.last_sign_in_at ?? null,
        favoritesCount: 0,
      } satisfies AdminUserRow;
    })
  );

  const favoriteCounts = await getFavoriteCounts(rows.map((row) => row.id));
  for (const user of enriched) user.favoritesCount = favoriteCounts.get(user.id) ?? 0;

  const filtered = enriched.filter((user) => {
    if (filter.status === "active") return !user.suspended;
    if (filter.status === "suspended") return user.suspended;
    return true;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const users = filtered.slice(start, start + pageSize);

  return { users, total };
}

// favorites RLS is `user_id = auth.uid()` only — no admin-override policy
// (unlike user_profiles, which does have one). An admin reading another
// user's favorites through the cookie-bound client would see nothing, not
// an error, which would silently misreport "0 favorites" for everyone.
// requireAdmin() already gated the caller before these functions run, so
// the service-role client here is the same "already-authorized privileged
// read" pattern used elsewhere in this app, not a new access path.
async function getFavoriteCounts(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const service = createServiceRoleClient();
  const { data } = await service.from("favorites").select("user_id").in("user_id", userIds);
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  return counts;
}

export type UserFavoriteVehicle = { id: string; name: string; slug: string; leaseAmount: number; status: string };

/** "View User Listings" in the spec, reinterpreted against the real schema:
 * user_profiles accounts are public-site viewers, not listers — they never
 * own a vehicle row. The closest real per-user vehicle relationship is
 * their favorites, so that's what this shows. */
export async function getUserFavoriteVehicles(userId: string): Promise<UserFavoriteVehicle[]> {
  const service = createServiceRoleClient();
  const { data } = await service
    .from("favorites")
    .select("vehicles ( id, name, slug, lease_amount, status )")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? [])
    .map((row) => row.vehicles)
    .filter((vehicle): vehicle is NonNullable<typeof vehicle> => Boolean(vehicle))
    .map((vehicle) => ({ id: vehicle.id, name: vehicle.name, slug: vehicle.slug, leaseAmount: vehicle.lease_amount, status: vehicle.status }));
}

export async function getUserById(userId: string): Promise<AdminUserRow | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("user_profiles").select("id, full_name, phone, avatar_url, created_at").eq("id", userId).maybeSingle();
  if (!profile) return null;

  const service = createServiceRoleClient();
  const { data: authData } = await service.auth.admin.getUserById(userId);
  const favoriteCounts = await getFavoriteCounts([userId]);

  return {
    id: profile.id,
    fullName: profile.full_name,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
    email: authData?.user?.email ?? null,
    suspended: isSuspended(authData?.user?.banned_until ?? null),
    lastSignInAt: authData?.user?.last_sign_in_at ?? null,
    favoritesCount: favoriteCounts.get(userId) ?? 0,
  };
}
