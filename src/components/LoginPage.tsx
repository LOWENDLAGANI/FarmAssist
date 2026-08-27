/**
 * LoginPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Sign-in page with Google authentication and Guest mode.
 *
 * 🎨 Poster-style design (green gradient, mascot, wordmark + tagline).
 *
 * 🖼️ MASCOT SETUP:
 * Drop your mascot picture at:   public/farmassist-mascot.png
 * (A transparent PNG looks best. If missing, a sprout icon
 *  is shown instead — the page still works fine.)
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Sprout, Loader2, User, Zap, Leaf, Sparkles } from "lucide-react";

/** Decorative floating leaves scattered around the screen */
const DECOR_LEAVES = [
  { className: "left-[8%] top-[12%] h-10 w-10 rotate-[-25deg]", delay: "0s" },
  { className: "right-[10%] top-[20%] h-8 w-8 rotate-[20deg]", delay: "0.8s" },
  { className: "left-[14%] bottom-[16%] h-12 w-12 rotate-[15deg]", delay: "1.6s" },
  { className: "right-[8%] bottom-[24%] h-9 w-9 rotate-[-15deg]", delay: "0.4s" },
  { className: "left-[45%] top-[6%] h-6 w-6 rotate-[30deg]", delay: "1.2s" },
  { className: "right-[30%] bottom-[8%] h-7 w-7 rotate-[-30deg]", delay: "2s" },
];

export default function LoginPage() {
  const { signInWithGoogle, signInAsGuest } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("[LoginPage] Sign-in failed:", err);
      const message =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(message);
    } finally {
      setSigningIn(false);
    }
  };

  const handleGuestSignIn = () => {
    signInAsGuest();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1d3a14] px-4 py-10">
      {/* ── Poster background: radial green glow ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 65% at 50% 32%, #4a7c2e 0%, #356021 45%, #1d3a14 100%)",
        }}
        aria-hidden="true"
      />

      {/* ── Floating leaf decorations ── */}
      {DECOR_LEAVES.map((leaf, i) => (
        <Leaf
          key={i}
          className={`absolute text-lime-300/15 animate-float ${leaf.className}`}
          style={{ animationDelay: leaf.delay }}
          aria-hidden="true"
        />
      ))}
      {/* Sparkles like on the poster */}
      <Sparkles className="absolute left-[30%] top-[14%] h-4 w-4 text-lime-200/40 animate-pulse" aria-hidden="true" />
      <Sparkles className="absolute right-[26%] top-[38%] h-3 w-3 text-lime-200/30 animate-pulse" style={{ animationDelay: "1s" }} aria-hidden="true" />

      {/* ── Content ── */}
      <div className="relative w-full max-w-sm">
        {/* Mascot — drop your picture at public/farmassist-mascot.png */}
        <div className="mb-4 flex justify-center">
          <img
            src="/farmassist-mascot.png"
            alt="FarmAssist mascot"
            className="h-44 w-44 animate-float object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
            onError={(e) => {
              // No mascot picture yet → show a sprout icon instead
              const img = e.currentTarget;
              if (img.dataset.fallback) return;
              img.dataset.fallback = "1";
              img.style.display = "none";
              img.nextElementSibling?.removeAttribute("style");
            }}
          />
          <div
            className="flex h-28 w-28 items-center justify-center rounded-3xl bg-lime-500/15 shadow-xl shadow-black/30"
            style={{ display: "none" }}
          >
            <Sprout className="h-14 w-14 text-lime-300" />
          </div>
        </div>

        {/* Wordmark + tagline */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            <span className="text-white">Farm</span>
            <span className="text-lime-400">Assist</span>
          </h1>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-lime-200/90">
            <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
            Simplified IoT Dashboard just for you
            <Leaf className="h-3.5 w-3.5 -scale-x-100" aria-hidden="true" />
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-lime-500/25 bg-[#16290f]/85 p-8 shadow-2xl shadow-black/40 backdrop-blur-md animate-scale-in">
          {/* Google Sign-In Button */}
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-md transition-all hover:bg-gray-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingIn ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {signingIn ? "Signing in..." : "Sign in with Google"}
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-lime-500/20" />
            <span className="text-xs text-lime-200/60">or</span>
            <div className="h-px flex-1 bg-lime-500/20" />
          </div>

          {/* Guest Sign-In Button */}
          <button
            onClick={handleGuestSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-lime-500/40 bg-lime-500/15 px-4 py-3 text-sm font-medium text-lime-300 transition-all hover:bg-lime-500/25 hover:shadow-lg hover:shadow-lime-500/10 hover:scale-[1.02] active:scale-[0.98]"
          >
            <User className="h-5 w-5" />
            Sign in as Guest
          </button>

          {/* Guest Mode Info */}
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/30 p-3">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-amber-400 font-medium">
                  Guest Mode
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  This account is using simulated sensor data.
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-800/40 bg-red-950/30 p-3">
              <p className="text-center text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-lime-200/40">
          Powered by Minetallest
        </p>
      </div>
    </div>
  );
}
