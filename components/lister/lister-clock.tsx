"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const interval = setInterval(callback, 1000 * 30);
  return () => clearInterval(interval);
}

function getSnapshot() {
  return Date.now();
}

// Server has no "now" to render — 0 is a sentinel meaning "not mounted yet",
// avoiding an SSR/client timestamp mismatch without setState-in-effect.
function getServerSnapshot() {
  return 0;
}

export function ListerClock() {
  const timestamp = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (timestamp === 0) return null;

  const now = new Date(timestamp);
  return (
    <div className="hidden flex-col text-right leading-tight md:flex">
      <span className="text-xs font-medium">
        {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
      </span>
    </div>
  );
}
