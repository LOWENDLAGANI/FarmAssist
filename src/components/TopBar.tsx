/**
 * TopBar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Top navigation bar for the Farm Assistant dashboard.
 * Shows title, connection status, and system icons.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { Cloud, Wifi, WifiOff, BatteryCharging } from "lucide-react";
import type { ConnectionStatus } from "@/types/telemetry";

interface TopBarProps {
  status: ConnectionStatus;
  lastUpdated: number | null;
}

export default function TopBar({ status, lastUpdated }: TopBarProps) {
  const isLive = status === "live";
  const isStale = status === "stale";

  return (
    <header className="flex h-12 items-center justify-between border-b border-cyan-900/30 bg-[#0a1628] px-4 sm:h-14 sm:px-6">
      {/* ── Left: Title ── */}
      <h1 className="text-base font-semibold text-white sm:text-lg">
        Farm Assistant
      </h1>

      {/* ── Right: Status icons ── */}
      <div className="flex items-center gap-4">
        {/* Cloud icon */}
        <Cloud className="h-5 w-5 text-slate-400" />

        {/* WiFi status */}
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <Wifi className="h-5 w-5 text-emerald-400" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-400" />
          )}
          <span
            className={`text-xs font-medium ${
              isLive
                ? "text-emerald-400"
                : isStale
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {isLive ? "Live" : isStale ? "Stale" : "Offline"}
          </span>
        </div>

        {/* Battery */}
        <BatteryCharging className="h-5 w-5 text-slate-400" />
      </div>
    </header>
  );
}
