/**
 * AccountPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Dedicated account / user info page.
 * Shows profile photo, display name, email, account UID (copyable),
 * sign-in method, member-since date, and a sign-out button.
 * Works in guest mode too (shows a guest profile + exit button).
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { useAuth } from "../AuthProvider";
import {
  User,
  Mail,
  Fingerprint,
  Copy,
  Check,
  LogOut,
  Zap,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";

export default function AccountPage() {
  const { user, isGuest, logOut } = useAuth();
  const [uidCopied, setUidCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = isGuest ? "Guest User" : user?.displayName ?? "FarmAssist User";
  const email = isGuest ? "Not available in guest mode" : user?.email ?? "No email linked";
  const photoURL = isGuest ? null : user?.photoURL ?? null;
  const userUID = isGuest ? "guest-mode" : user?.uid ?? "";
  const signInMethod = isGuest
    ? "Guest session (simulated data)"
    : user?.providerData?.[0]?.providerId === "google.com"
      ? "Google account"
      : "Email / password";
  const memberSince = isGuest
    ? null
    : user?.metadata?.creationTime
      ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  const copyUid = async () => {
    try {
      await navigator.clipboard.writeText(userUID);
      setUidCopied(true);
      setTimeout(() => setUidCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logOut();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Account</h2>
        <p className="text-sm text-slate-400">
          Your profile and sign-in information
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-6 animate-slide-up">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          {photoURL ? (
            <img
              src={photoURL}
              alt="Profile photo"
              className="h-20 w-20 shrink-0 rounded-2xl border-2 border-cyan-500/30 object-cover shadow-lg shadow-cyan-950/50"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-2 border-cyan-500/30 bg-cyan-500/10 shadow-lg shadow-cyan-950/50">
              <User className="h-10 w-10 text-cyan-400" />
            </div>
          )}

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
              <h3 className="truncate text-lg font-bold text-white">{displayName}</h3>
              {isGuest ? (
                <span className="flex w-fit items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
                  <Zap className="h-3 w-3" />
                  Guest
                </span>
              ) : (
                <span className="flex w-fit items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </span>
              )}
            </div>

            {/* Info rows */}
            <dl className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-cyan-400" />
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">Email</dt>
                  <dd className="truncate text-sm text-slate-200">{email}</dd>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5">
                <Fingerprint className="h-4 w-4 shrink-0 text-cyan-400" />
                <div className="min-w-0 flex-1">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">Account UID</dt>
                  <dd className="truncate font-mono text-xs text-cyan-300">{userUID}</dd>
                </div>
                {!isGuest && (
                  <button
                    type="button"
                    onClick={copyUid}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium text-cyan-400 transition-all hover:bg-cyan-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {uidCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400" />
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">Sign-in method</dt>
                  <dd className="truncate text-sm text-slate-200">{signInMethod}</dd>
                </div>
              </div>

              {memberSince && (
                <div className="flex items-center gap-3 rounded-xl border border-cyan-900/20 bg-[#0a1628] px-3 py-2.5">
                  <CalendarDays className="h-4 w-4 shrink-0 text-cyan-400" />
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wide text-slate-500">Member since</dt>
                    <dd className="truncate text-sm text-slate-200">{memberSince}</dd>
                  </div>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Guest notice */}
        {isGuest && (
          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3">
            <div className="flex items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-400">
                You are in guest mode with simulated sensor data. Sign in with Google to
                connect a real Rover and sync your settings.
              </p>
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-950/50 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Signing out..." : isGuest ? "Exit Guest Mode" : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
