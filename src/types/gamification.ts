/**
 * types/gamification.ts
 * ─────────────────────────────────────────────────────────────────
 * Core data interfaces for the FarmAssist gamification system.
 *
 * RTDB path: users/{uid}/gamification
 * ─────────────────────────────────────────────────────────────────
 */

/** All possible achievement IDs. */
export type AchievementId =
  | "first_light"
  | "first_pair"
  | "alert_responder_5"
  | "alert_responder_25"
  | "alert_responder_50"
  | "streak_3"
  | "streak_7"
  | "streak_14"
  | "streak_30"
  | "perfect_day"
  | "perfect_week"
  | "sensor_master"
  | "data_collector_5"
  | "data_collector_25"
  | "night_owl"
  | "early_bird"
  | "level_5"
  | "level_10"
  | "level_25"
  | "water_guardian"
  | "temperature_tamer"
  | "green_thumb";

/** Achievement definition (static, not stored in Firebase). */
export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  icon: string; // emoji
  xpReward: number;
}

/** A single achievement unlock record (stored in Firebase). */
export interface AchievementRecord {
  unlocked: boolean;
  date?: string; // ISO date when unlocked
}

/** Gamification state stored per-user in Firebase RTDB. */
export interface GamificationData {
  /** Total experience points earned. */
  xp: number;
  /** Current level (derived from XP, but stored for quick access). */
  level: number;
  /** Daily login streak. */
  loginStreak: number;
  /** Days with all sensors in optimal range. */
  optimalStreak: number;
  /** ISO date string of the last day counted for streaks. */
  lastStreakDate: string;
  /** Unlocked achievements keyed by AchievementId. */
  achievements: Partial<Record<AchievementId, AchievementRecord>>;
  /** Daily challenges state (stored in Firebase). */
  challenges?: import("@/types/dailyChallenge").DailyChallenges;
  /** Lifetime stats. */
  stats: GamificationStats;
}

/** Cumulative lifetime stats. */
export interface GamificationStats {
  totalXpEarned: number;
  alertResponses: number;
  perfectDays: number;
  sessionsRun: number;
  totalUptimeMinutes: number;
}

/** XP award event — passed to awardXp(). */
export interface XpAward {
  amount: number;
  reason: string;
  icon: string;
}

/** Toast notification for a new achievement unlock. */
export interface AchievementToast {
  id: AchievementId;
  name: string;
  icon: string;
  xpReward: number;
}
