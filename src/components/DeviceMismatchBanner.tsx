/**
 * DeviceMismatchBanner.tsx
 * ─────────────────────────────────────────────────────────────────
 * Warning banner + dialog shown when a Rover (ESP32) appears to be
 * linked to a different account, or hasn't been paired through the
 * web app yet.
 *
 * Two modes:
 *  • "mismatch"     — No telemetry data at this user's path and no
 *                     link record. The ESP32 is almost certainly
 *                     writing to another account.
 *  • "unregistered" — No link record but telemetry IS present (ESP32
 *                     is writing here, user just never clicked Pair).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import {
  AlertTriangle,
  LinkIcon,
  X,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import type { DeviceLinkStatus } from "@/hooks/useDeviceValidation";

interface DeviceMismatchBannerProps {
  status: DeviceLinkStatus;
  currentDeviceId: string;
  currentUserUid: string;
}

export default function DeviceMismatchBanner({
  status,
  currentDeviceId,
  currentUserUid,
}: DeviceMismatchBannerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [uidCopied, setUidCopied] = useState(false);

  // Don't show anything if linked or still loading
  if (status === "linked" || status === "loading") return null;

  const isMismatch = status === "mismatch";

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
          isMismatch
            ? "border-amber-500/30 bg-amber-950/30 hover:border-amber-500/50"
            : "border-cyan-500/30 bg-cyan-950/30 hover:border-cyan-500/50"
        }`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`h-4 w-4 shrink-0 ${
              isMismatch ? "text-amber-400" : "text-cyan-400"
            }`}
          />
          <span
            className={`flex-1 text-sm ${
              isMismatch ? "text-amber-300" : "text-cyan-300"
            }`}
          >
            {isMismatch
              ? `Rover "${currentDeviceId}" is linked to a different account`
              : `Rover "${currentDeviceId}" hasn\u2019t been paired with your account yet`}
          </span>
          <span
            className={`shrink-0 text-[10px] ${
              isMismatch ? "text-amber-500" : "text-cyan-500"
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
            className={`relative w-full max-w-md rounded-2xl border bg-[#0c1a2e] p-0 shadow-2xl overflow-hidden ${
              isMismatch
                ? "border-amber-500/30 shadow-amber-950/50"
                : "border-cyan-500/30 shadow-cyan-950/50"
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between border-b px-6 py-4 ${
                isMismatch
                  ? "border-amber-900/30 bg-amber-950/30"
                  : "border-cyan-900/30 bg-cyan-950/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isMismatch ? "bg-amber-500/20" : "bg-cyan-500/20"
                  }`}
                >
                  <LinkIcon
                    className={`h-5 w-5 ${
                      isMismatch ? "text-amber-400" : "text-cyan-400"
                    }`}
                  />
                </div>
                <h3 className="text-base font-semibold text-white">
                  {isMismatch
                    ? "Rover Linked to Another Account"
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
              {isMismatch ? (
                <>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    No sensor data was found for{" "}
                    <span className="font-mono text-cyan-400">
                      {currentDeviceId}
                    </span>{" "}
                    under your account. This usually means the Rover is
                    writing data to a different user&apos;s path in the
                    database.
                  </p>

                  <div className="rounded-xl border border-amber-500/20 bg-[#0a1628] p-3">
                    <p className="text-xs text-amber-400">
                      &#9888;&#65039; The Rover&apos;s{" "}
                      <code className="font-mono">USER_UID</code> does not
                      match your account.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">
                      How to fix:
                    </p>
                    <ol className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
                          1
                        </span>
                        <span>
                          Open the Rover&apos;s config portal (connect to AP:{" "}
                          <span className="font-mono text-cyan-400">
                            FarmAssist-Setup
                          </span>
                          )
                        </span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
                          2
                        </span>
                        <span>
                          Change the{" "}
                          <code className="font-mono text-cyan-400">
                            User UID
                          </code>{" "}
                          to your account UID (below)
                        </span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400">
                          3
                        </span>
                        <span>
                          Save, restart the Rover, then click{" "}
                          <strong>&quot;Pair&quot;</strong> in Settings
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
                    is sending data but hasn&apos;t been paired with your
                    account through the web app. Click &quot;Pair&quot; in
                    Settings to complete the link.
                  </p>

                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-2">
                      How to complete pairing:
                    </p>
                    <ol className="space-y-2">
                      <li className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400">
                          1
                        </span>
                        <span>
                          Verify the Rover&apos;s{" "}
                          <code className="font-mono text-cyan-400">
                            User UID
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
                className="flex items-center gap-1.5 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-[#0f2240] hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Go to Settings
              </button>
              <button
                onClick={() => setShowDialog(false)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isMismatch
                    ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
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
