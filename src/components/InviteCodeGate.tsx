/**
 * InviteCodeGate.tsx
 * ─────────────────────────────────────────────────────────────────
 * Unclosable full-screen gate that blocks the ENTIRE app until the
 * signed-in account is verified with the shared invite code.
 *
 * Shown whenever the current user's `users/{uid}/verified` flag is not
 * `true` (see AuthProvider). There is deliberately no close button,
 * no backdrop click, and no Escape handler — the only way past is the
 * correct invite code. A wrong code keeps the popup up with an error.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, type FormEvent } from "react";
import { Loader2, KeyRound, ShieldCheck, Sprout } from "lucide-react";
import { useAuth } from "./AuthProvider";

/** Pull the server's message out of a httpsCallable error. */
function gateError(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  if (!e?.message) return "Something went wrong. Please try again.";
  // httpsCallable can prefix the message with the error code
  // (e.g. "permission-denied, ..." or "internal(0), ...").
  const stripped = e.message.match(/^[a-z-]+(?:\(\d*\))?\s*,\s*(.*)$/);
  return stripped ? stripped[1] : e.message;
}

export default function InviteCodeGate({ checking }: { checking: boolean }) {
  const { verifyInviteCode } = useAuth();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyInviteCode(trimmed);
      // Success: AuthProvider flips the verified flag and this gate unmounts.
    } catch (err) {
      console.error("[InviteCodeGate] Verification failed:", err);
      setError(gateError(err));
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#1d3a14] px-4 py-10"
      style={{
        background:
          "radial-gradient(ellipse 90% 65% at 50% 32%, #4a7c2e 0%, #356021 45%, #1d3a14 100%)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Invite code required"
      // Unclosable: no onBackdropClick, no close button, no Escape handler.
    >
      <div className="w-full max-w-sm">
        {checking ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-500/15">
              <Loader2 className="h-7 w-7 animate-spin text-lime-400" />
            </div>
            <p className="text-sm font-medium text-lime-200/80">
              Checking your account…
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-lime-500/25 bg-[#16290f]/85 p-8 shadow-2xl shadow-black/40 backdrop-blur-md animate-scale-in">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-500/15">
                <KeyRound className="h-7 w-7 text-lime-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Invite Code Required</h2>
              <p className="mt-1 text-xs leading-relaxed text-lime-200/70">
                FarmAssist is invite-only. Enter the invite code you were
                given to unlock your account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-lime-400/50" />
                <input
                  type="text"
                  placeholder="Invite code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={submitting}
                  className="w-full rounded-xl border border-lime-500/25 bg-lime-500/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-lime-200/40 transition-all focus:border-lime-400/50 focus:bg-lime-500/15 focus:outline-none focus:ring-1 focus:ring-lime-400/30 disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-800/40 bg-red-950/30 p-3">
                  <p className="text-center text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !code.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-lime-900/30 transition-all hover:bg-lime-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {submitting ? "Verifying…" : "Unlock My Account"}
              </button>
            </form>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-lime-200/40">
              <Sprout className="h-3 w-3" aria-hidden="true" />
              Your account stays unverified until the code is entered correctly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}