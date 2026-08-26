/**
 * DeviceMismatchBanner.tsx
 * ─────────────────────────────────────────────────────────────────
 * Warning banner + dialog shown when a Rover cannot be used by the
 * current account.
 *
 * Modes:
 *  • "taken"        — Rover is paired to another account in the
 *                     rover_registry. User must force-pair in Settings.
 *  • "unregistered" — Rover has never been paired through the web app.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import {
  AlertTriangle,
  LinkIcon,
  X,
  Copy,
  Check,
} from "lucide-react";
import type { DeviceLinkStatus, RoverRegistryInfo } from "@/hooks/useDeviceValidation";
import { formatLastSeen } from "@/lib/formatLastSeen";

interface DeviceMismatchBannerProps {
  status: DeviceLinkStatus;
  currentDeviceId: string;
  currentUserUid: string;
  registryInfo?: RoverRegistryInfo | null;
}

export default function DeviceMismatchBanner({
  status,
  currentDeviceId,
  currentUserUid,
  registryInfo,
}: DeviceMismatchBannerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);

  // Don't show anything if linked or still loading
  if (status === "linked" || status === "loading") return null;

  const isTaken = status === "taken";

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
    <>
      {/* ── Clickable Banner ── */}
      <div
        onClick={() => setShowDialog(true)}
        className={`mb-4 cursor-pointer rounded-xl border p-3 transition-colors sm:mb-6 sm:p-4 ${
          isTaken
            ? "border-red-500/30 bg-red-950/30 hover:border-red-500/50"
            : "border-cyan-500/30 bg-cyan-950/30 hover:border-cyan-500/50"
        }`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`h-4 w-4 shrink-0 ${
              isTaken ? "text-red-400" : "text-cyan-400"
            }`}
          />
          <span
            className={`flex-1 text-sm ${
              isTaken ? "text-red-300" : "text-cyan-300"
            }`}
          >
            {isTaken
              ? `Rover "${currentDeviceId}" is already paired to another account`
              : `Rover "${currentDeviceId}" hasn\u2019t been paired yet`}
          </span>
          <span
            className={`shrink-0 text-[10px] ${
              isTaken ? "text-red-500" : "text-cyan-500"
            }`}
          >
            Click for details
          </span>
        </div>
      </div>

      {/* ── Detail Dialog ── */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDialog(false)}
          />

          {/* Dialog */}
          <div
            className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border bg-[#0c1a2e] p-0 shadow-2xl ${
              isTaken
                ? "border-red-500/30 shadow-red-950/50"
                : "border-cyan-500/30 shadow-cyan-950/50"
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between border-b px-6 py-4 ${
                isTaken
                  ? "border-red-900/30 bg-red-950/30"
                  : "border-cyan-900/30 bg-cyan-950/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isTaken ? "bg-red-500/20" : "bg-cyan-500/20"
                  }`}
                >
                  <LinkIcon
                    className={`h-5 w-5 ${
                      isTaken ? "text-red-400" : "text-cyan-400"
                    }`}
                  />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {isTaken
                    ? "Rover Already Paired"
                    : "Rover Not Paired"}
                </h3>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {isTaken ? (
                <>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    The Rover{" "}
                    <span className="font-mono text-cyan-400">
                      {currentDeviceId}
                    </span>{" "}
                    is currently paired to a different account. Only one
                    account can be paired to a Rover at a time.
                  </p>

                  <div className="rounded-xl border border-red-500/20 bg-[#0a1628] p-3 space-y-1">
                    <p className="text-xs text-red-400">
                      &#9888;&#65039; You cannot receive live data while
                      another account owns this Rover.
                    </p>
                    {registryInfo?.lastSeen && (
                      <p className="text-[10px] text-slate-500">
                        Rover was last seen {formatLastSeen(registryInfo.lastSeen)}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">
                      How to fix:
                    </p>
                    <ol className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">
                          1
                        </span>
                        <span>
                          Ask the current owner to{" "}
                          <strong>Unlink</strong> the Rover in their
                          Settings, OR
                        </span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">
                          2
                        </span>
                        <span>
                          Once unlinked, go to{" "}
                          <strong>Settings &gt; Rover ID</strong> and
                          click{" "}
                          <strong>&quot;Pair&quot;</strong> to claim
                          ownership
                        </span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">
                          3
                        </span>
                        <span>
                          Update the Rover&apos;s{" "}
                          <code className="font-mono text-cyan-400">
                            USER_UID
                          </code>{" "}
                          to your account UID via its config portal
                        </span>
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628] p-3">
                    <p className="text-xs text-slate-400 mb-1">
                      Your account UID (copy this into the Rover):
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 font-mono text-xs text-cyan-400 break-all">
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
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    The Rover{" "}
                    <span className="font-mono text-cyan-400">
                      {currentDeviceId}
                    </span>{" "}
                    has never been paired through the web app. Click{" "}
                    <strong>&quot;Pair&quot;</strong> in Settings to
                    register it to your account.
                  </p>

                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">
                      How to pair:
                    </p>
                    <ol className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
                          1
                        </span>
                        <span>
                          Make sure the Rover&apos;s{" "}
                          <code className="font-mono text-cyan-400">
                            USER_UID
                          </code>{" "}
                          matches your account (in the Rover&apos;s config
                          portal)
                        </span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
                          2
                        </span>
                        <span>
                          Go to{" "}
                          <strong>Settings &gt; Rover ID</strong> and click{" "}
                          <strong>&quot;Pair&quot;</strong>
                        </span>
                      </li>
                    </ol>
                  </div>

                  <div className="rounded-xl border border-cyan-500/20 bg-[#0a1628] p-3">
                    <p className="text-xs text-slate-400 mb-1">
                      Your account UID:
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 font-mono text-xs text-cyan-400 break-all">
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
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-cyan-900/20 px-6 py-4">
              <button
                onClick={() => setShowDialog(false)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isTaken
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                }`}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
