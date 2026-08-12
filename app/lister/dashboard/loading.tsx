import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/lister/dashboard/page.tsx: a single greeting line (not a
// label+heading pair), exactly 2 ListerStatCards in one grid-cols-2 row,
// the full-width "Add Vehicle" button, and a "Recent listings" card
// holding up to 5 rows (getListerRecentVehicles(profile.id, 5)) with a
// size-28 thumbnail each.
export default function ListerDashboardLoading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-32" />

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>

      <Skeleton className="h-13 w-full rounded-full" />

      <div className="rounded-2xl border border-border bg-background p-4 shadow-sm shadow-black/5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/60 p-2 pr-3">
              <Skeleton className="size-28 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
