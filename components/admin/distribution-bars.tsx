import type { DistributionEntry } from "@/lib/admin/dashboard-data";

/** Plain CSS bar list — no charting library. This is an internal,
 * low-traffic admin page, but pulling in a chart dependency for a handful
 * of horizontal bars isn't worth the bundle weight either way. */
export function DistributionBars({ title, entries }: { title: string; entries: DistributionEntry[] }) {
  const max = Math.max(1, ...entries.map((entry) => entry.count));

  return (
    <div className="glass-surface rounded-(--glass-radius-lg) p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map((entry) => (
            <div key={entry.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="capitalize text-muted-foreground">{entry.label}</span>
                <span className="font-medium tabular-nums">{entry.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(entry.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
