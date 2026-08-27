/**
 * lib/dailyChallenges.ts
 * ─────────────────────────────────────────────────────────────────
 * Daily challenge engine — generates 3 challenges per day using
 * a seeded PRNG (so all users see the same challenges each day),
 * tracks progress, and computes XP multipliers from login streaks.
 * ─────────────────────────────────────────────────────────────────
 */

import type {
  DailyChallengeDef,
  DailyChallengeState,
  DailyChallenges,
  XpMultiplier,
  ChallengeAction,
} from "@/types/dailyChallenge";

// ── Challenge Definitions Pool ──────────────────────────────────
// The daily rotation picks 3 from this pool using a seeded PRNG
// so every user sees the same 3 challenges on the same day.

const CHALLENGE_POOL: DailyChallengeDef[] = [
  // ── Sensor Range Challenges ──
  {
    id: "temp_in_range_30",
    title: "Temperature Watch",
    description: "Keep temperature in range for 30 minutes",
    icon: "🌡️",
    action: "keep_sensor_in_range",
    target: 30,
    xpReward: 25,
    sensor: "temperature",
  },
  {
    id: "moisture_in_range_30",
    title: "Moisture Monitor",
    description: "Keep soil moisture in range for 30 minutes",
    icon: "💧",
    action: "keep_sensor_in_range",
    target: 30,
    xpReward: 25,
    sensor: "moisture",
  },
  {
    id: "water_in_range_30",
    title: "Water Watchdog",
    description: "Keep water level in range for 30 minutes",
    icon: "🌊",
    action: "keep_sensor_in_range",
    target: 30,
    xpReward: 25,
    sensor: "waterLevel",
  },
  {
    id: "light_in_range_30",
    title: "Light Tracker",
    description: "Keep light levels in range for 30 minutes",
    icon: "☀️",
    action: "keep_sensor_in_range",
    target: 30,
    xpReward: 25,
    sensor: "light",
  },

  // ── All-Optimal Challenges ──
  {
    id: "all_optimal_15",
    title: "Perfect Conditions",
    description: "Keep ALL sensors in range for 15 minutes",
    icon: "✨",
    action: "maintain_all_optimal",
    target: 15,
    xpReward: 40,
  },
  {
    id: "all_optimal_60",
    title: "Farm Harmony",
    description: "Keep ALL sensors in range for 1 hour",
    icon: "🌈",
    action: "maintain_all_optimal",
    target: 60,
    xpReward: 80,
  },

  // ── Alert Response Challenges ──
  {
    id: "respond_alerts_2",
    title: "Quick Response",
    description: "Respond to 2 sensor alerts",
    icon: "⚡",
    action: "respond_to_alert",
    target: 2,
    xpReward: 30,
  },
  {
    id: "respond_alerts_5",
    title: "Alert Guardian",
    description: "Respond to 5 sensor alerts",
    icon: "🛡️",
    action: "respond_to_alert",
    target: 5,
    xpReward: 60,
  },

  // ── Session Challenges ──
  {
    id: "run_session_1",
    title: "Data Collector",
    description: "Complete 1 logging session",
    icon: "📊",
    action: "run_logging_session",
    target: 1,
    xpReward: 35,
  },
  {
    id: "run_sessions_3",
    title: "Session Pro",
    description: "Complete 3 logging sessions",
    icon: "📋",
    action: "run_logging_session",
    target: 3,
    xpReward: 75,
  },

  // ── Time-of-Day Challenges ──
  {
    id: "check_morning",
    title: "Morning Farmer",
    description: "Check your dashboard between 6–9 AM",
    icon: "🌅",
    action: "check_dashboard",
    target: 1,
    xpReward: 20,
  },
  {
    id: "check_evening",
    title: "Evening Roundup",
    description: "Check your dashboard between 5–8 PM",
    icon: "🌇",
    action: "check_dashboard",
    target: 1,
    xpReward: 20,
  },
];

// ── Seeded PRNG (mulberry32) ────────────────────────────────────
// Deterministic so all users get the same challenges each day.

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a numeric seed from a date string (YYYY-MM-DD). */
function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Fisher-Yates shuffle with a seeded PRNG. */
function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Generate today's 3 challenges for a user.
 * Same date → same challenges (deterministic).
 */
