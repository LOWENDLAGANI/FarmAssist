/**
 * GamificationBar.tsx
 * ─────────────────────────────────────────────────────────────────
 * Compact gamification HUD shown below the WelcomeBanner on the
 * Dashboard page. Displays:
 *  • Level badge with emoji and title
 *  • XP progress bar
 *  • Login streak flame
 *  • Optimal-day streak
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import type { GamificationBarData } from "@/hooks/useGamification";

interface GamificationBarProps {
  data: GamificationBarData;
}

export default function GamificationBar({ data }: GamificationBarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] px-4 py-3 sm:mb-8 sm:gap-5 sm:px-6 sm:py-4">
      {/* ── Level Badge ── */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 text-lg">
          {data.levelEmoji}
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-400">Level {data.level}</span>
          <span className="text-sm font-bold text-white">{data.levelTitle}</span>
        </div>
      </div>

      {/* ── XP Progress Bar ── */}
      <div className="flex flex-1 flex-col gap-1 min-w-[120px]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500">XP Progress</span>
          <span className="text-[10px] text-slate-500">
            {data.xpCurrent} / {data.xpNeeded}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${Math.min(data.xpRatio * 100, 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-600">{data.xp.toLocaleString()} total XP</span>
      </div>

      {/* ── Streak Counters ── */}
      <div className="flex items-center gap-3">
        {/* Login Streak */}
        <div className="flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-2.5 py-1.5">
          <span className="text-sm">🔥</span>
          <span className="text-xs font-bold text-orange-400">{data.loginStreak}</span>
          <span className="hidden text-[10px] text-orange-400/70 sm:inline">day</span>
        </div>

        {/* Optimal Streak */}
        {data.optimalStreak > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5">
            <span className="text-sm">✨</span>
            <span className="text-xs font-bold text-emerald-400">{data.optimalStreak}</span>
            <span className="hidden text-[10px] text-emerald-400/70 sm:inline">perfect</span>
          </div>
        )}
      </div>
    </div>
  );
}
