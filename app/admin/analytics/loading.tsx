import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/admin/analytics/page.tsx: heading, 2 rows of lg:grid-cols-2
// TimeseriesChart panels (daily + monthly), a 4-up DistributionBars row,
// then a "Most Viewed Listings" card with an 8-item sm:grid-cols-2 list.
export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-(--glass-radius-lg)" />
        <Skeleton className="h-64 rounded-(--glass-radius-lg)" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-(--glass-radius-lg)" />
        <Skeleton className="h-64 rounded-(--glass-radius-lg)" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-(--glass-radius-lg)" />
        ))}
      </div>

      <div className="glass-surface rounded-(--glass-radius-lg) p-5">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
