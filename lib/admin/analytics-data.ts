import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DailyCount = { date: string; count: number };

export async function getDailyListingCounts(days = 90): Promise<DailyCount[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_daily_listing_counts", { p_days: days });
  return (data ?? []).map((row) => ({ date: row.day, count: Number(row.listing_count) }));
}

export async function getDailyUserCounts(days = 90): Promise<DailyCount[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_daily_user_counts", { p_days: days });
  return (data ?? []).map((row) => ({ date: row.day, count: Number(row.user_count) }));
}

/** Rolls up daily buckets (from the RPCs above) into monthly ones — same
 * underlying data, coarser grouping, computed client-side rather than a
 * second pair of RPCs. */
export function rollUpMonthly(daily: DailyCount[]): DailyCount[] {
  const byMonth = new Map<string, number>();
  for (const entry of daily) {
    const month = entry.date.slice(0, 7); // "YYYY-MM"
    byMonth.set(month, (byMonth.get(month) ?? 0) + entry.count);
  }
  return [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
}
