"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Keeps a Server Component page current without a manual reload.
 *
 * router.refresh() re-runs the server render and patches the result into the
 * existing tree, so the current URL — filters, date range, page number — is
 * preserved and the table does not flash or lose scroll position. That is why
 * this polls rather than doing a full location.reload().
 *
 * Polling, not Supabase Realtime, on purpose: Realtime would need the table
 * added to the supabase_realtime publication and an authenticated browser
 * subscription that satisfies RLS, which is a lot of moving parts for a log a
 * human reads. If you ever want genuinely instant rows rather than
 * within-the-interval, that is the upgrade path.
 */
const DEFAULT_INTERVAL_MS = 15_000;

export function AutoRefresh({ intervalMs = DEFAULT_INTERVAL_MS }: { intervalMs?: number }) {
  const router = useRouter();
  const [live, setLive] = useState(true);
  // The baseline lives in a ref, not state: it changes on every refresh but
  // nothing renders from it directly, and writing it from an effect avoids the
  // cascading re-render that setState-in-an-effect would cause.
  const lastRefreshedAtRef = useRef<number | null>(null);
  // null until the first tick, so server and client agree on the initial
  // render and hydration doesn't mismatch on a timestamp.
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
    lastRefreshedAtRef.current = Date.now();
    setSecondsAgo(0);
  }, [router]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      // A backgrounded tab is nobody watching — skip the round trip and let
      // the visibilitychange handler below catch up when they return.
      if (document.hidden) return;
      refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [live, intervalMs, refresh]);

  useEffect(() => {
    if (!live) return;
    const onVisibilityChange = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [live, refresh]);

  // One clock for the "updated Ns ago" label. Sets the mount baseline on the
  // ref, then updates the label from the interval callback — a callback, not
  // the effect body, which is what keeps this off the cascading-render path.
  useEffect(() => {
    lastRefreshedAtRef.current = Date.now();
    const id = setInterval(() => {
      const at = lastRefreshedAtRef.current;
      if (at !== null) setSecondsAgo(Math.round((Date.now() - at) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        <span
          aria-hidden
          className={
            live
              ? "size-2 shrink-0 rounded-full bg-emerald-500 motion-safe:animate-pulse"
              : "size-2 shrink-0 rounded-full bg-muted-foreground/40"
          }
        />
        {!live ? "Paused" : secondsAgo === null ? "Live" : `Live — updated ${secondsAgo}s ago`}
      </span>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={live ? "Pause auto-refresh" : "Resume auto-refresh"}
        onClick={() => setLive((value) => !value)}
      >
        {live ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>

      <Button type="button" variant="outline" size="icon" aria-label="Refresh now" onClick={refresh}>
        <RefreshCw className="size-4" />
      </Button>
    </div>
  );
}
