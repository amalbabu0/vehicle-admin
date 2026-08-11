import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getListerVehicleForEdit } from "@/lib/lister/vehicles-data";
import { AddVehicleWizard } from "@/components/lister/add-vehicle/add-vehicle-wizard";
import type { WizardFormState } from "@/components/lister/add-vehicle/types";

export const metadata: Metadata = { title: "Edit Vehicle — Kerala Lease Hub" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const vehicle = await getListerVehicleForEdit(id, profile.id);

  // RLS already prevents reading another lister's vehicle (the query
  // returns no row rather than another lister's data) — this 404s
  // whether the id doesn't exist or it isn't this lister's.
  if (!vehicle) notFound();

  const initialState: WizardFormState = {
    brand: vehicle.brand,
    model: vehicle.model ?? "",
    year: vehicle.year,
    contactPhone: vehicle.contactPhone,
    directOwner: vehicle.directOwner ? "true" : "false",
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    engineCapacity: vehicle.engineCapacity,
    condition: vehicle.condition,
    features: vehicle.features,
    description: vehicle.description,
    leaseAmount: vehicle.leaseAmount,
    leasePeriod: vehicle.leasePeriod,
    serviceChargePercent: vehicle.serviceChargePercent,
    locationId: vehicle.locationId,
    // The edit wizard has no category step and PUT /api/vehicles/[id] never
    // writes category_id, so an empty value here cannot clear an existing
    // category. If that PUT ever starts handling categories, this must load
    // the real one first — otherwise editing would silently wipe it.
    categoryId: "",
    imageUrls: vehicle.imageUrls,
  };

  return <AddVehicleWizard mode="edit" vehicleId={vehicle.id} initialState={initialState} />;
}
