import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getDeletedListings } from "@/lib/admin/listings-data";
import { DeletedListingCard } from "@/components/deleted-listing-card";

export const metadata: Metadata = { title: "Deleted Listings — Kerala Lease Hub" };
export const revalidate = 0;

// Guarded at the layout level (app/admin/layout.tsx's requireAdmin()) —
// every lister's and every admin's deletions, per migration 0022's
// unrestricted vehicles_select_admin RLS policy.
export default async function AdminDeletedListingsPage() {
  const listings = await getDeletedListings();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Deleted Listings</h1>
        <p className="text-sm text-muted-foreground">
          {listings.length} listing{listings.length === 1 ? "" : "s"} pending permanent deletion within 10 days.
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <Trash2 className="size-10 text-muted-foreground" />
          <p className="font-medium">Nothing here.</p>
          <p className="text-sm text-muted-foreground">Deleted listings from every lister will show up here for 10 days.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {listings.map((listing) => (
            <DeletedListingCard
              key={listing.id}
              id={listing.id}
              name={listing.name}
              status={listing.status}
              coverImageUrl={listing.coverImageUrl}
              coverThumbnailUrl={listing.coverThumbnailUrl}
              listerName={listing.listerName}
              deletedByName={listing.deletedByName}
              deletedByRole={listing.deletedByRole}
              deletedAt={listing.deletedAt}
              permanentDeleteAt={listing.permanentDeleteAt}
              canPermanentlyDelete
            />
          ))}
        </div>
      )}
    </div>
  );
}
