import { NextResponse } from "next/server";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { vehicleCreateSchema } from "@/lib/validators/vehicle";
import { resolveVehicleReferenceIds } from "@/lib/vehicles/references";
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
  // log_audit_event's actor_id is auth.uid() — accurately attributes this
  // to whichever lister or admin made the change, same RPC every other
  // status-changing action in this app already uses.
  await supabase.rpc("log_audit_event", { p_action: "vehicle_status_changed", p_entity_type: "vehicle", p_entity_id: id, p_metadata: { status } });

  return NextResponse.json({ message: "Listing status updated." });
}

// Full-detail edit, distinct from PATCH's status-only transitions above.
// RLS (vehicles_update_own / vehicles_update_admin) scopes this the same
// way as PATCH — a lister can only ever update their own row. Status is
// deliberately untouched here: editing details and publishing/taking down
// are separate actions (see lister-vehicle-actions.tsx), so an edit never
// changes what's already live or hides a draft.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminOrLister();
  const { id } = await params;
  const body = await request.json();
  const validation = vehicleCreateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = validation.data;
  const supabase = await createClient();
  const { brandId, locationId } = await resolveVehicleReferenceIds(supabase, data.brand, data.locationId);
  if (!brandId || !locationId) {
    return NextResponse.json({
      message: !brandId
        ? `Brand "${data.brand}" was not found. Use a brand available in the system.`
        : `Location "${data.locationId}" was not found. Use a location available in the system.`,
    }, { status: 400 });
  }

  const name = `${data.brand} ${data.model}`.trim();
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .update({
      name,
      model: data.model,
      brand_id: brandId,
      registration_year: data.year ? Number(data.year) : null,
      lease_amount: Number(data.leaseAmount),
      lease_period: data.leasePeriod,
      direct_owner: data.directOwner,
      contact_phone: data.contactPhone,
      service_charge_percent: data.serviceChargePercent ?? null,
      location_id: locationId,
      description: data.description || null,
      fuel_type: data.fuelType,
      transmission: data.transmission,
      engine_capacity: data.engineCapacity || null,
      condition: data.condition || null,
      features: data.features ? data.features.split(",").map((feature) => feature.trim()) : [],
    })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Replace the image set wholesale rather than diffing — simpler, and the
  // wizard's Images step already sends the full current list either way.
  const { error: deleteImagesError } = await supabase.from("vehicle_images").delete().eq("vehicle_id", id);
  if (deleteImagesError) {
    return NextResponse.json({ message: deleteImagesError.message }, { status: 500 });
  }
  const { error: imageError } = await supabase.from("vehicle_images").insert(
    data.imageUrls.map((url, sort_order) => ({ vehicle_id: id, url, sort_order, is_cover: sort_order === 0 }))
  );
  if (imageError) {
    return NextResponse.json({ message: imageError.message }, { status: 500 });
  }

  await notifyPublicSiteToRevalidate(vehicle.slug);

  return NextResponse.json({ message: "Listing updated." });
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
