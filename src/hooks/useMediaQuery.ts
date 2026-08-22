/**
 * useMediaQuery.ts
 * ─────────────────────────────────────────────────────────────────
 * Lightweight hook to detect viewport size using matchMedia.
 * Returns true when the query matches (e.g. is below a breakpoint).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  // Initialize state with the current match — safe because this component
  // is "use client" so window is available on first render.
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Convenience hook — true when viewport < 768px. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
