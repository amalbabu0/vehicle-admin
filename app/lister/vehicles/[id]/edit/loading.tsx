import { Skeleton } from "@/components/ui/skeleton";

// Without this, app/lister/vehicles/loading.tsx (a listing-grid/list shape)
// was reused here since this route has no loading.tsx of its own — but the
// real page renders AddVehicleWizard, nothing like a card list. Mirrors
// StepProgress's 6-dot stepper + label line, then a generic set of form
// fields and the Back/Next footer buttons.
export default function EditVehicleLoading() {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-1 items-center last:flex-none">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              {i < 5 ? <Skeleton className="mx-1 h-0.5 flex-1 rounded-none" /> : null}
            </div>
          ))}
        </div>
        <Skeleton className="mt-2 h-4 w-40" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <Skeleton className="h-13 flex-1 rounded-lg" />
        <Skeleton className="h-13 flex-1 rounded-lg" />
      </div>
    </div>
  );
}
