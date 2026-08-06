"use server";

import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLister } from "@/lib/auth/dal";
import { vehicleCreateSchema, type VehicleCreateInput } from "@/lib/validators/vehicle";

export type VehicleActionState = {
  errors?: Record<string, string[]>;
  message?: string;
} | undefined;

export async function createVehicle(_prevState: VehicleActionState, formData: FormData): Promise<VehicleActionState> {
  await requireAdminOrLister();

  const data = Object.fromEntries(formData.entries());
  const validated = vehicleCreateSchema.safeParse(data);

  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  const input: VehicleCreateInput = validated.data;

  const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vehicle"}-${crypto.randomUUID().slice(0, 8)}`;
  const profile = await requireAdminOrLister();
  const { data: vehicle, error } = await supabase.from("vehicles").insert({
    name: input.name,
    brand_id: input.brand,
    registration_year: Number(input.year),
    lease_amount: Number(input.leaseAmount),
    lease_period: input.leasePeriod,
    direct_owner: input.directOwner,
    contact_phone: input.contactPhone,
    service_charge_percent: input.serviceChargePercent,
    location_id: input.locationId,
    description: input.description,
    fuel_type: input.fuelType ?? null,
    transmission: input.transmission ?? null,
    km_driven: input.kmDriven ?? null,
    insurance_valid_until: input.insuranceValidUntil ?? null,
    engine_capacity: input.engineCapacity ?? null,
    seats: input.seats ?? null,
    color: input.color ?? null,
    condition: input.condition ?? null,
    features: input.features ? input.features.split(",").map((feature) => feature.trim()) : [],
    status: "draft",
    lister_id: profile.id,
    slug,
  }).select("id").single();

  if (error) {
    return { message: error.message };
  }

  const { error: imageError } = await supabase.from("vehicle_images").insert(
    input.imageUrls.map((url, sort_order) => ({ vehicle_id: vehicle.id, url, sort_order, is_cover: sort_order === 0 }))
  );
  if (imageError) return { message: imageError.message };

  return { message: "Vehicle listing saved as draft." };
}
