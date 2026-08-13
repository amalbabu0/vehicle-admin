import { NextResponse } from "next/server";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { env } from "@/lib/env";

const bookingStatusUpdateSchema = z.object({
  bookingStatus: z.enum(["available", "booked"]),
});

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

/**
 * Booking availability — a lease-in-progress flag, independent of the
 * vehicles.status lifecycle (draft/pending_approval/published/rejected/
 * archived/sold). A published listing stays published and searchable while
 * booked; the public site just disables its contact actions and shows a
 * grayscale "Already Booked" treatment (see the user app's VehicleCard).
 *
 * The row is fetched before updating so a missing listing gets a real 404
 * rather than a silent zero-row update, and so the slug is on hand for the
 * revalidation ping. There's no owner comparison: listers share one
 * inventory (migration 0035), so any staff account may flip this flag on
 * any listing — RLS (vehicles_update_staff) enforces exactly that, and the
 * audit entry below records who did it.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminOrLister();
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const validation = bookingStatusUpdateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ message: "Invalid booking status." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("vehicles")
    .select("id, slug")
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ message: "Unable to update the vehicle right now. Please try again." }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ message: "Vehicle listing not found." }, { status: 404 });
  }

  const { bookingStatus } = validation.data;
  const { error } = await supabase
    .from("vehicles")
    .update({ booking_status: bookingStatus })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ message: "Unable to update the vehicle right now. Please try again." }, { status: 500 });
  }

  await notifyPublicSiteToRevalidate(existing.slug);
  await supabase.rpc("log_audit_event", {
    p_action: "vehicle_booking_status_changed",
    p_entity_type: "vehicle",
    p_entity_id: id,
    p_metadata: { booking_status: bookingStatus },
  });

  return NextResponse.json({
    message: bookingStatus === "booked" ? "Vehicle marked as booked." : "Vehicle marked as available.",
    bookingStatus,
  });
}
