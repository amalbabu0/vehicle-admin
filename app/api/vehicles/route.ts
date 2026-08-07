import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { vehicleCreateSchema } from "@/lib/validators/vehicle";
import { resolveVehicleReferenceIds } from "@/lib/vehicles/references";

export async function POST(request: Request) {
  const body = await request.json();
  const validation = vehicleCreateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { errors: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = validation.data;
  const profile = await requireAdminOrLister();
  const supabase = await createClient();
  const { brandId, locationId } = await resolveVehicleReferenceIds(supabase, data.brand, data.locationId);
  if (!brandId || !locationId) {
    return NextResponse.json({
      message: !brandId
        ? `Brand "${data.brand}" was not found. Use a brand available in the system.`
        : `Location "${data.locationId}" was not found. Use a location available in the system.`,
    }, { status: 400 });
  }
  const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vehicle"}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: vehicle, error } = await supabase.from("vehicles").insert({
    name: data.name,
    brand_id: brandId,
    registration_year: data.year ? Number(data.year) : null,
    lease_amount: Number(data.leaseAmount),
    lease_period: data.leasePeriod,
    direct_owner: data.directOwner,
    contact_phone: data.contactPhone,
    service_charge_percent: data.serviceChargePercent ?? null,
    location_id: locationId,
    description: data.description,
    fuel_type: data.fuelType || null,
    transmission: data.transmission || null,
    ownership_count: data.ownershipCount ?? null,
    engine_capacity: data.engineCapacity || null,
    condition: data.condition || null,
    features: data.features ? data.features.split(",").map((feature) => feature.trim()) : [],
    status: "draft",
    lister_id: profile.id,
    slug,
  }).select("id").single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const { error: imageError } = await supabase.from("vehicle_images").insert(
    data.imageUrls.map((url, sort_order) => ({ vehicle_id: vehicle.id, url, sort_order, is_cover: sort_order === 0 }))
  );
  if (imageError) {
    return NextResponse.json({ message: imageError.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Vehicle listing created as draft." }, { status: 201 });
}
