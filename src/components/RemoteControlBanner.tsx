/**
 * RemoteControlBanner.tsx
 * ─────────────────────────────────────────────────────────────────
 * Small floating indicator shown on a device right after it follows
 * an admin remote-control command — reassures the person holding the
 * iPad that the page change came from the admin, not a touch glitch.
 *
 * Auto-dismisses (Dashboard clears it after 6 s).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { Radio } from "lucide-react";

interface RemoteControlBannerProps {
  /** Human-readable page label that was opened, e.g. "Control". */
  pageLabel: string;
}

export default function RemoteControlBanner({ pageLabel }: RemoteControlBannerProps) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-50 -translate-x-1/2 animate-fade-in">
      <div className="flex items-center gap-2 rounded-full border border-cyan-400/30 bg-[#0a1628]/95 px-4 py-2 shadow-lg shadow-cyan-950/40 backdrop-blur">
        <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-400" aria-hidden="true" />
        <span className="text-xs font-semibold text-cyan-300">
          Following admin — opened {pageLabel}
        </span>
      </div>
    </div>
  );
}
