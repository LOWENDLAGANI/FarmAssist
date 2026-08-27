/**
 * AchievementBadge.tsx
 * ─────────────────────────────────────────────────────────────────
 * Individual achievement badge that shows locked/unlocked state.
 * Used in the achievement grid and sidebar quick-view.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import type { AchievementDef } from "@/types/gamification";
import type { AchievementRecord } from "@/types/gamification";

interface AchievementBadgeProps {
  definition: AchievementDef;
  record?: AchievementRecord;
  compact?: boolean;
}

export default function AchievementBadge({
  definition,
  record,
  compact = false,
}: AchievementBadgeProps) {
  const unlocked = record?.unlocked ?? false;

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl border transition-all duration-300 ${
        compact ? "p-2" : "p-3 sm:p-4"
      } ${
        unlocked
          ? "border-amber-500/30 bg-amber-950/20 hover:border-amber-500/50 hover:bg-amber-950/30"
          : "border-slate-700/60 bg-slate-800/40 opacity-80 hover:opacity-95"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${
          compact ? "h-8 w-8 text-lg" : "h-10 w-10 text-xl sm:h-12 sm:w-12 sm:text-2xl"
        } ${
          unlocked
            ? "bg-amber-500/20"
            : "bg-slate-700/50 grayscale"
        }`}
      >
        {unlocked ? definition.icon : "🔒"}
      </div>

      {/* Text */}
      <div className="flex flex-1 flex-col min-w-0">
        <span
          className={`font-semibold truncate ${
            compact ? "text-xs" : "text-sm"
          } ${unlocked ? "text-white" : "text-slate-400"}`}
        >
          {definition.name}
        </span>
        {!compact && (
          <span className="text-[10px] text-slate-400 line-clamp-2">
            {definition.description}
          </span>
        )}
        {unlocked && record?.date && !compact && (
          <span className="mt-0.5 text-[10px] text-amber-400/60">
            Unlocked {new Date(record.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      {/* XP badge */}
      {!compact && (
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
            unlocked
              ? "bg-amber-500/20 text-amber-400"
              : "bg-slate-700/40 text-slate-400"
          }`}
        >
          +{definition.xpReward} XP
        </span>
      )}
    </div>
  );
}
