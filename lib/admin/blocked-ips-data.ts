import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Reads for the Blocked IPs page.
 *
 * This page exists because the IP Logs table can only ever surface a block if
 * that address happens to appear in the last 24 hours of traffic — everything
 * older than the retention window was effectively invisible, which is a bad
 * property for a list that denies people access to the site.
 */

export type BlockedIpRow = {
  ip: string;
  reason: string | null;
  createdAt: string;
  expiresAt: string | null;
  blockedByName: string | null;
  /** Computed against now() at read time, matching is_ip_blocked()'s test —
   * a lapsed row is history, not an active block. */
  isActive: boolean;
};

export async function getBlockedIpsPage(
  page: number,
  pageSize: number
): Promise<{ blocks: BlockedIpRow[]; total: number; activeCount: number }> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const from = (page - 1) * pageSize;
  const [{ data, count }, { count: activeCount }] = await Promise.all([
    supabase
      .from("blocked_ips")
      .select("ip, reason, created_at, expires_at, blocked_by", { count: "exact" })
      // Active first, then most recent — an expired block is reference
      // material, an active one may need acting on.
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1),
    supabase
      .from("blocked_ips")
      .select("ip", { count: "exact", head: true })
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`),
  ]);

  const rows = data ?? [];

  // One lookup for every admin referenced on the page, not one per row.
  const adminIds = [...new Set(rows.map((row) => row.blocked_by).filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: admins } = await supabase.from("admin_profiles").select("id, full_name").in("id", adminIds);
    for (const admin of admins ?? []) names.set(admin.id, admin.full_name ?? "Admin");
  }

  const blocks: BlockedIpRow[] = rows.map((row) => ({
    ip: row.ip,
    reason: row.reason,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    blockedByName: row.blocked_by ? (names.get(row.blocked_by) ?? "Unknown") : null,
    isActive: row.expires_at === null || new Date(row.expires_at) > new Date(),
  }));

  return { blocks, total: count ?? 0, activeCount: activeCount ?? 0 };
}
