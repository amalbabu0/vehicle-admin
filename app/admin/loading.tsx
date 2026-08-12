import { Skeleton } from "@/components/ui/skeleton";

// Next.js resolves loading.tsx per-segment, and app/admin/layout.tsx is an
// async Server Component (requireAdmin() + a security-alerts query) with no
// loading.tsx of its own — so on every cold navigation into /admin/* this is
// what actually renders while the layout resolves, not the page's own
// loading.tsx. Without shell-shaped chrome here, the sidebar/header
// disappeared entirely in favor of a content-only skeleton on every hard
// refresh or deep link. Mirrors AdminShell/AdminSidebar/AdminHeader's exact
// static structure (widths, the 9 nav items, h-16 rows, the mobile nav-menu
// trigger that replaced the old bottom nav) since none of their real data
// (profile, notification counts) exists yet at this point.
export default function AdminLoading() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-background/80 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="border-b border-border p-3">
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <Skeleton className="size-4.5 rounded" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 sm:px-6">
          <Skeleton className="order-first size-9 rounded-md lg:hidden" />
          <Skeleton className="hidden h-4 w-40 lg:block" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-40 rounded-md sm:w-56" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
            <Skeleton className="size-9 rounded-full" />
          </div>
          <Skeleton className="order-first size-9 rounded-full lg:order-none" />
        </header>

        <main className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <Skeleton className="h-8 w-56 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </main>
      </div>
    </div>
  );
}
