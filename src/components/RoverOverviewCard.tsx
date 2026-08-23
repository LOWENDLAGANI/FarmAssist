/**
 * RoverOverviewCard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Compact overview card displayed at the top of the Settings page.
 * Shows key Rover identity and status at a glance.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { Cpu, Wifi, WifiOff, Check, X, Clock } from "lucide-react";
import type { ConnectionStatus } from "@/types/telemetry";
import type { DeviceLinkStatus, RoverRegistryInfo } from "@/hooks/useDeviceValidation";

/** Format a lastSeen timestamp into a human-readable relative string. */
function formatLastSeen(lastSeenMs: number): string {
  const now = Date.now();
  const diffMs = now - lastSeenMs;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m ago`;
  return `${diffDay}d ${diffHr % 24}h ago`;
}

interface RoverOverviewCardProps {
  deviceId: string;
  connectionStatus: ConnectionStatus;
  linkStatus: DeviceLinkStatus;
  registryInfo: RoverRegistryInfo | null;
}

interface StatusDotProps {
  color: string;
}

function StatusDot({ color }: StatusDotProps) {
  return <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

interface InfoRowProps {
  label: string;
  children: React.ReactNode;
}

function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      {children}
    </div>
  );
}

export default function RoverOverviewCard({
  deviceId,
  connectionStatus,
  linkStatus,
  registryInfo,
}: RoverOverviewCardProps) {
  const isLinked = linkStatus === "linked";
  const isTaken = linkStatus === "taken";
  const isUnregistered = linkStatus === "unregistered";
  const isLive = connectionStatus === "live";
  const isStale = connectionStatus === "stale";

  return (
    <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
          <Cpu className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">Rover Overview</h3>
          <p className="text-[10px] text-slate-500">Quick status at a glance</p>
        </div>
      </div>

      <div className="divide-y divide-cyan-900/15">
        {/* Rover ID */}
        <InfoRow label="Rover ID">
          <span className="font-mono text-xs text-cyan-400">{deviceId}</span>
        </InfoRow>

        {/* Ownership */}
        <InfoRow label="Ownership">
          {isLinked && (
            <div className="flex items-center gap-1.5">
              <StatusDot color="bg-emerald-400" />
              <span className="text-xs text-emerald-400">Paired to you</span>
            </div>
          )}
          {isTaken && (
            <div className="flex items-center gap-1.5">
              <StatusDot color="bg-red-400" />
              <span className="text-xs text-red-400">Taken by another account</span>
            </div>
          )}
          {isUnregistered && (
            <div className="flex items-center gap-1.5">
              <StatusDot color="bg-amber-400" />
              <span className="text-xs text-amber-400">Not paired</span>
            </div>
          )}
          {linkStatus === "loading" && (
            <span className="text-[11px] text-slate-500">Checking…</span>
          )}
        </InfoRow>

        {/* Connection */}
        <InfoRow label="ESP32 Connection">
          <div className="flex items-center gap-1.5">
            {isLive ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className={`h-3.5 w-3.5 ${isStale ? "text-amber-400" : "text-red-400"}`} />
            )}
            <span className={`text-xs ${
              isLive ? "text-emerald-400" : isStale ? "text-amber-400" : "text-red-400"
            }`}>
              {isLive ? "Live" : isStale ? "Not Responding" : "Offline"}
            </span>
          </div>
        </InfoRow>

        {/* Last Seen */}
        <InfoRow label="Last Seen">
          {registryInfo?.lastSeen ? (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-slate-500" />
              <span className="text-xs text-slate-400">
                {formatLastSeen(registryInfo.lastSeen)}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500">—</span>
          )}
        </InfoRow>

        {/* Firmware */}
        <InfoRow label="Firmware">
          {registryInfo?.firmwareVersion ? (
            <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] text-cyan-400">
              v{registryInfo.firmwareVersion}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">—</span>
          )}
        </InfoRow>

        {/* Paired UID (only when linked) */}
        {isLinked && registryInfo?.ownerUid && (
          <InfoRow label="Linked UID">
            <span className="max-w-[160px] truncate font-mono text-[10px] text-slate-400">
              {registryInfo.ownerUid}
            </span>
          </InfoRow>
        )}
      </div>
    </div>
  );
}
