"use client";

import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "admin-local-storage-change";

/** localStorage-backed boolean via useSyncExternalStore, not useState +
 * useEffect — reading localStorage during render would mismatch the server's
 * render (it has no localStorage), and writing it via an effect-triggered
 * setState is exactly the "syncing with an external system" case
 * useSyncExternalStore exists for. The native `storage` event only fires in
 * *other* tabs, so a custom event covers same-tab updates too. */
export function useLocalStorageBoolean(key: string, defaultValue: boolean) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const handler = (event: Event) => {
        if (event instanceof CustomEvent && event.detail !== key) return;
        callback();
      };
      window.addEventListener(CHANGE_EVENT, handler);
      window.addEventListener("storage", callback);
      return () => {
        window.removeEventListener(CHANGE_EVENT, handler);
        window.removeEventListener("storage", callback);
      };
    },
    [key]
  );

  const getSnapshot = useCallback(() => localStorage.getItem(key) === "1", [key]);
  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: boolean) => {
      localStorage.setItem(key, next ? "1" : "0");
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
    },
    [key]
  );

  return [value, setValue] as const;
}
