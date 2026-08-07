"use client";

import Image from "next/image";
import { MapPin, ImageOff } from "lucide-react";
import { StatusBadge, FeaturedBadge } from "@/components/lister/status-badge";
import { ListerVehicleActions } from "@/components/lister/lister-vehicle-actions";
import { VehicleCardMenu } from "@/components/lister/vehicle-card-menu";
import { ShareVehicleMenu } from "@/components/share-vehicle-menu";
import type { ListerVehicleRow } from "@/lib/lister/vehicles-data";

export function VehicleCard({
  vehicle,
  shareMessage,
  shareUrl,
}: {
  vehicle: ListerVehicleRow;
  shareMessage: string;
  shareUrl: string;
}) {
  const isPublished = vehicle.status === "published";
  const cardImageUrl = vehicle.coverThumbnailUrl ?? vehicle.coverImageUrl;
  const altText = [vehicle.name, vehicle.registrationYear, vehicle.districtName ? `in ${vehicle.districtName}` : null].filter(Boolean).join(" ");

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm shadow-black/5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="relative aspect-video w-full bg-muted">
        {cardImageUrl ? (
          <Image src={cardImageUrl} alt={altText} fill sizes="(max-width: 640px) 50vw, 340px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          <StatusBadge status={vehicle.status} />
          {vehicle.featured ? <FeaturedBadge /> : null}
        </div>

        <div className="absolute right-2 top-2">
          <VehicleCardMenu id={vehicle.id} shareUrl={shareUrl} showViewDetails={isPublished} />
        </div>
      </div>

      <div className="space-y-2 p-3">
        <div>
          <p className="truncate font-semibold">{vehicle.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[vehicle.brandName, vehicle.registrationYear].filter(Boolean).join(" • ")}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            ₹{vehicle.leaseAmount.toLocaleString("en-IN")}
            <span className="text-xs font-normal text-muted-foreground"> / {vehicle.leasePeriod}</span>
          </p>
          {vehicle.districtName ? (
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" /> {vehicle.districtName}
            </p>
          ) : null}
        </div>

        {vehicle.status === "rejected" && vehicle.rejectedReason ? (
          <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">{vehicle.rejectedReason}</p>
        ) : null}

        {vehicle.status !== "pending_approval" ? (
          <div className="flex items-center justify-between gap-2 pt-1">
            <ListerVehicleActions id={vehicle.id} status={vehicle.status} />
            {isPublished ? (
              <ShareVehicleMenu message={shareMessage} url={shareUrl} imageUrl={vehicle.coverImageUrl} fileName={vehicle.slug} />
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
