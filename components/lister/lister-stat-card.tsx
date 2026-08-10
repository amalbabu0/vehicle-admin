import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ListerStatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success" | "destructive";
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-4 shadow-sm shadow-black/5">
      <Icon
        className={cn(
          "pointer-events-none absolute -top-4 -right-4 size-28 opacity-[0.07]",
          tone === "warning" && "text-amber-600",
          tone === "success" && "text-emerald-600",
          tone === "destructive" && "text-destructive",
          tone === "default" && "text-primary"
        )}
      />
      <div
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full",
          tone === "warning" && "bg-amber-500/15 text-amber-600",
          tone === "success" && "bg-emerald-500/15 text-emerald-600",
          tone === "destructive" && "bg-destructive/15 text-destructive",
          tone === "default" && "bg-primary/10 text-primary"
        )}
      >
        <Icon className="size-4.5" />
      </div>
      <p className="relative mt-3 text-2xl font-semibold tabular-nums">{value.toLocaleString("en-IN")}</p>
      <p className="relative text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
