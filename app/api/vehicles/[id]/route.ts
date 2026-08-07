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
