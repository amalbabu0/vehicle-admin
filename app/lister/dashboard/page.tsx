import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Car, PlusCircle, PackageOpen, Users, ImageOff } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getListerStats, getListerRecentVehicles, getPublicUserCount } from "@/lib/lister/dashboard-data";
import { ListerStatCard } from "@/components/lister/lister-stat-card";
import { StatusDot, BookedBadge } from "@/components/lister/status-badge";
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
      <h2 className="text-xl font-semibold">{profile.full_name ?? "there"}</h2>

      <div className="grid grid-cols-2 gap-3">
        <ListerStatCard label="Total Vehicles" value={stats.published} icon={Car} />
        <ListerStatCard label="No. of Users" value={userCount} icon={Users} tone="success" />
      </div>

      <Link href="/lister/vehicles/add" className="block no-underline">
        <Button variant="outline" className="min-h-13 w-full gap-2 rounded-full border-2 text-base">
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
          <ul className="mt-3 flex flex-col gap-2">
            {recent.map((vehicle) => {
              const cardImageUrl = vehicle.coverThumbnailUrl ?? vehicle.coverImageUrl;
              const shareUrl = `${env.PUBLIC_SITE_URL}/vehicles/${vehicle.slug}`;
              const isBooked = vehicle.bookingStatus === "booked";
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
                  bookingStatus: vehicle.bookingStatus,
                },
                shareUrl
              );

              return (
                <li key={vehicle.id} className="flex items-center gap-3 rounded-xl bg-muted/60 p-2 pr-3 text-sm">
                  <div className="relative size-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {cardImageUrl ? (
                      <Image
                        src={cardImageUrl}
                        alt={vehicle.name}
                        fill
                        sizes="112px"
                        className={isBooked ? "object-cover grayscale" : "object-cover"}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-8" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{vehicle.name}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusDot status={vehicle.status} />
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(vehicle.createdAt), { addSuffix: true })}</span>
                      {isBooked ? <BookedBadge /> : null}
                    </div>
                  </div>

                  {vehicle.status === "published" ? (
                    <ShareVehicleMenu message={shareMessage} url={shareUrl} imageUrl={vehicle.coverImageUrl} fileName={vehicle.slug} isBooked={isBooked} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
