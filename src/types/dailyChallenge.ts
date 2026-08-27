/**
 * types/dailyChallenge.ts
 * ─────────────────────────────────────────────────────────────────
 * Daily challenge system types.
 *
 * Three challenges rotate each day, giving players goals to chase
 * and bonus XP on completion. Combined with XP multipliers for
 * login streaks, this creates a strong daily return loop.
 *
 * RTDB path: users/{uid}/gamification/challenges/{YYYY-MM-DD}
 * ─────────────────────────────────────────────────────────────────
 */

/** The three action types that challenges can track. */
export type ChallengeAction =
  | "keep_sensor_in_range"    // Keep a specific sensor in range for X minutes
  | "respond_to_alert"        // Respond to N alerts
  | "run_logging_session"     // Start and complete N logging sessions
  | "check_dashboard"         // Check the dashboard at a specific time window
  | "maintain_all_optimal";   // Keep ALL sensors in range for X minutes

/** A single daily challenge definition. */
export interface DailyChallengeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: ChallengeAction;
  /** Target value to complete the challenge (e.g., 3 sessions, 60 minutes). */
  target: number;
  /** Bonus XP awarded on completion. */
  xpReward: number;
  /** Optional: which sensor this challenge relates to. */
  sensor?: "temperature" | "moisture" | "waterLevel" | "light";
}

/** A challenge instance for a specific day, with user progress. */
export interface DailyChallengeState {
  /** The challenge definition ID. */
  challengeId: string;
  /** Current progress towards the target. */
  progress: number;
  /** Whether this challenge has been completed today. */
  completed: boolean;
  /** Whether the XP reward has been claimed. */
  claimed: boolean;
}

/** All three challenges for a single day. */
export interface DailyChallenges {
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  /** The three active challenges. */
  challenges: DailyChallengeState[];
}

/** XP multiplier info derived from login streak. */
export interface XpMultiplier {
  /** Current multiplier (e.g., 1.5 = 50% bonus). */
  multiplier: number;
  /** Human-readable label (e.g., "🔥 7-Day Streak: 1.5x XP"). */
  label: string;
  /** Color class for the UI. */
  colorClass: string;
}