export function generateDailyChallenges(dateStr: string): DailyChallengeDef[] {
  const rng = mulberry32(dateSeed(dateStr));
  const shuffled = seededShuffle(CHALLENGE_POOL, rng);

  // Pick 3 ensuring variety — one from a different action type each
  const selected: DailyChallengeDef[] = [];
  const usedActions = new Set<ChallengeAction>();

  for (const challenge of shuffled) {
    if (selected.length >= 3) break;
    // Prefer variety, but don't block if we can't find unique actions
    if (!usedActions.has(challenge.action) || selected.length >= 2) {
      selected.push(challenge);
      usedActions.add(challenge.action);
    }
  }

  return selected;
}

/** Get today's challenges as a full DailyChallenges object. */
export function getTodayChallenges(existing?: DailyChallenges): DailyChallenges {
  const today = new Date().toISOString().split("T")[0]!;

  // If we already have today's challenges, return them
  if (existing?.date === today) return existing;

  // Generate fresh challenges for today
  const defs = generateDailyChallenges(today);
  return {
    date: today,
    challenges: defs.map((def) => ({
      challengeId: def.id,
      progress: 0,
      completed: false,
      claimed: false,
    })),
  };
}

/** Get a challenge definition by ID. */
export function getChallengeDef(id: string): DailyChallengeDef | undefined {
  return CHALLENGE_POOL.find((c) => c.id === id);
}

// ── XP Multiplier System ───────────────────────────────────────
// Login streaks grant increasingly powerful XP multipliers.
// This is the primary retention hook — longer streaks = more value.

const MULTIPLIER_TIERS: Array<{
  minStreak: number;
  multiplier: number;
  label: string;
  colorClass: string;
}> = [
  { minStreak: 0, multiplier: 1.0, label: "No Streak Bonus", colorClass: "text-slate-400" },
  { minStreak: 3, multiplier: 1.1, label: "🔥 3-Day: 1.1x XP", colorClass: "text-orange-400" },
  { minStreak: 7, multiplier: 1.25, label: "🔥 7-Day: 1.25x XP", colorClass: "text-orange-400" },
  { minStreak: 14, multiplier: 1.5, label: "🔥🔥 14-Day: 1.5x XP", colorClass: "text-red-400" },
  { minStreak: 30, multiplier: 2.0, label: "👑 30-Day: 2x XP", colorClass: "text-amber-400" },
];

/** Compute the XP multiplier from a login streak. */
export function getMultiplier(streak: number): XpMultiplier {
  let tier = MULTIPLIER_TIERS[0]!;
  for (const t of MULTIPLIER_TIERS) {
    if (streak >= t.minStreak) tier = t;
  }
  return {
    multiplier: tier.multiplier,
    label: tier.label,
    colorClass: tier.colorClass,
  };
}

/** Apply multiplier to a base XP amount and return the final value. */
export function applyMultiplier(baseXp: number, streak: number): number {
  const { multiplier } = getMultiplier(streak);
  return Math.round(baseXp * multiplier);
}

// ── Challenge Progress Helpers ──────────────────────────────────

/** Increment progress on a matching challenge. Returns true if newly completed. */
export function incrementChallengeProgress(
  state: DailyChallenges,
  action: ChallengeAction,
  sensor?: string,
  amount = 1
): { updated: DailyChallenges; newlyCompleted: string[] } {
  const newlyCompleted: string[] = [];
  const updatedChallenges = state.challenges.map((ch) => {
    if (ch.completed || ch.claimed) return ch;

    const def = getChallengeDef(ch.challengeId);
    if (!def || def.action !== action) return ch;

    // Sensor-specific challenges only match their sensor
    if (def.sensor && def.sensor !== sensor) return ch;

    const newProgress = Math.min(ch.progress + amount, def.target);
    const completed = newProgress >= def.target;

    if (completed && !ch.completed) {
      newlyCompleted.push(def.id);
    }

    return { ...ch, progress: newProgress, completed };
  });

  return {
    updated: { ...state, challenges: updatedChallenges },
    newlyCompleted,
  };
}
