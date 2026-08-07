import type { DailyCount } from "@/lib/admin/analytics-data";

/** Plain CSS/SVG-free bar chart — same reasoning as DistributionBars: an
 * internal, low-traffic admin page doesn't need a charting library for a
 * few dozen bars. */
export function TimeseriesChart({
  title,
  data,
  formatLabel,
}: {
  title: string;
  data: DailyCount[];
  formatLabel: (date: string) => string;
}) {
  const max = Math.max(1, ...data.map((entry) => entry.count));
  const total = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="glass-surface rounded-(--glass-radius-lg) p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">{total.toLocaleString("en-IN")} total</span>
      </div>
      {data.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="mt-4 flex h-32 items-end gap-1">
          {/* Each column needs its own definite (h-full) height for the
              bar's percentage height to resolve against — items-end alone
              leaves flex items at auto height, which makes a percentage
              height on the bar collapse to 0. */}
          {data.map((entry) => (
            <div key={entry.date} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-primary transition-colors group-hover:bg-primary/70"
                style={{ height: `${Math.max(4, (entry.count / max) * 100)}%` }}
              />
              <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background group-hover:block">
                {formatLabel(entry.date)}: {entry.count}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
