/**
 * Header.tsx
 * ─────────────────────────────────────────────────────────────────
 * Top navigation bar featuring:
 *  • App title ("FarmAssist")
 *  • Live / Offline status badge
 *  • Last Updated relative timestamp
 *  • Dark / Light theme toggle
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { Sun, Moon, Leaf, Wifi, WifiOff } from "lucide-react";
import { useAppTheme } from "./ThemeProvider";
import type { ConnectionStatus } from "@/types/telemetry";
import { useEffect, useState } from "react";

interface HeaderProps {
  status: ConnectionStatus;
  lastUpdated: number | null;
}

/** Converts a timestamp to a human-readable relative string. */
function timeAgo(timestamp: number | null): string {
  if (!timestamp) return "never";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default function Header({ status, lastUpdated }: HeaderProps) {
  const { theme, toggleTheme } = useAppTheme();
  const [relativeTime, setRelativeTime] = useState(() => timeAgo(lastUpdated));

  // Update the relative timestamp every second
  useEffect(() => {
    const id = setInterval(() => {
      setRelativeTime(timeAgo(lastUpdated));
    }, 1_000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const isLive = status === "live";
  const isStale = status === "stale";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* ── Left: Brand ── */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
              FarmAssist
            </h1>
            <p className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
              IoT Dashboard
            </p>
          </div>
        </div>

        {/* ── Center: Status + Last Updated ── */}
        <div className="flex items-center gap-4">
          {/* Status badge */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              isLive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : isStale
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
            }`}
          >
            {isLive ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {isLive
              ? "Live Feed"
              : isStale
                ? "Stale Data"
                : "Hardware Offline"}
          </div>

          {/* Last updated */}
          <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
            Updated {relativeTime}
          </span>
        </div>

        {/* ── Right: Theme Toggle ── */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
