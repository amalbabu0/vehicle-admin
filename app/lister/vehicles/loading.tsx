import { Skeleton } from "@/components/ui/skeleton";
import { VehicleCardSkeleton } from "@/components/lister/vehicle-card";

// Mirrors app/lister/vehicles/page.tsx → ListerVehiclesView, which defaults
// to LIST view (useLocalStorageBoolean("lister:vehicles-view-list", true)) —
// this can't read that localStorage value server-side, so it matches the
// default rather than guessing, unlike the previous version of this file
// which always showed the grid-card shape. Header mirrors the 3 real
// controls: count text, the grid/list toggle group, and the Add button —
// this also renders for the nested [id]/edit route (no loading.tsx of its
// own), where the wizard form appears once loaded instead of this list.
export default function ListerVehiclesLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-20 rounded-lg" />
          <Skeleton className="h-12 w-20 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <VehicleCardSkeleton key={i} view="list" />
        ))}
      </div>
    </div>
  );
}
