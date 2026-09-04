/**
 * useFullscreen.ts
 * ─────────────────────────────────────────────────────────────────
 * Forces the browser into fullscreen while `enabled` is true.
 *
 * Intended for Rover Screen Mode so the 7-inch rover display uses
 * every pixel while mounted and monitoring.
 *
 * The Fullscreen API requires a user gesture to enter fullscreen, so:
 *  • Requesting happens the moment the mode flips on — the Settings
 *    toggle click counts as a gesture, so it normally enters at once.
 *  • If the request is refused (e.g. rover mode was persisted and the
 *    app just loaded with no gesture yet), it retries on the next
 *    tap or key press instead of giving up.
 *  • If the screen drops out of fullscreen (Esc, browser chrome) while
 *    rover mode is still on, the next interaction pulls it back in.
 *
 * Exits fullscreen as soon as the mode is turned off.
 * No-op on browsers without Fullscreen API support (e.g. iOS Safari).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef } from "react";

export function useFullscreen(enabled: boolean) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const enteredRef = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    // Feature-detect — iOS Safari and some webviews don't support the API.
    if (typeof root.requestFullscreen !== "function") return;

    // Mode turned off: leave fullscreen, but only if we were the ones
    // who entered it (don't yank another feature's fullscreen away).
    if (!enabled) {
      if (enteredRef.current && document.fullscreenElement) {
        enteredRef.current = false;
        document.exitFullscreen().catch(() => {
          // Already out of fullscreen — nothing to do.
        });
      }
      return;
    }

    const enter = () => {
      if (!enabledRef.current || document.fullscreenElement) return;
      root
        .requestFullscreen()
        .then(() => {
          enteredRef.current = true;
        })
        .catch(() => {
          // Refused (no user gesture yet, or browser policy) — the
          // gesture listeners below retry on the next tap / key press.
        });
    };

    // Fullscreen needs a real user gesture: retry on any interaction
    // while rover mode is on and we're not already fullscreen. This
    // also pulls fullscreen back in if the user or browser dropped it.
    const handleGesture = () => enter();
    document.addEventListener("pointerdown", handleGesture);
    document.addEventListener("keydown", handleGesture);

    // Straight attempt first — the toggle click that turned the mode on
    // usually still counts as a gesture here.
    enter();

    return () => {
      document.removeEventListener("pointerdown", handleGesture);
      document.removeEventListener("keydown", handleGesture);
    };
  }, [enabled]);
}
