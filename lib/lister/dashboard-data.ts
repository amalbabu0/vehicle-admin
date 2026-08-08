import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ListerStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

/** Scoped to the current lister's own vehicles via the normal cookie-bound
 * client — RLS (vehicles_select_own) already restricts every count here to
 * rows where lister_id = auth.uid(), so there's no need for (and no risk
 * of accidentally using) the service-role client. */
export async function getListerStats(listerId: string): Promise<ListerStats> {
  const supabase = await createClient();
  const [{ count: total }, { count: pending }, { count: approved }, { count: rejected }] = await Promise.all([
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("lister_id", listerId).eq("is_deleted", false),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("lister_id", listerId).eq("status", "pending_approval").eq("is_deleted", false),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("lister_id", listerId).eq("status", "published").eq("is_deleted", false),
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("lister_id", listerId).eq("status", "rejected").eq("is_deleted", false),
  ]);

  return { total: total ?? 0, pending: pending ?? 0, approved: approved ?? 0, rejected: rejected ?? 0 };
}

export type ListerRecentVehicle = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  leaseAmount: number;
};

export async function getListerRecentVehicles(listerId: string, limit = 5): Promise<ListerRecentVehicle[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("id, name, status, created_at, lease_amount")
    .eq("lister_id", listerId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({ id: row.id, name: row.name, status: row.status, createdAt: row.created_at, leaseAmount: row.lease_amount }));
}
