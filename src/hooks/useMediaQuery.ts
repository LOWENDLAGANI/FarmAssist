/**
 * useMediaQuery.ts
 * ─────────────────────────────────────────────────────────────────
 * Lightweight hook to detect viewport size using matchMedia.
 * Returns true when the query matches (e.g. is below a breakpoint).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", onStoreChange);
      return () => mediaQuery.removeEventListener("change", onStoreChange);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );

  // Rendering a desktop-safe fallback on the server avoids accessing window.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Convenience hook — true when viewport < 768px. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
