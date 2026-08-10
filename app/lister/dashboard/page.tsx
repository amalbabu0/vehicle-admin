import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Car, PlusCircle, PackageOpen, Users, ImageOff } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getListerStats, getListerRecentVehicles, getPublicUserCount } from "@/lib/lister/dashboard-data";
import { ListerStatCard } from "@/components/lister/lister-stat-card";
import { StatusBadge } from "@/components/lister/status-badge";
import { ShareVehicleMenu } from "@/components/share-vehicle-menu";
import { Button } from "@/components/ui/button";
import { buildVehicleShareMessage } from "@/lib/vehicles/share";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Dashboard — Kerala Lease Hub" };
export const revalidate = 0;

export default async function ListerDashboardPage() {
  const profile = await getCurrentProfile();
  const [stats, userCount, recent] = await Promise.all([
    getListerStats(profile.id),
    getPublicUserCount(),
    getListerRecentVehicles(profile.id, 5),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h2 className="text-xl font-semibold">{profile.full_name ?? "there"}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ListerStatCard label="Total Vehicles" value={stats.published} icon={Car} />
        <ListerStatCard label="No. of Users" value={userCount} icon={Users} tone="success" />
      </div>

      <Link href="/lister/vehicles/add" className="block no-underline">
        <Button className="min-h-13 w-full gap-2 text-base">
          <PlusCircle className="size-5" /> Add Vehicle
        </Button>
      </Link>

      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm shadow-black/5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent listings</h3>
          <Link href="/lister/vehicles" className="text-xs font-medium text-primary no-underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
            <PackageOpen className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">You haven&apos;t added a vehicle yet.</p>
            <Link href="/lister/vehicles/add" className="mt-1 text-sm font-medium text-primary no-underline">
              Add your first vehicle
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recent.map((vehicle) => {
              const cardImageUrl = vehicle.coverThumbnailUrl ?? vehicle.coverImageUrl;
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

              return (
                <li key={vehicle.id} className="flex items-start gap-3 py-3 text-sm">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {cardImageUrl ? (
                      <Image src={cardImageUrl} alt={vehicle.name} fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{vehicle.name}</p>
                      <StatusBadge status={vehicle.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(vehicle.createdAt), { addSuffix: true })}</p>

                    {vehicle.status === "published" ? (
                      <div className="mt-2">
                        <ShareVehicleMenu message={shareMessage} url={shareUrl} imageUrl={vehicle.coverImageUrl} fileName={vehicle.slug} />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
