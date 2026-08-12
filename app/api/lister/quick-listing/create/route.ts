import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { quickVehicleCreateSchema } from "@/lib/validators/vehicle";
import { resolveVehicleReferenceIds } from "@/lib/vehicles/references";
import { findDuplicateVehicle } from "@/lib/vehicles/duplicate-check";

/**
 * Quick Listing's create path. Same insert target and the same
 * ownership/authorization rules as POST /api/vehicles, but validated with
 * quickVehicleCreateSchema instead of the strict one: whatever the pasted
 * WhatsApp message didn't mention is written as null rather than blocking
 * the save. Only the columns the `vehicles` table genuinely cannot store as
 * null are required (contact_phone, lease_amount, lease_period, and
 * brand+model which build `name`).
 *
 * POST /api/vehicles is untouched and still enforces the full schema for
 * the Detailed Listing wizard.
 */
export async function POST(request: Request) {
  const profile = await requireAdminOrLister();
  const body = await request.json().catch(() => null);
  const validation = quickVehicleCreateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = validation.data;
  const supabase = await createClient();

  // Brand auto-creates if unseen (see findBrandId). Location is looked up
  // only when one was actually provided — unlike the strict path, an
  // unmatched or absent location is stored as null instead of rejected,
  // since location_id is nullable and the lister can add it later.
  const { brandId, locationId } = await resolveVehicleReferenceIds(supabase, data.brand, data.locationId ?? "");
  if (!brandId) {
    return NextResponse.json({ message: `Brand "${data.brand}" could not be saved.` }, { status: 400 });
  }

  const duplicate = await findDuplicateVehicle(supabase, {
    listerId: profile.id,
    leasePeriod: data.leasePeriod,
    leaseAmount: Number(data.leaseAmount),
    locationId,
    registrationYear: data.year ? Number(data.year) : null,
    imageHashes: data.imageUrls.map((image) => image.contentHash),
  });
  if (duplicate) {
    return NextResponse.json(
      { message: `This vehicle is already listed as "${duplicate.name}" (${duplicate.status}). Edit that listing instead of creating a new one.`, duplicateId: duplicate.id },
      { status: 409 }
    );
  }

  const name = `${data.brand} ${data.model}`.trim();
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vehicle"}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .insert({
      name,
      model: data.model,
      brand_id: brandId,
      // Every field below is nullable in the schema — absent means null,
      // not a validation failure.
      registration_year: data.year ? Number(data.year) : null,
      lease_amount: Number(data.leaseAmount),
      lease_period: data.leasePeriod,
      direct_owner: data.directOwner,
      contact_phone: data.contactPhone,
      service_charge_percent: data.serviceChargePercent ?? null,
      location_id: locationId,
      // Nullable, but leaving it null makes the listing invisible to the
      // public site's type filter and absent from its homepage category
      // counts — so the extractor works this out from the make/model even
      // though messages never state it. See VEHICLE_CATEGORIES.
      category_id: data.categoryId || null,
      description: data.description || null,
      fuel_type: data.fuelType || null,
      transmission: data.transmission || null,
      engine_capacity: data.engineCapacity || null,
      condition: data.condition || null,
      features: data.features ? data.features.split(",").map((feature) => feature.trim()).filter(Boolean) : [],
      status: "draft",
      lister_id: profile.id,
      slug,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const { error: imageError } = await supabase.from("vehicle_images").insert(
    data.imageUrls.map((image, sort_order) => ({
      vehicle_id: vehicle.id,
      url: image.url,
      medium_url: image.mediumUrl ?? null,
      thumbnail_url: image.thumbnailUrl ?? null,
      content_hash: image.contentHash ?? null,
      sort_order,
      is_cover: sort_order === 0,
    }))
  );
  if (imageError) {
    return NextResponse.json({ message: imageError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Vehicle listing created as draft.", id: vehicle.id }, { status: 201 });
}
