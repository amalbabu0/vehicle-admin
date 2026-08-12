import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/admin/users/[id]/page.tsx: back-link, a profile header card
// (avatar circle + name + status badge + row-actions button, then a
// sm:grid-cols-2 lg:grid-cols-4 dl of 4 stat fields), and a favorited-
// vehicles list card.
export default function AdminUserDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />

      <div className="glass-surface glass-specular rounded-(--glass-radius-lg) p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>

      <div className="glass-surface rounded-(--glass-radius-lg) p-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-2 h-3 w-72" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      </div>

      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
  );
}
