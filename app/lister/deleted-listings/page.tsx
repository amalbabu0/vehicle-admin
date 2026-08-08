import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/dal";
import { getListerDeletedVehicles } from "@/lib/lister/vehicles-data";
import { DeletedListingCard } from "@/components/deleted-listing-card";

export const metadata: Metadata = { title: "Deleted Listings — Kerala Lease Hub" };
export const revalidate = 0;

// Guarded at the layout level (app/lister/layout.tsx) — RLS
// (vehicles_select_own) is what actually keeps this scoped to only the
// signed-in lister's own deleted listings, regardless of this query's own
// .eq("lister_id", ...) filter (see getListerDeletedVehicles's own note).
export default async function ListerDeletedListingsPage() {
  const profile = await getCurrentProfile();
  const listings = await getListerDeletedVehicles(profile.id);

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
          <p className="text-sm text-muted-foreground">Listings you delete stay recoverable here for 10 days.</p>
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
              deletedByName={listing.deletedByName}
              deletedByRole={listing.deletedByRole}
              deletedAt={listing.deletedAt}
              permanentDeleteAt={listing.permanentDeleteAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
