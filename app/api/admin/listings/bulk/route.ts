import { NextResponse } from "next/server";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const bulkSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
  action: z.enum(["approve", "reject", "feature", "delete"]),
});

// One insert instead of one RPC round trip per id (see migration 0030).
async function logBulkAction(action: string, ids: string[]) {
  const supabase = await createClient();
  await supabase.rpc("log_audit_events_bulk", { p_action: action, p_entity_type: "vehicle", p_entity_ids: ids, p_metadata: { bulk: true } });
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const validation = bulkSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Invalid bulk request." }, { status: 400 });
  }

  const { ids, action } = validation.data;
  const supabase = await createClient();

  if (action === "approve") {
    const { error } = await supabase
      .from("vehicles")
      .update({ status: "published", approved_at: new Date().toISOString(), published_at: new Date().toISOString(), rejected_reason: null })
      .in("id", ids);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    await logBulkAction("listing_approved", ids);
    return NextResponse.json({ message: `${ids.length} listing(s) approved.` });
  }

  if (action === "reject") {
    const { error } = await supabase.from("vehicles").update({ status: "rejected" }).in("id", ids);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    await logBulkAction("listing_rejected", ids);
    return NextResponse.json({ message: `${ids.length} listing(s) rejected.` });
  }

  if (action === "feature") {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "featured_listing_ids").maybeSingle();
    const current = Array.isArray(data?.value) ? (data.value as string[]) : [];
    const next = [...new Set([...current, ...ids])];
    await supabase.from("site_settings").update({ value: next }).eq("key", "featured_listing_ids");
    await logBulkAction("listing_featured", ids);
    return NextResponse.json({ message: `${ids.length} listing(s) featured.` });
  }

  // Soft delete — moves each listing into the 10-day recoverable "Deleted
  // Listings" state (see migration 0022). soft_delete_vehicles() loops
  // per id inside Postgres (one round trip for the whole batch instead of
  // one per id — see migration 0030) and already logs its own audit event
  // per listing via the singular soft_delete_vehicle() it wraps, so no
  // separate logBulkAction call here (unlike the other branches above).
  const { data: results, error } = await supabase.rpc("soft_delete_vehicles", { p_vehicle_ids: ids });
  if (error) {
    return NextResponse.json({ message: "Couldn't delete the selected listing(s)." }, { status: 500 });
  }
  const failed = (results ?? []).filter((r) => !r.success).length;
  if (failed === ids.length) {
    return NextResponse.json({ message: "Couldn't delete the selected listing(s)." }, { status: 500 });
  }
  return NextResponse.json({ message: `${ids.length - failed} listing(s) moved to Deleted Listings.` });
}
