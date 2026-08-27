/**
 * AchievementToast.tsx
 * ─────────────────────────────────────────────────────────────────
 * Animated toast notification that slides in when an achievement
 * is unlocked. Auto-dismisses after 5 seconds.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import type { AchievementToast as AchievementToastType } from "@/types/gamification";

interface AchievementToastProps {
  achievement: AchievementToastType | null;
}

export default function AchievementToast({ achievement }: AchievementToastProps) {
  if (!achievement) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 sm:bottom-8">
      <div className="animate-achievement-toast flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/90 to-yellow-950/90 px-5 py-3 shadow-2xl shadow-amber-500/20 backdrop-blur-sm">
        {/* Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-2xl">
          {achievement.icon}
        </div>

        {/* Text */}
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            Achievement Unlocked!
          </span>
          <span className="text-sm font-bold text-white">{achievement.name}</span>
          <span className="text-[10px] text-amber-300/70">+{achievement.xpReward} XP</span>
        </div>
      </div>
    </div>
  );
}
