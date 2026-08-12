import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/admin/table-skeleton";

// Mirrors app/admin/listings/page.tsx: heading + Add Vehicle button,
// ListingsTabs (5 tabs), ListingsFilters bar, count line, then the
// ListingsTable's 9 columns (checkbox, Vehicle, Price, Fuel/Transmission,
// Location, Lister, Status, Created, Actions).
export default function AdminListingsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>

      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-4 w-32" />

      <TableSkeleton columns={9} rows={10} />
    </div>
  );
}
