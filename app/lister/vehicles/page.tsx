import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen, PlusCircle } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getListerVehicles } from "@/lib/lister/vehicles-data";
import { buildVehicleShareMessage } from "@/lib/vehicles/share";
import { env } from "@/lib/env";
import { VehicleCard } from "@/components/lister/vehicle-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My Vehicles — Kerala Lease Hub" };
export const revalidate = 0;

export default async function ListerVehiclesPage() {
  const profile = await getCurrentProfile();
  const vehicles = await getListerVehicles(profile.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{vehicles.length} listing{vehicles.length === 1 ? "" : "s"}</p>
        <Link href="/lister/vehicles/add" className="no-underline">
          <Button size="sm" className="min-h-12 gap-1.5">
            <PlusCircle className="size-4" /> Add
          </Button>
        </Link>
      </div>

      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <PackageOpen className="size-10 text-muted-foreground" />
          <p className="font-medium">No vehicles found.</p>
          <Link href="/lister/vehicles/add" className="no-underline">
            <Button className="mt-2 min-h-12 gap-1.5">
              <PlusCircle className="size-4" /> Add Your First Vehicle
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {vehicles.map((vehicle) => {
            const shareUrl = `${env.PUBLIC_SITE_URL}/vehicles/${vehicle.slug}`;
            const shareMessage = buildVehicleShareMessage(
              {
                name: vehicle.name,
                brandName: vehicle.brandName,
                model: null,
                registrationYear: vehicle.registrationYear,
                leaseAmount: vehicle.leaseAmount,
                leasePeriod: vehicle.leasePeriod,
                fuelType: null,
                transmission: null,
                kmDriven: null,
                ownershipCount: null,
                districtName: vehicle.districtName,
                condition: null,
                slug: vehicle.slug,
              },
              shareUrl
            );
            return <VehicleCard key={vehicle.id} vehicle={vehicle} shareMessage={shareMessage} shareUrl={shareUrl} />;
          })}
        </div>
      )}
    </div>
  );
}
