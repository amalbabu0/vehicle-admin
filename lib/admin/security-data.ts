import "server-only";

import { createClient } from "@/lib/supabase/server";

export type LoginAttackAlert = {
  ip: string;
  attemptCount: number;
  lastAttemptAt: string;
  emails: string[];
};

/** Bursts of failed admin logins from the same IP — see migration 0017's
 * get_login_attack_alerts(). Default matches the brute-force threshold the
 * product wants surfaced: 3+ failed attempts from one IP within 15 minutes. */
export async function getLoginAttackAlerts(minutes = 15, threshold = 3): Promise<LoginAttackAlert[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_login_attack_alerts", { p_minutes: minutes, p_threshold: threshold });
  return (data ?? []).map((row) => ({
    ip: row.ip ?? "unknown",
    attemptCount: Number(row.attempt_count),
    lastAttemptAt: row.last_attempt_at,
    emails: (row.emails ?? []).filter((email): email is string => Boolean(email)),
  }));
}
