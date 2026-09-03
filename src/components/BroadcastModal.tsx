/**
 * BroadcastModal.tsx
 * ─────────────────────────────────────────────────────────────────
 * Popup shown when the user has an active broadcast in "popup" or
 * "both" mode. Closing it only hides it for this session — the
 * broadcast stays in the database until the user stops it from
 * Account Settings.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { Broadcast } from "@/hooks/useBroadcast";

interface BroadcastModalProps {
  broadcast: Broadcast;
}

export default function BroadcastModal({ broadcast }: BroadcastModalProps) {
  // Dismiss once per broadcast (keyed by id) per session.
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  if (dismissedId === broadcast.id) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={() => setDismissedId(broadcast.id)}
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0c1a2e] shadow-2xl shadow-amber-950/40 animate-scale-in"
        role="dialog"
        aria-label="Broadcast"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-900/30 bg-amber-950/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
              <Megaphone className="h-5 w-5 text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Broadcast</h3>
          </div>
          <button
            type="button"
            onClick={() => setDismissedId(broadcast.id)}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#0f2240] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {broadcast.message}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-amber-900/20 px-6 py-4">
          <button
            type="button"
            onClick={() => setDismissedId(broadcast.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2.5 text-sm font-semibold text-amber-400 transition-all hover:bg-amber-500/30 hover:scale-[1.01] active:scale-[0.99]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}