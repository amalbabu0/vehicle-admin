import { NextResponse } from "next/server";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { env } from "@/lib/env";

const statusUpdateSchema = z.object({
  status: z.enum(["draft", "pending_approval", "published", "rejected", "archived", "sold"]),
});

/** Best-effort: the public site's cached pages catch up within their own
 * revalidate window regardless, so a failure here (network blip, public
 * site down) must never fail the status update itself. */
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
  await requireAdminOrLister();
  const { id } = await params;
  const body = await request.json();
  const validation = statusUpdateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ message: "Invalid status." }, { status: 400 });
  }

  const { status } = validation.data;
  const supabase = await createClient();
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .update(status === "published" ? { status, published_at: new Date().toISOString() } : { status })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  await notifyPublicSiteToRevalidate(vehicle.slug);

  return NextResponse.json({ message: "Listing status updated." });
}

// RLS does the real authorization here: vehicles_delete_own_draft restricts
// a lister to deleting only their own draft-status vehicles, while
// vehicles_delete_admin gives admins unrestricted delete — same pattern the
// admin listings API already uses for its own delete action. vehicle_images
// rows cascade-delete via their FK; the underlying R2 objects are left
// orphaned, matching the admin delete action's existing behavior (no R2
// cleanup happens there either).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminOrLister();
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Listing deleted." });
}
