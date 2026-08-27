/**
 * LocationPrompt.tsx
 * ─────────────────────────────────────────────────────────────────
 * Dialog that appears once when geolocation permission is denied.
 * Explains why location access is needed and shows instructions
 * for re-enabling it in common browsers.
 *
 * Dismissed state is persisted in localStorage so it only shows
 * once per session until the user revisits.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState } from "react";
import { MapPin, X, ExternalLink, Smartphone, Monitor } from "lucide-react";

const DISMISSED_KEY = "farmassist-location-prompt-dismissed";

function wasDismissed(): boolean {
  if (typeof window === "undefined") return false;
  // Reset each session so it shows again on refresh if still denied
  const dismissed = sessionStorage.getItem(DISMISSED_KEY);
  return dismissed === "true";
}

function markDismissed(): void {
  sessionStorage.setItem(DISMISSED_KEY, "true");
}

/** Check current geolocation permission status. */
async function checkPermission(): Promise<"granted" | "denied" | "unavailable"> {
  if (!("geolocation" in navigator)) return "unavailable";

  // Try the Permission API first (more reliable)
  if ("permissions" in navigator) {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      if (result.state === "denied") return "denied";
      if (result.state === "granted") return "granted";
      // "prompt" = not yet asked — not denied
      return "granted";
    } catch {
      // Fall through to geolocation probe
    }
  }

  // Fallback: try to get position and see if it errors
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve("granted"),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve("denied");
        } else {
          resolve("unavailable");
        }
      },
      { timeout: 5000 }
    );
  });
}

export default function LocationPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (wasDismissed()) return;

    checkPermission().then((status) => {
      if (status === "denied") {
        setShow(true);
      }
    });
  }, []);

  const handleClose = () => {
    markDismissed();
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-900/30 bg-[#0a1628] shadow-2xl animate-scale-in"
        role="dialog"
        aria-label="Location access required"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 text-slate-400 transition-colors hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-center bg-gradient-to-br from-amber-500/10 to-orange-500/10 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20">
            <MapPin className="h-8 w-8 text-amber-400" />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-5">
          <h2 className="mb-2 text-lg font-bold text-white">
            Location Access Needed
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-300">
            FarmAssist uses your location to show accurate outdoor weather data
            next to your sensor readings. This helps you understand context like
            &quot;it&apos;s cloudy, so low light readings are normal.&quot;
          </p>
          <p className="mb-5 text-sm leading-relaxed text-slate-400">
            Weather still works with approximate data, but enabling location
            gives you the best experience.
          </p>

          {/* Instructions */}
          <div className="mb-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              How to enable
            </h3>

            {/* Chrome / Edge */}
            <div className="rounded-xl border border-cyan-900/20 bg-[#0c1a2e] p-3">
              <div className="flex items-center gap-2 mb-1">
                <Monitor className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-white">Chrome / Edge</span>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-0.5 ml-5 list-decimal">
                <li>Click the lock icon 🔒 in the address bar</li>
                <li>Set &quot;Location&quot; to <span className="text-emerald-400">Allow</span></li>
                <li>Refresh this page</li>
              </ol>
            </div>

            {/* Safari */}
            <div className="rounded-xl border border-cyan-900/20 bg-[#0c1a2e] p-3">
              <div className="flex items-center gap-2 mb-1">
                <Monitor className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-white">Safari</span>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-0.5 ml-5 list-decimal">
                <li>Safari → Settings → Websites → Location</li>
                <li>Find this site and set to <span className="text-emerald-400">Allow</span></li>
                <li>Refresh this page</li>
              </ol>
            </div>

            {/* Mobile */}
            <div className="rounded-xl border border-cyan-900/20 bg-[#0c1a2e] p-3">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-white">Mobile (iOS / Android)</span>
              </div>
              <ol className="text-[11px] text-slate-400 space-y-0.5 ml-5 list-decimal">
                <li>Go to your phone&apos;s <span className="text-white">Settings → Privacy → Location Services</span></li>
                <li>Find your browser (Chrome/Safari) and set to <span className="text-emerald-400">Allow</span></li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl bg-slate-700/50 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700/70"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                // Try to re-request permission by opening a new position request
                if ("geolocation" in navigator) {
                  navigator.geolocation.getCurrentPosition(
                    () => {
                      handleClose();
                      window.location.reload();
                    },
                    () => {
                      // Still denied — just close
                      handleClose();
                    },
                    { timeout: 10000 }
                  );
                } else {
                  handleClose();
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <MapPin className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
