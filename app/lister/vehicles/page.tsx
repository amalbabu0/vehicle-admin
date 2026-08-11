import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getListerVehicles } from "@/lib/lister/vehicles-data";
import { buildVehicleShareMessage } from "@/lib/vehicles/share";
import { env } from "@/lib/env";
import { ListerVehiclesView } from "@/components/lister/vehicles-view";

export const metadata: Metadata = { title: "My Vehicles — Kerala Lease Hub" };
export const revalidate = 0;

export default async function ListerVehiclesPage() {
  const profile = await getCurrentProfile();
  const vehicles = await getListerVehicles(profile.id);

  const items = vehicles.map((vehicle) => {
    const shareUrl = `${env.PUBLIC_SITE_URL}/vehicles/${vehicle.slug}`;
    const shareMessage = buildVehicleShareMessage(
      {
        name: vehicle.name,
        brandName: vehicle.brandName,
        model: vehicle.model,
        registrationYear: vehicle.registrationYear,
        leaseAmount: vehicle.leaseAmount,
        leasePeriod: vehicle.leasePeriod,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        kmDriven: vehicle.kmDriven,
        ownershipCount: vehicle.ownershipCount,
        districtName: vehicle.districtName,
        condition: vehicle.condition,
        slug: vehicle.slug,
        directOwner: vehicle.directOwner,
        serviceChargePercent: vehicle.serviceChargePercent,
        contactPhone: vehicle.contactPhone,
      },
      shareUrl
    );
    return { vehicle, shareMessage, shareUrl };
  });

  return <ListerVehiclesView items={items} />;
}
