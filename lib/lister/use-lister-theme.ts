"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ListerTheme = "light" | "dark" | "system";

const KEY = "lister:theme";
const CHANGE_EVENT = "lister-theme-change";

function readTheme(): ListerTheme {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark" || saved === "system") return saved;
  // Preserve the previous lister-only preference during this small migration.
  return localStorage.getItem("lister:dark-mode") === "1" ? "dark" : "light";
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

  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as ListerTheme);
  const setTheme = useCallback((next: ListerTheme) => {
    localStorage.setItem(KEY, next);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: KEY }));
  }, []);

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return { theme, setTheme, isDark };
}
