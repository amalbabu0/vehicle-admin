import { NextResponse } from "next/server";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { Json } from "@/lib/supabase/database.types";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "feature", "unfeature", "delete", "restore"]),
  reason: z.string().optional(),
});

async function logAction(action: string, vehicleId: string, metadata: Record<string, Json> = {}) {
  const supabase = await createClient();
  await supabase.rpc("log_audit_event", { p_action: action, p_entity_type: "vehicle", p_entity_id: vehicleId, p_metadata: metadata });
}

async function toggleFeatured(vehicleId: string, featured: boolean) {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "featured_listing_ids").maybeSingle();
  const current = Array.isArray(data?.value) ? (data.value as string[]) : [];
  const next = featured ? [...new Set([...current, vehicleId])] : current.filter((id) => id !== vehicleId);
  await supabase.from("site_settings").update({ value: next }).eq("key", "featured_listing_ids");
}

/** Best-effort, mirrors app/api/vehicles/[id]/route.ts's own copy of this —
 * see that file for why a failure here must never fail the request. */
async function notifyPublicSiteToRevalidate(slug: string) {
  try {
    await fetch(`${env.PUBLIC_SITE_URL}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": env.REVALIDATE_SECRET },
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Swallowed — see comment above.
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const body = await request.json();
  const validation = actionSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Invalid action." }, { status: 400 });
  }

  const { action, reason } = validation.data;
  const supabase = await createClient();

  if (action === "approve") {
    const { error } = await supabase
      .from("vehicles")
      .update({ status: "published", approved_at: new Date().toISOString(), published_at: new Date().toISOString(), rejected_reason: null })
      .eq("id", id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    await logAction("listing_approved", id);
    return NextResponse.json({ message: "Listing approved." });
  }

  if (action === "reject") {
    const { error } = await supabase.from("vehicles").update({ status: "rejected", rejected_reason: reason ?? null }).eq("id", id);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    await logAction("listing_rejected", id, { reason: reason ?? null });
    return NextResponse.json({ message: "Listing rejected." });
  }

  if (action === "feature" || action === "unfeature") {
    await toggleFeatured(id, action === "feature");
    await logAction(action === "feature" ? "listing_featured" : "listing_unfeatured", id);
    return NextResponse.json({ message: action === "feature" ? "Listing featured." : "Listing unfeatured." });
  }

  // Both delete and restore need the slug to revalidate the public site's
  // cached pages, so look it up once before either RPC call.
  const { data: vehicle } = await supabase.from("vehicles").select("slug").eq("id", id).maybeSingle();

  if (action === "restore") {
    const { error } = await supabase.rpc("restore_vehicle", { p_vehicle_id: id });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    if (vehicle) await notifyPublicSiteToRevalidate(vehicle.slug);
    return NextResponse.json({ message: "Listing restored." });
  }

  // Soft delete — moves the listing into the 10-day recoverable "Deleted
  // Listings" state (see migration 0022), not an immediate hard delete.
  // Permanent deletion is a separate, dedicated endpoint (see
  // app/api/admin/listings/[id]/permanent-delete/route.ts).
  const { error } = await supabase.rpc("soft_delete_vehicle", { p_vehicle_id: id });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (vehicle) await notifyPublicSiteToRevalidate(vehicle.slug);
  return NextResponse.json({ message: "Listing moved to Deleted Listings." });
}
