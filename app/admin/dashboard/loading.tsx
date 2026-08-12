import { Skeleton } from "@/components/ui/skeleton";

function ListCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="glass-surface rounded-(--glass-radius-lg) p-5">
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Mirrors app/admin/dashboard/page.tsx: 8 StatCards, then 2 rows of
// lg:grid-cols-2 list cards (Recent Activity/Most Viewed,
// Latest Users/Latest Listings — the latter with thumbnail rows), then a
// 4-up DistributionBars row and a 2-up row.
export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-(--glass-radius-lg)" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCardSkeleton rows={5} />
        <ListCardSkeleton rows={5} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCardSkeleton rows={5} />
        <div className="glass-surface rounded-(--glass-radius-lg) p-5">
          <Skeleton className="h-4 w-32" />
          <div className="mt-4 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/60 p-2 pr-3">
                <Skeleton className="size-20 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-(--glass-radius-lg)" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-(--glass-radius-lg)" />
        <Skeleton className="h-48 rounded-(--glass-radius-lg)" />
      </div>
    </div>
  );
}
