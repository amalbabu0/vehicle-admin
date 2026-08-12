import { Skeleton } from "@/components/ui/skeleton";

// Mirrors ListerSettingsForm's collapsed default state: 3 sections
// (Profile — Name/Phone cards, Security — Change Password/Change Email
// cards, Account — a single Delete account button), each ExpandableCard
// collapsed to just its title+description row.
function ExpandableCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="size-4 shrink-0 rounded" />
      </div>
    </div>
  );
}

export default function ListerSettingsLoading() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="max-w-2xl space-y-5">
        <section className="space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3.5 w-64" />
          </div>
          <ExpandableCardSkeleton />
          <ExpandableCardSkeleton />
        </section>

        <section className="space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <ExpandableCardSkeleton />
          <ExpandableCardSkeleton />
        </section>

        <section className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </section>
      </div>
    </div>
  );
}
