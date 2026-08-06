import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { vehicleCreateSchema } from "@/lib/validators/vehicle";

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
  const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vehicle"}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: vehicle, error } = await supabase.from("vehicles").insert({
    name: data.name,
    brand_id: data.brand || null,
    model: data.model || null,
    registration_year: data.year ? Number(data.year) : null,
    lease_amount: Number(data.leaseAmount),
    lease_period: data.leasePeriod,
    direct_owner: data.directOwner,
    contact_phone: data.contactPhone,
    service_charge_percent: data.serviceChargePercent ?? null,
    location_id: data.locationId || null,
    description: data.description,
    fuel_type: data.fuelType || null,
    transmission: data.transmission || null,
    km_driven: data.kmDriven ?? null,
    insurance_valid_until: data.insuranceValidUntil || null,
    ownership_count: data.ownershipCount ?? null,
    engine_capacity: data.engineCapacity || null,
    seats: data.seats ?? null,
    color: data.color || null,
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
