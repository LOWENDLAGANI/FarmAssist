/**
 * BroadcastBanner.tsx
 * ─────────────────────────────────────────────────────────────────
 * Dismissible banner shown at the top of the dashboard content when
 * the user has an active broadcast in "banner" or "both" mode.
 * Dismissing only hides it for this session — the broadcast stays in
 * the database until the user stops it from Account Settings.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { Broadcast } from "@/hooks/useBroadcast";

interface BroadcastBannerProps {
  broadcast: Broadcast;
}

export default function BroadcastBanner({ broadcast }: BroadcastBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent p-3 sm:mb-6 sm:p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
          <Megaphone className="h-4 w-4 text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Broadcast
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {broadcast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss broadcast"
          className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}