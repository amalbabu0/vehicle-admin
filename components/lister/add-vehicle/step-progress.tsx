import { Check } from "lucide-react";
import { WIZARD_STEPS } from "@/components/lister/add-vehicle/types";
import { cn } from "@/lib/utils";

export function StepProgress({ current }: { current: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((label, index) => (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                index < current && "bg-primary text-primary-foreground",
                index === current && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                index > current && "bg-muted text-muted-foreground"
              )}
            >
              {index < current ? <Check className="size-3.5" /> : index + 1}
            </div>
            {index < WIZARD_STEPS.length - 1 ? (
              <div className={cn("mx-1 h-0.5 flex-1", index < current ? "bg-primary" : "bg-muted")} />
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-2 text-sm font-medium text-muted-foreground">
        Step {current + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[current]}
      </p>
    </div>
  );
}
