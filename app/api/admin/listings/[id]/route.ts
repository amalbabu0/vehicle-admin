import { NextResponse } from "next/server";
import * as z from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "feature", "unfeature", "delete"]),
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

  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  await logAction("listing_deleted", id);
  return NextResponse.json({ message: "Listing deleted." });
}
