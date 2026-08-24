/**
 * GuestModeBanner.tsx
 * ─────────────────────────────────────────────────────────────────
 * Banner displayed when guest mode is active, informing the user
 * that they're viewing simulated data for demo purposes.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { X, Zap, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function GuestModeBanner() {
  const { isGuest, logOut } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isGuest || dismissed) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 sm:mb-6 sm:p-4 animate-slide-down">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 shrink-0">
          <Zap className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-amber-400">
              Demo Mode
            </span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-semibold text-amber-400 uppercase tracking-wide">
              Guest
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Guest data for Rover &quot;demo-farm-001&quot;.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={async () => await logOut()}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Exit Guest Mode"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800/50 hover:text-white"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
