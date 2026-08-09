"use client";

import Link from "next/link";
import { LayoutGrid, List, PackageOpen, PlusCircle } from "lucide-react";
import { useLocalStorageBoolean } from "@/lib/lister/use-local-storage-boolean";
import { VehicleCard } from "@/components/lister/vehicle-card";
import { Button } from "@/components/ui/button";
import type { ListerVehicleRow } from "@/lib/lister/vehicles-data";

export type ListerVehicleCardItem = {
  vehicle: ListerVehicleRow;
  shareMessage: string;
  shareUrl: string;
};

/** View preference is a plain grid/list boolean persisted per-browser, same
 * pattern as useListerTheme — not something that needs to survive across
 * devices, so localStorage rather than a profile column. */
export function ListerVehiclesView({ items }: { items: ListerVehicleCardItem[] }) {
  const [isListView, setIsListView] = useLocalStorageBoolean("lister:vehicles-view-list", true);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {items.length} listing{items.length === 1 ? "" : "s"}
        </p>

        <div className="flex items-center gap-2">
          {items.length > 0 ? (
            <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
              <Button
                type="button"
                size="icon"
                className="size-9"
                variant={isListView ? "ghost" : "secondary"}
                aria-label="Grid view"
                aria-pressed={!isListView}
                onClick={() => setIsListView(false)}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="size-9"
                variant={isListView ? "secondary" : "ghost"}
                aria-label="List view"
                aria-pressed={isListView}
                onClick={() => setIsListView(true)}
              >
                <List className="size-4" />
              </Button>
            </div>
          ) : null}

          <Link href="/lister/vehicles/add" className="no-underline">
            <Button size="sm" className="min-h-12 gap-1.5">
              <PlusCircle className="size-4" /> Add
            </Button>
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <PackageOpen className="size-10 text-muted-foreground" />
          <p className="font-medium">No vehicles found.</p>
          <Link href="/lister/vehicles/add" className="no-underline">
            <Button className="mt-2 min-h-12 gap-1.5">
              <PlusCircle className="size-4" /> Add Your First Vehicle
            </Button>
          </Link>
        </div>
      ) : isListView ? (
        <div className="flex flex-col gap-3">
          {items.map(({ vehicle, shareMessage, shareUrl }) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} shareMessage={shareMessage} shareUrl={shareUrl} view="list" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {items.map(({ vehicle, shareMessage, shareUrl }) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} shareMessage={shareMessage} shareUrl={shareUrl} view="grid" />
          ))}
        </div>
      )}
    </div>
  );
}
