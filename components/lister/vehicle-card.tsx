"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Pencil, ImageOff } from "lucide-react";
import { StatusBadge } from "@/components/lister/status-badge";
import { ListerVehicleActions } from "@/components/lister/lister-vehicle-actions";
import { ShareVehicleMenu } from "@/components/share-vehicle-menu";
import { Button } from "@/components/ui/button";
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
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm shadow-black/5">
      <div className="relative aspect-video w-full bg-muted">
        {vehicle.coverImageUrl ? (
          <Image src={vehicle.coverImageUrl} alt={vehicle.name} fill sizes="(max-width: 640px) 100vw, 340px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <StatusBadge status={vehicle.status} />
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

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link href={`/lister/vehicles/${vehicle.id}/edit`} className="no-underline">
            <Button size="sm" variant="ghost" className="min-h-9 gap-1.5">
              <Pencil className="size-3.5" /> Edit
            </Button>
          </Link>
          {vehicle.status === "published" ? <ShareVehicleMenu message={shareMessage} url={shareUrl} imageUrl={vehicle.coverImageUrl} fileName={vehicle.slug} /> : null}
          <ListerVehicleActions id={vehicle.id} status={vehicle.status} />
        </div>
      </div>
    </div>
  );
}
