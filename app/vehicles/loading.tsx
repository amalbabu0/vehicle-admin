import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/admin/table-skeleton";

// Mirrors app/vehicles/page.tsx (the legacy combined admin/lister route,
// not wrapped in AdminShell/ListerShell): a rounded-3xl header card with
// title/subtitle and two buttons, then a 10-column table (Name, Status,
// Lease amount, Lease period, Fuel type, Transmission, Views, Created,
// Actions, Share) in its own rounded-3xl card, then a pagination bar.
export default function VehiclesLoading() {
  return (
    <main className="flex min-h-screen items-start justify-center p-8">
      <div className="w-full max-w-7xl space-y-6">
        <div className="rounded-3xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="h-10 w-40 rounded-md" />
            </div>
          </div>
        </div>

        <TableSkeleton columns={10} rows={10} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-background/80 p-4 shadow-sm shadow-black/5">
          <Skeleton className="h-4 w-72 max-w-full" />
          <div className="inline-flex gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-16 rounded-lg" />
            <Skeleton className="h-9 w-16 rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  );
}
