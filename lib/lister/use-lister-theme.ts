"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ListerTheme = "light" | "dark" | "system";

const KEY = "lister:theme";
const CHANGE_EVENT = "lister-theme-change";

function readTheme(): ListerTheme {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  // Preserve the previous lister-only preference during this small migration
  // — an explicit past choice (either value) still wins over the new default.
  const legacy = localStorage.getItem("lister:dark-mode");
  if (legacy === "1") return "dark";
  if (legacy === "0") return "light";
  // No preference recorded anywhere — a brand-new lister defaults to dark.
  return "dark";
}

export function useListerTheme() {
  const subscribe = useCallback((callback: () => void) => {
    const onChange = (event: Event) => {
      if (event instanceof CustomEvent && event.detail !== KEY) return;
      callback();
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    media.addEventListener("change", onChange);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
      media.removeEventListener("change", onChange);
    };
  }, []);

  // Server snapshot matches the new default so first paint (before
  // hydration reads localStorage) doesn't flash light-then-dark.
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as ListerTheme);
  const setTheme = useCallback((next: ListerTheme) => {
    localStorage.setItem(KEY, next);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: KEY }));
  }, []);

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return { theme, setTheme, isDark };
}
