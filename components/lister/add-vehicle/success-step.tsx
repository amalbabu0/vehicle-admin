import Link from "next/link";
import { CheckCircle2, PlusCircle, List } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SuccessStep({ onAddAnother }: { onAddAnother: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
        <CheckCircle2 className="size-8" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Vehicle submitted successfully</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your listing has been submitted for review.</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
        Status: Pending Approval
      </span>

      <div className="mt-4 flex w-full max-w-xs flex-col gap-2">
        <Link href="/lister/vehicles" className="no-underline">
          <Button className="min-h-13 w-full gap-2">
            <List className="size-4" /> View My Vehicles
          </Button>
        </Link>
        <Button variant="outline" className="min-h-13 w-full gap-2" onClick={onAddAnother}>
          <PlusCircle className="size-4" /> Add Another Vehicle
        </Button>
      </div>
    </div>
  );
}
