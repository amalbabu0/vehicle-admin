"use client";

import Image from "next/image";
import { MapPin, ImageOff } from "lucide-react";
import { StatusBadge, FeaturedBadge } from "@/components/lister/status-badge";
import { ListerVehicleActions } from "@/components/lister/lister-vehicle-actions";
import { VehicleCardMenu } from "@/components/lister/vehicle-card-menu";
import { ShareVehicleMenu } from "@/components/share-vehicle-menu";
import { ShareIconButton } from "@/components/share-icon-button";
import type { ListerVehicleRow } from "@/lib/lister/vehicles-data";

export function VehicleCard({
  vehicle,
  shareMessage,
  shareUrl,
  view = "grid",
}: {
  vehicle: ListerVehicleRow;
  shareMessage: string;
  shareUrl: string;
  view?: "grid" | "list";
}) {
  const isPublished = vehicle.status === "published";
  const isPending = vehicle.status === "pending_approval";
  const cardImageUrl = vehicle.coverThumbnailUrl ?? vehicle.coverImageUrl;
  const altText = [vehicle.name, vehicle.registrationYear, vehicle.districtName ? `in ${vehicle.districtName}` : null].filter(Boolean).join(" ");
  const subtitle = [vehicle.brandName, vehicle.registrationYear].filter(Boolean).join(" • ");

  const image = cardImageUrl ? (
    <Image
      src={cardImageUrl}
      alt={altText}
      fill
      sizes={view === "list" ? "112px" : "(max-width: 640px) 50vw, 340px"}
      className="object-cover"
    />
  ) : (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <ImageOff className="size-6" />
    </div>
  );

  const rejectedBanner =
    vehicle.status === "rejected" && vehicle.rejectedReason ? (
      <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">{vehicle.rejectedReason}</p>
    ) : null;

  const locationChip = vehicle.districtName ? (
    <p className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted/70 px-2 py-1 text-xs text-muted-foreground">
      <MapPin className="size-3.5" /> {vehicle.districtName}
    </p>
  ) : null;

  if (view === "list") {
    return (
      <div className="flex gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm shadow-black/5 transition-all duration-200 hover:shadow-md">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-28">{image}</div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{vehicle.name}</p>
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <StatusBadge status={vehicle.status} />
                {vehicle.featured ? <FeaturedBadge /> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-extrabold tracking-tight text-foreground">₹{vehicle.leaseAmount.toLocaleString("en-IN")}</span>
                <span className="text-xs font-normal text-muted-foreground">/ {vehicle.leasePeriod}</span>
              </div>
              {locationChip}
            </div>

            {rejectedBanner}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {!isPending ? (
                <>
                  <ListerVehicleActions id={vehicle.id} status={vehicle.status} />
                  {isPublished ? (
                    <ShareVehicleMenu message={shareMessage} url={shareUrl} imageUrl={vehicle.coverImageUrl} fileName={vehicle.slug} />
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <ShareIconButton url={shareUrl} />
              <VehicleCardMenu id={vehicle.id} shareUrl={shareUrl} showViewDetails={isPublished} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {image}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-90" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <div className="flex flex-col items-start gap-1.5">
            <StatusBadge status={vehicle.status} />
            {vehicle.featured ? <FeaturedBadge /> : null}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <ShareIconButton url={shareUrl} />
            <VehicleCardMenu id={vehicle.id} shareUrl={shareUrl} showViewDetails={isPublished} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3.5">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{vehicle.name}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold tracking-tight text-foreground">₹{vehicle.leaseAmount.toLocaleString("en-IN")}</span>
            <span className="text-xs font-normal text-muted-foreground">/ {vehicle.leasePeriod}</span>
          </div>
          {locationChip}
        </div>

        {rejectedBanner}

        {!isPending ? (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
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
