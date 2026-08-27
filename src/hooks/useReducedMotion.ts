/**
 * useReducedMotion.ts
 * ─────────────────────────────────────────────────────────────────
 * Detects the user's prefers-reduced-motion media query.
 * When true, animations should be minimized or disabled for
 * accessibility.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mql.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}
