/**
 * OwnershipDeniedOverlay.tsx
 * ─────────────────────────────────────────────────────────────────
 * Full overlay shown over the dashboard content when the Rover is
 * registered to a different account in rover_registry.
 *
 * Blocks access to stale/empty data and directs the user to
 * Settings to force-pair or reconfigure the Rover.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { ShieldOff, Settings, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { RoverRegistryInfo } from "@/hooks/useDeviceValidation";
import { formatLastSeen } from "@/lib/formatLastSeen";

interface OwnershipDeniedOverlayProps {
  deviceId: string;
  currentUserUid: string;
  registryInfo: RoverRegistryInfo | null;
  onGoToSettings: () => void;
}

export default function OwnershipDeniedOverlay({
  deviceId,
  currentUserUid,
  registryInfo,
  onGoToSettings,
}: OwnershipDeniedOverlayProps) {
  const [uidCopied, setUidCopied] = useState(false);

  const handleCopyUid = async () => {
    try {
      await navigator.clipboard.writeText(currentUserUid);
      setUidCopied(true);
      setTimeout(() => setUidCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#060e1a]/90 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-red-500/30 bg-[#0c1a2e] p-6 shadow-2xl shadow-red-950/50">
        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15">
            <ShieldOff className="h-8 w-8 text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-lg font-bold text-white">
          Ownership Denied
        </h2>

        {/* Message */}
        <p className="mb-4 text-center text-sm text-slate-400 leading-relaxed">
          Rover{" "}
          <span className="font-mono text-cyan-400">{deviceId}</span>{" "}
          is registered to a different account. The ESP32 has stopped
          sending telemetry data.
        </p>

        {/* Rover info card */}
        <div className="mb-4 space-y-2 rounded-xl border border-red-500/15 bg-[#0a1628] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Rover ID</span>
            <span className="font-mono text-xs text-cyan-400">{deviceId}</span>
          </div>
          {registryInfo?.lastSeen && (
            <div className="flex items-center justify-between border-t border-cyan-900/20 pt-2">
              <span className="text-[10px] text-slate-500">Last seen</span>
              <span className="text-xs text-slate-400">
                {formatLastSeen(registryInfo.lastSeen)}
              </span>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-slate-400">
            To fix this:
          </p>
          <ol className="space-y-2">
            <li className="flex items-start gap-2 text-xs text-slate-300">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[9px] font-bold text-red-400">
                1
              </span>
              <span>
                Open the Rover&apos;s config portal (AP:{" "}
                <span className="font-mono text-cyan-400">
                  FarmAssist-Setup
                </span>
                )
              </span>
            </li>
            <li className="flex items-start gap-2 text-xs text-slate-300">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[9px] font-bold text-red-400">
                2
              </span>
              <span>
                Change <code className="font-mono text-cyan-400">User UID</code> to your account UID
              </span>
            </li>
            <li className="flex items-start gap-2 text-xs text-slate-300">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[9px] font-bold text-red-400">
                3
              </span>
              <span>
                Click <strong>&quot;Pair&quot;</strong> in Settings &gt; Rover ID
              </span>
            </li>
          </ol>
        </div>

        {/* UID copy */}
        <div className="mb-5 rounded-xl border border-cyan-500/20 bg-[#0a1628] p-3">
          <p className="mb-1 text-[10px] text-slate-500">
            Your account UID:
          </p>
          <div className="flex items-center gap-2">
            <p className="flex-1 font-mono text-[11px] text-cyan-400 break-all">
              {currentUserUid}
            </p>
            <button
              onClick={handleCopyUid}
              className="shrink-0 rounded-lg bg-cyan-500/20 px-2 py-1 text-[10px] text-cyan-400 transition-colors hover:bg-cyan-500/30"
            >
              {uidCopied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onGoToSettings}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/20 px-4 py-3 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
        >
          <Settings className="h-4 w-4" />
          Go to Settings
        </button>
      </div>
    </div>
  );
}
