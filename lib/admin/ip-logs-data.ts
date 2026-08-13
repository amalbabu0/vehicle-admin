import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Reads for the IP Logs page. Uses the cookie-bound RLS client, not the
 * service-role one: visitor_logs_select_admin (migration 0036) is what
 * actually authorizes the read, so a lister who somehow reached this data
 * layer would get nothing back rather than being trusted by the route guard
 * alone.
 */

export type VisitorLogRow = {
  id: number;
  ip: string;
  path: string;
  userAgent: string | null;
  referrer: string | null;
  country: string | null;
  isAuthenticated: boolean;
  createdAt: string;
};

export type VisitorLogFilter = {
  /** Matches IP or path — the two things you actually look something up by. */
  search?: string;
  from?: string;
  to?: string;
};

export type VisitorLogStats = {
  /** Rows in the last 24h, and how many distinct IPs they came from. */
  visitsToday: number;
  uniqueIpsToday: number;
};

export async function getVisitorLogsPage(
  filter: VisitorLogFilter,
  page: number,
  pageSize: number
): Promise<{ logs: VisitorLogRow[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("visitor_logs")
    .select("id, ip, path, user_agent, referrer, country, is_authenticated, created_at", { count: "exact" });

  if (filter.from) query = query.gte("created_at", filter.from);
  if (filter.to) query = query.lte("created_at", filter.to);
  if (filter.search?.trim()) {
    // Same defensive strip the activity-logs data layer uses: these characters
    // are PostgREST's `or` filter syntax, not SQL, and an unescaped comma or
    // paren would change the shape of the filter rather than match literally.
    const safe = filter.search.replace(/[,()%]/g, " ").trim();
    query = query.or(`ip.ilike.%${safe}%,path.ilike.%${safe}%`);
  }

  const from = (page - 1) * pageSize;
  query = query.order("created_at", { ascending: false }).range(from, from + pageSize - 1);

  const { data, count } = await query;

  const logs: VisitorLogRow[] = (data ?? []).map((row) => ({
    id: row.id,
    ip: row.ip,
    path: row.path,
    userAgent: row.user_agent,
    referrer: row.referrer,
    country: row.country,
    isAuthenticated: row.is_authenticated,
    createdAt: row.created_at,
  }));

  return { logs, total: count ?? 0 };
}

/**
 * Which of the addresses on the current page are *actively* blocked.
 *
 * One .in() over the page's distinct IPs rather than a lookup per row — 25
 * rows commonly collapse to a handful of addresses, and a query per row would
 * be the N+1 that PERFORMANCE_STANDARDS item 1 exists to prevent.
 *
 * Lapsed rows are excluded with the same test is_ip_blocked() applies, so the
 * badge on this page always means "this address is blocked right now" rather
 * than "was blocked at some point" — otherwise the table would claim a block
 * the public site is no longer enforcing.
 */
export async function getBlockedIps(ips: string[]): Promise<Set<string>> {
  const distinct = [...new Set(ips)].filter((ip) => ip && ip !== "unknown");
  if (distinct.length === 0) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from("blocked_ips")
    .select("ip")
    .in("ip", distinct)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  return new Set((data ?? []).map((row) => row.ip));
}

/**
 * The two numbers worth showing above the table. uniqueIpsToday is counted in
 * JS over the last 24h of rows rather than with a DISTINCT query, because
 * PostgREST cannot express `count(distinct ip)` — bounded by an explicit
 * limit so this can never turn into an unbounded select as traffic grows
 * (PERFORMANCE_STANDARDS item 3). Past the cap the count reads as "at least
 * this many", which the page labels accordingly.
 */
export const UNIQUE_IP_SAMPLE_CAP = 5000;

export async function getVisitorStats(): Promise<VisitorLogStats> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ count }, { data }] = await Promise.all([
    supabase.from("visitor_logs").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("visitor_logs").select("ip").gte("created_at", since).limit(UNIQUE_IP_SAMPLE_CAP),
  ]);

  return {
    visitsToday: count ?? 0,
    uniqueIpsToday: new Set((data ?? []).map((row) => row.ip)).size,
  };
}
