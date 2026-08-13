import { NextResponse } from "next/server";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

// Loose on purpose: IPv4, IPv6 and the "unknown" placeholder the visitor log
// writes when no forwarded header arrives all have to round-trip, and the
// value being blocked always comes from a row we wrote ourselves. The length
// cap matches the column's CHECK so a bad value fails here with a 400 rather
// than as a constraint violation.
/** Durations offered in the UI. "permanent" is kept for the case it genuinely
 * fits — a persistent scraper on a datacentre address — but the finite options
 * exist because most addresses here are dynamic, and a block that outlives the
 * abuser silently punishes whoever inherits the address next. */
const DURATION_DAYS = { "1d": 1, "7d": 7, "30d": 30 } as const;

const blockSchema = z.object({
  ip: z.string().min(1).max(45),
  reason: z.string().max(200).optional(),
  duration: z.enum(["1d", "7d", "30d", "permanent"]).default("30d"),
});

const unblockSchema = z.object({ ip: z.string().min(1).max(45) });

/** The RLS client, not service-role: blocked_ips_all_admin is what authorizes
 * the write, so the policy stays the real boundary rather than requireAdmin()
 * alone. log_audit_event also reads auth.uid() from the caller's session, so
 * it has to run on this client to record who acted. */
export async function POST(request: Request) {
  await requireAdmin();

  const validation = blockSchema.safeParse(await request.json());
  if (!validation.success) {
    return NextResponse.json({ message: "Invalid IP address." }, { status: 400 });
  }
  const { ip, reason, duration } = validation.data;

  if (ip === "unknown") {
    return NextResponse.json(
      { message: "“unknown” isn't a real address — blocking it would deny every visitor whose IP we can't read." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.auth.getUser();

  // null = permanent. Computed here rather than in SQL so the stored value is
  // an absolute instant: a row that says "expires 14 Sep" keeps meaning that
  // regardless of when it is later read or re-blocked.
  const expiresAt =
    duration === "permanent"
      ? null
      : new Date(Date.now() + DURATION_DAYS[duration] * 24 * 60 * 60 * 1000).toISOString();

  // Upsert rather than insert: blocking an already-blocked address is the
  // same intent, and a duplicate-key error would be a confusing way to say
  // "already done". Re-blocking also restarts the clock, which is what you
  // want when an address you blocked before turns up abusing the site again.
  const { error } = await supabase
    .from("blocked_ips")
    .upsert(
      { ip, reason: reason || null, blocked_by: profile.user?.id ?? null, expires_at: expiresAt },
      { onConflict: "ip" }
    );

  if (error) {
    return NextResponse.json({ message: "Could not block this address." }, { status: 500 });
  }

  await supabase.rpc("log_audit_event", {
    p_action: "ip_blocked",
    p_entity_type: "ip",
    p_metadata: { ip, reason: reason || null, duration, expires_at: expiresAt },
  });

  return NextResponse.json({ ip, blocked: true, expiresAt });
}

export async function DELETE(request: Request) {
  await requireAdmin();

  const validation = unblockSchema.safeParse(await request.json());
  if (!validation.success) {
    return NextResponse.json({ message: "Invalid IP address." }, { status: 400 });
  }
  const { ip } = validation.data;

  const supabase = await createClient();
  const { error } = await supabase.from("blocked_ips").delete().eq("ip", ip);

  if (error) {
    return NextResponse.json({ message: "Could not unblock this address." }, { status: 500 });
  }

  await supabase.rpc("log_audit_event", {
    p_action: "ip_unblocked",
    p_entity_type: "ip",
    p_metadata: { ip },
  });

  return NextResponse.json({ ip, blocked: false });
}
