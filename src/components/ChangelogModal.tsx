/**
 * ChangelogModal.tsx
 * ─────────────────────────────────────────────────────────────────
 * "What's New" modal that shows app updates and new features.
 * Only appears once per version — version is stored in localStorage.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, PartyPopper } from "lucide-react";

const CURRENT_VERSION = "1.0.0";
const STORAGE_KEY = "farmassist-changelog-version";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: Array<{ type: "new" | "improved" | "fixed"; text: string }>;
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "August 2026",
    changes: [
      { type: "new", text: "AI Assistant — chat with Hikari for help with FarmAssist" },
      { type: "new", text: "Daily Challenges — complete tasks to earn bonus XP" },
      { type: "new", text: "Achievements — unlock badges as you farm smarter" },
      { type: "new", text: "Gamification — level up from Seedling to Farm Legend" },
      { type: "new", text: "Control Page — remote watering, fertilizer, and emergency stop" },
      { type: "new", text: "Weather Widget — see outdoor conditions for context" },
      { type: "new", text: "Onboarding Wizard — guided setup for new users" },
      { type: "improved", text: "Loading skeletons for smoother transitions" },
      { type: "improved", text: "Keyboard shortcuts for desktop power users" },
      { type: "improved", text: "Better accessibility with ARIA labels and focus management" },
    ],
  },
];

function hasSeenVersion(version: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === version;
}

function markVersionSeen(version: string): void {
  localStorage.setItem(STORAGE_KEY, version);
}

function getBadgeStyle(type: "new" | "improved" | "fixed") {
  switch (type) {
    case "new":
      return "bg-emerald-500/15 text-emerald-400";
    case "improved":
      return "bg-cyan-500/15 text-cyan-400";
    case "fixed":
      return "bg-amber-500/15 text-amber-400";
  }
}

function getBadgeLabel(type: "new" | "improved" | "fixed") {
  switch (type) {
    case "new":
      return "NEW";
    case "improved":
      return "IMPROVED";
    case "fixed":
      return "FIXED";
  }
}

export default function ChangelogModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!hasSeenVersion(CURRENT_VERSION)) {
      // Small delay so the app has time to load first
      const t = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    markVersionSeen(CURRENT_VERSION);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-cyan-900/30 bg-[#0a1628] shadow-2xl animate-scale-in"
        role="dialog"
        aria-label="What's new"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">What's New</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className="mb-4 last:mb-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  v{entry.version}
                </span>
                <span className="text-xs text-slate-500">{entry.date}</span>
              </div>
              <div className="space-y-2">
                {entry.changes.map((change, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold ${getBadgeStyle(change.type)}`}
                    >
                      {getBadgeLabel(change.type)}
                    </span>
                    <span className="text-sm text-slate-300">{change.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-cyan-900/20 px-6 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 hover:scale-[1.01] active:scale-[0.99]"
          >
            <Sparkles className="h-4 w-4" />
            Let&apos;s Go!
          </button>
        </div>
      </div>
    </div>
  );
}
