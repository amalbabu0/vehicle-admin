import { Skeleton } from "@/components/ui/skeleton";
import { DeletedListingCardSkeleton } from "@/components/deleted-listing-card";

// Mirrors app/lister/deleted-listings/page.tsx: heading + count line, then a
// grid-cols-2 lg:grid-cols-3 grid of DeletedListingCard (lister variant —
// no "Lister:" line, no "Delete Permanently" button, aspect-4/3 image).
export default function ListerDeletedListingsLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <DeletedListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
