import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { env } from "@/lib/env";

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

// restore_vehicle() is a SECURITY DEFINER RPC that enforces ownership/admin
// authorization itself (see migration 0022) — a lister can only ever
// restore their own row, an admin can restore any.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminOrLister();
  const { id } = await params;
  const supabase = await createClient();

  const { data: vehicle } = await supabase.from("vehicles").select("slug").eq("id", id).maybeSingle();

  const { error } = await supabase.rpc("restore_vehicle", { p_vehicle_id: id });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (vehicle) await notifyPublicSiteToRevalidate(vehicle.slug);

  return NextResponse.json({ message: "Listing restored." });
}
