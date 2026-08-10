import type { Metadata } from "next";
import { AddVehiclePage } from "@/components/lister/add-vehicle/add-vehicle-page";

export const metadata: Metadata = { title: "Add Vehicle" };

// Same Quick/Detailed Listing flow listers get (components/lister/add-vehicle
// — imported, not duplicated: its underlying endpoints, /api/vehicles and
// /api/lister/quick-listing[/create], already authorize via
// requireAdminOrLister(), so an admin submitting here needs no backend
// change. The vehicle is attributed to the admin's own admin_profiles.id,
// same as the legacy /vehicles/add page already did for admins.
export default function AdminAddVehiclePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add Vehicle</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a new listing — paste a WhatsApp message for Quick Listing, or fill the Detailed form.</p>
      </div>

      <AddVehiclePage />
    </div>
  );
}
