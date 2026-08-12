import { Skeleton } from "@/components/ui/skeleton";
import { DeletedListingCardSkeleton } from "@/components/deleted-listing-card";

// Mirrors app/admin/deleted-listings/page.tsx: heading + count line, then a
// grid-cols-2 lg:grid-cols-3 grid of DeletedListingCard, which on the admin
// variant shows the extra "Lister: …" line and the "Delete Permanently"
// button (canPermanentlyDelete).
export default function AdminDeletedListingsLoading() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-6 w-44" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <DeletedListingCardSkeleton key={i} showListerLine showDeleteButton />
        ))}
      </div>
    </div>
  );
}
