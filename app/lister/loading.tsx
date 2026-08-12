import { Skeleton } from "@/components/ui/skeleton";

// Mirrors app/admin/loading.tsx's reasoning: app/lister/layout.tsx is an
// async Server Component (getCurrentProfile() + a Supabase query) with no
// loading.tsx of its own, so this — not any nested page-level loading.tsx —
// is what actually renders on a cold navigation into /lister/*. Shaped after
// ListerShell/ListerSidebar/ListerHeader's static structure (widths, the 4
// nav items, h-16 rows) since real profile data doesn't exist yet here.
export default function ListerLoading() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-background/80 lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
              <Skeleton className="size-4.5 rounded" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-3 sm:gap-3 sm:px-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
          </div>
        </header>

        <main className="flex-1 space-y-4 overflow-y-auto pb-20 lg:pb-0">
          <div className="space-y-4 p-3 pb-8 sm:p-6">
            <Skeleton className="h-7 w-48 rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-20 rounded-2xl" />
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-background/95 px-1 py-2 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-2 w-8 rounded" />
          </div>
        ))}
      </nav>
    </div>
  );
}
