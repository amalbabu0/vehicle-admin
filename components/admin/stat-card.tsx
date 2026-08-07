import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success" | "destructive";
}) {
  return (
    <div className="glass-surface glass-specular rounded-(--glass-radius-lg) p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-full",
            tone === "warning" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
            tone === "success" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            tone === "destructive" && "bg-destructive/15 text-destructive",
            tone === "default" && "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString("en-IN") : value}</p>
    </div>
  );
}
