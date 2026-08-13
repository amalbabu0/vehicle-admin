import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getListerVehicleForEdit } from "@/lib/lister/vehicles-data";
import { AddVehicleWizard } from "@/components/lister/add-vehicle/add-vehicle-wizard";
import type { WizardFormState } from "@/components/lister/add-vehicle/types";

export const metadata: Metadata = { title: "Edit Vehicle — Kerala Lease Hub" };

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vehicle = await getListerVehicleForEdit(id);

  // Any listing in the shared inventory is editable by any lister
  // (migration 0035), so this 404s only when the id doesn't exist or the
  // listing is soft-deleted — deleted listings must be restored first.
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
