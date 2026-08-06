import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-6xl rounded-3xl border border-border bg-background/80 p-8 shadow-sm shadow-black/5 backdrop-blur-xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-12 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>

        <div className="mt-8 rounded-3xl border border-border bg-background/80 p-6 shadow-sm shadow-black/5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-40 rounded-full" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
