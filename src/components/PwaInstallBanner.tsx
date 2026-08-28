/**
 * PwaInstallBanner.tsx
 * ─────────────────────────────────────────────────────────────────
 * Prompts the user to install FarmAssist as a PWA when the browser
 * supports installation. Shows a dismissable banner at the top of
 * the dashboard.
 *
 * • Captures the `beforeinstallprompt` event
 * • Detects if the app is already installed (standalone display mode)
 * • Dismissal is persisted to localStorage so the banner stays hidden
 * • Only shows after the user has been active for a few seconds
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X, Smartphone } from "lucide-react";

/** Browser-native install prompt event (not in standard TS types yet). */
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "farmassist-pwa-install-dismissed";

function isAlreadyInstalled(): boolean {
  if (typeof window === "undefined") return false;
  // Standalone means the app was launched from a home screen icon
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari sets this when added to home screen
  if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) return true;
  return false;
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "true");
  } catch {
    // localStorage unavailable — ignore
  }
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isAlreadyInstalled() || wasDismissed()) return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Small delay so the banner animates in smoothly after page load
      setTimeout(() => setVisible(true), 1500);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        // Hide immediately on success
        setVisible(false);
      }
    } catch {
      // User cancelled or error — keep banner visible for retry
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    markDismissed();
  }, []);

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="mb-4 animate-slide-up sm:mb-6">
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 p-4 sm:p-5">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />

        <div className="relative flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
            <Smartphone className="h-5 w-5 text-cyan-400" />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              Install FarmAssist
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
              Add to your home screen for faster access, offline support, and a full-screen app experience — no browser bar needed.
            </p>

            {/* Action buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                {installing ? "Installing…" : "Install"}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-xl border border-cyan-900/20 bg-[#0a1628]/60 px-3 py-2 text-xs font-medium text-slate-400 transition-all hover:bg-[#0f2240] hover:text-slate-200"
              >
                Not now
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-cyan-500/10 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
