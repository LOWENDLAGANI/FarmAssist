/**
 * TopBar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Top navigation bar for the FarmAssist dashboard.
 * Shows title, connection status, user info, and system icons.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import Image from "next/image";
import { Wifi, WifiOff, LogOut, Battery } from "lucide-react";
import { useAuth } from "./AuthProvider";
import type { ConnectionStatus } from "@/types/telemetry";

interface TopBarProps {
  status: ConnectionStatus;
  lastUpdated?: number | null;
  deviceId?: string;
  batteryLevel?: number | null;
}

export default function TopBar({
  status,
  deviceId,
  batteryLevel,
}: TopBarProps) {
  const { user, logOut } = useAuth();
  const isLive = status === "live";
  const isStale = status === "stale";

  return (
    <header className="flex h-12 items-center justify-between border-b border-cyan-900/30 bg-[#0a1628] px-4 sm:h-14 sm:px-6">
      {/* ── Left: Title + Device ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-white sm:text-lg">
          FarmAssist
        </h1>
        {deviceId && (
          <span className="hidden rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400 sm:inline">
            {deviceId}
          </span>
        )}
      </div>

      {/* ── Right: Status + User ── */}
      <div className="flex items-center gap-3">
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
            {isLive ? "Live" : isStale ? "Not Responding" : "Offline"}
          </span>
        </div>

        {/* Battery status */}
        {batteryLevel != null && (
          <div className="flex items-center gap-1.5">
            <Battery
              className={`h-5 w-5 ${
                batteryLevel > 50 ? "text-emerald-400" : batteryLevel > 20 ? "text-amber-400" : "text-red-400"
              }`}
            />
            <span className="text-xs font-medium text-slate-300">
              {batteryLevel}%
            </span>
          </div>
        )}

        {/* User avatar + sign out */}
        {user && (
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName ?? "User"}
                width={28}
                height={28}
                className="h-7 w-7 rounded-full border border-cyan-900/30"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                {(user.displayName ?? user.email ?? "U")[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={logOut}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
