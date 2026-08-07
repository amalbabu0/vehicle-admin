import "server-only";

import { createClient } from "@/lib/supabase/server";
import { KNOWN_ACTIONS, KNOWN_ENTITY_TYPES, type ActorOption } from "@/lib/admin/activity-log-constants";

export { KNOWN_ACTIONS, KNOWN_ENTITY_TYPES };
export type { ActorOption };

export type ActivityLogRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
};

export type ActivityLogFilter = {
  search?: string;
  action?: string;
  entityType?: string;
  actorId?: string;
  from?: string;
  to?: string;
};

export async function getActivityLogsPage(
  filter: ActivityLogFilter,
  page: number,
  pageSize: number
): Promise<{ logs: ActivityLogRow[]; total: number }> {
  const supabase = await createClient();

  let actorIdsBySearch: string[] | null = null;
  if (filter.search?.trim()) {
    const safe = filter.search.replace(/[,()%]/g, " ").trim();
    const { data: matchingActors } = await supabase.from("admin_profiles").select("id").ilike("full_name", `%${safe}%`);
    actorIdsBySearch = (matchingActors ?? []).map((row) => row.id);
  }

  let query = supabase.from("audit_logs").select("id, action, entity_type, entity_id, metadata, created_at, actor_id", { count: "exact" });
  if (filter.action) query = query.eq("action", filter.action);
  if (filter.entityType) query = query.eq("entity_type", filter.entityType);
  if (filter.actorId) query = query.eq("actor_id", filter.actorId);
  if (filter.from) query = query.gte("created_at", filter.from);
  if (filter.to) query = query.lte("created_at", filter.to);
  if (filter.search?.trim()) {
    const safe = filter.search.replace(/[,()%]/g, " ").trim();
    const actorClause = actorIdsBySearch?.length ? `,actor_id.in.(${actorIdsBySearch.join(",")})` : "";
    query = query.or(`action.ilike.%${safe}%,entity_type.ilike.%${safe}%${actorClause}`);
  }

  const from = (page - 1) * pageSize;
  query = query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);

  const { data, count } = await query;
  const rows = data ?? [];

  const actorIds = [...new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];
  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase.from("admin_profiles").select("id, full_name").in("id", actorIds);
    for (const actor of actors ?? []) actorNames.set(actor.id, actor.full_name ?? "Admin");
  }

  const logs: ActivityLogRow[] = rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    actorId: row.actor_id,
    actorName: row.actor_id ? (actorNames.get(row.actor_id) ?? "Unknown") : "System",
  }));

  return { logs, total: count ?? 0 };
}

export async function getActorOptions(): Promise<ActorOption[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_profiles").select("id, full_name").order("full_name");
  return (data ?? []).map((row) => ({ id: row.id, name: row.full_name ?? "Unnamed" }));
}
