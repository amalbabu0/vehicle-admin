import { NextResponse } from "next/server";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

// Loose on purpose: IPv4, IPv6 and the "unknown" placeholder the visitor log
// writes when no forwarded header arrives all have to round-trip, and the
// value being blocked always comes from a row we wrote ourselves. The length
// cap matches the column's CHECK so a bad value fails here with a 400 rather
// than as a constraint violation.
const blockSchema = z.object({
  ip: z.string().min(1).max(45),
  reason: z.string().max(200).optional(),
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
  const { ip, reason } = validation.data;

  if (ip === "unknown") {
    return NextResponse.json(
      { message: "“unknown” isn't a real address — blocking it would deny every visitor whose IP we can't read." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.auth.getUser();

  // Upsert rather than insert: blocking an already-blocked address is the
  // same intent, and a duplicate-key error would be a confusing way to say
  // "already done".
  const { error } = await supabase
    .from("blocked_ips")
    .upsert({ ip, reason: reason || null, blocked_by: profile.user?.id ?? null }, { onConflict: "ip" });

  if (error) {
    return NextResponse.json({ message: "Could not block this address." }, { status: 500 });
  }

  await supabase.rpc("log_audit_event", {
    p_action: "ip_blocked",
    p_entity_type: "ip",
    p_metadata: { ip, reason: reason || null },
  });

  return NextResponse.json({ ip, blocked: true });
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
