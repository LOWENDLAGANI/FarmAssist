/**
 * BanGate.tsx
 * ─────────────────────────────────────────────────────────────────
 * Unclosable full-screen gate shown when the signed-in account has an
 * active ban (see AuthProvider). There is deliberately no close
 * button, no backdrop click, and no Escape handler — a banned user
 * cannot dismiss this screen. It lifts automatically when the admin
 * removes the ban (`bans/{uid}` deleted) or the ban's duration runs
 * out (the real-time listener flips the state).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { Ban, CalendarClock, ShieldAlert } from "lucide-react";
import type { BanRecord } from "@/lib/bans";
import { formatBanExpiry } from "@/lib/bans";

export default function BanGate({ ban }: { ban: BanRecord }) {
  const isPermanent = ban.expiresAt === 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#2b0f0f] px-4 py-10"
      style={{
        background:
          "radial-gradient(ellipse 90% 65% at 50% 32%, #7c3030 0%, #5c1d1d 45%, #2b0f0f 100%)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Account suspended"
      // Unclosable: no onBackdropClick, no close button, no Escape handler.
    >
      <div className="w-full max-w-sm rounded-3xl border border-red-500/25 bg-[#2b1212]/85 p-8 shadow-2xl shadow-black/40 backdrop-blur-md animate-scale-in">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15">
            <Ban className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Account Suspended</h2>
          <p className="mt-1 text-xs leading-relaxed text-red-200/70">
            Your access to FarmAssist has been restricted by the owner.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-300/80">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              Reason
            </p>
            <p className="text-sm leading-relaxed text-red-100">{ban.reason}</p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3">
            <CalendarClock className="h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-300/80">
                {isPermanent ? "Ban type" : "Banned until"}
              </p>
              <p className="truncate text-sm font-semibold text-red-100">
                {formatBanExpiry(ban.expiresAt)}
              </p>
            </div>
          </div>

          <p className="pt-1 text-center text-[10px] text-red-200/40">
            If you believe this is a mistake, contact the owner to have the ban lifted.
          </p>
        </div>
      </div>
    </div>
  );
}
