/**
 * useScreenWakeLock.ts
 * ─────────────────────────────────────────────────────────────────
 * Keeps the device screen from sleeping while `enabled` is true
 * using the Screen Wake Lock API (navigator.wakeLock).
 *
 * Intended for Rover Screen Mode so the 7-inch rover display stays
 * on while it is mounted and monitoring.
 *
 * Handles the two gotchas of the API:
 *  • Wake locks are automatically released when the tab is hidden,
 *    so it re-acquires on visibilitychange back to visible.
 *  • request() can reject (unsupported browser, low power, iframe),
 *    so it silently retries on a timer instead of crashing.
 *
 * No-op on browsers without support.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useRef } from "react";

/** Delay before retrying after a failed acquisition attempt. */
const RETRY_DELAY_MS = 10_000;

export function useScreenWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Feature-detect — Safari and some webviews don't support the API.
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let cancelled = false;
    let retryTimer: number | undefined;

    const releaseSentinel = async () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        try {
          await sentinel.release();
        } catch {
          // Already released — nothing to do.
        }
      }
    };

    const acquire = async () => {
      if (cancelled) return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          // Cleanup ran while we were awaiting — don't leave a lock behind.
          try {
            await sentinel.release();
          } catch {
            // Ignore
          }
          return;
        }
        sentinelRef.current = sentinel;
        // The browser (or the user) may release the lock without telling
        // us — drop our reference so we re-acquire when visible again.
        sentinel.onrelease = () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        };
      } catch {
        // Unsupported / denied / temporary failure — try again shortly.
        if (!cancelled) {
          retryTimer = window.setTimeout(acquire, RETRY_DELAY_MS);
        }
      }
    };

    // The lock is dropped whenever the tab is hidden; grab it again
    // when the operator comes back to the screen.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        acquire();
      }
    };

    acquire();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      releaseSentinel();
    };
  }, [enabled]);
}
