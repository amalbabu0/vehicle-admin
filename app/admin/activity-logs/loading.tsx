import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/admin/table-skeleton";

// Mirrors app/admin/activity-logs/page.tsx: heading, ActivityLogsFilters bar,
// then a 5-column table (Admin/Action/Entity/Details/When). The
// brute-force-alert banner is data-dependent (only renders when attacks
// exist) so it's intentionally omitted here rather than guessed.
export default function ActivityLogsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <Skeleton className="h-10 w-full max-w-2xl rounded-lg" />
      <TableSkeleton columns={5} rows={10} />
    </div>
  );
}
