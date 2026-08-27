/**
 * AchievementsPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Full-page achievements view showing all achievements in a
 * categorized grid with locked/unlocked states and progress stats.
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import type { GamificationData } from "@/types/gamification";
import { ACHIEVEMENTS } from "@/lib/gamification";
import AchievementBadge from "../AchievementBadge";

interface AchievementsPageProps {
  gamificationData: GamificationData;
}

/** Group achievements by category prefix. */
const CATEGORIES = [
  { label: "Onboarding", ids: ["first_light", "first_pair"] as const },
  { label: "Alerts", ids: ["alert_responder_5", "alert_responder_25", "alert_responder_50"] as const },
  { label: "Streaks", ids: ["streak_3", "streak_7", "streak_14", "streak_30"] as const },
  { label: "Perfect Days", ids: ["perfect_day", "perfect_week"] as const },
  { label: "Sensor Mastery", ids: ["sensor_master", "water_guardian", "temperature_tamer", "green_thumb"] as const },
  { label: "Data Collection", ids: ["data_collector_5", "data_collector_25"] as const },
  { label: "Time of Day", ids: ["night_owl", "early_bird"] as const },
  { label: "Level Milestones", ids: ["level_5", "level_10", "level_25"] as const },
];

export default function AchievementsPage({ gamificationData }: AchievementsPageProps) {
  const totalUnlocked = ACHIEVEMENTS.filter(
    (a) => gamificationData.achievements[a.id]?.unlocked
  ).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          🏅 Achievements
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {totalUnlocked} / {ACHIEVEMENTS.length} unlocked
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
            style={{ width: `${(totalUnlocked / ACHIEVEMENTS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {CATEGORIES.map((cat) => {
          const defs = cat.ids.map((id) => ACHIEVEMENTS.find((a) => a.id === id)!);
          const unlockedCount = defs.filter(
            (d) => gamificationData.achievements[d.id]?.unlocked
          ).length;

          return (
            <div key={cat.label}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">{cat.label}</h2>
                <span className="text-[10px] text-slate-400">
                  {unlockedCount}/{defs.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {defs.map((def) => (
                  <AchievementBadge
                    key={def.id}
                    definition={def}
                    record={gamificationData.achievements[def.id]}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className="mt-8 rounded-2xl border border-cyan-900/20 bg-[#0c1a2e] p-4 sm:p-6">
        <h2 className="mb-4 text-sm font-semibold text-white">📊 Lifetime Stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total XP"
            value={gamificationData.stats.totalXpEarned.toLocaleString()}
            icon="⭐"
          />
          <StatCard
            label="Alerts Handled"
            value={String(gamificationData.stats.alertResponses)}
            icon="⚡"
          />
          <StatCard
            label="Perfect Days"
            value={String(gamificationData.stats.perfectDays)}
            icon="✨"
          />
          <StatCard
            label="Sessions Run"
            value={String(gamificationData.stats.sessionsRun)}
            icon="📊"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#0a1525] p-3">
      <span className="text-lg">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="text-sm font-bold text-white">{value}</span>
      </div>
    </div>
  );
}
