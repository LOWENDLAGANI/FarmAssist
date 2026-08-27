/**
 * lib/gamification.ts
 * ─────────────────────────────────────────────────────────────────
 * Gamification engine — level thresholds, XP definitions,
 * achievement catalog, and streak/XP calculation helpers.
 * ─────────────────────────────────────────────────────────────────
 */

import type {
  AchievementId,
  AchievementDef,
  GamificationData,
  GamificationStats,
} from "@/types/gamification";

// ── Level Thresholds ───────────────────────────────────────────
// Each level requires progressively more XP to reach.
// Formula: baseXP * level^1.5 (rounded)
const BASE_XP_PER_LEVEL = 100;

/** XP required to reach each level from the previous one. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(BASE_XP_PER_LEVEL * Math.pow(level - 1, 1.5));
}

/** Total XP needed to reach a given level from level 1. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += xpForLevel(i);
  }
  return total;
}

/** Compute the level for a given XP amount. */
export function levelFromXp(xp: number): number {
  let level = 1;
  let accumulated = 0;
  while (accumulated <= xp) {
    level++;
    accumulated += xpForLevel(level);
    if (level > 200) break; // safety cap
  }
  return level - 1;
}

/** XP progress within the current level (0 to 1). */
export function xpProgress(xp: number): { current: number; needed: number; ratio: number } {
  const level = levelFromXp(xp);
  const currentLevelStart = totalXpForLevel(level);
  const nextLevelStart = totalXpForLevel(level + 1);
  const current = xp - currentLevelStart;
  const needed = nextLevelStart - currentLevelStart;
  return { current, needed, ratio: needed > 0 ? current / needed : 1 };
}

// ── Level Titles ───────────────────────────────────────────────
const LEVEL_TITLES: Array<{ minLevel: number; title: string; emoji: string }> = [
  { minLevel: 1, title: "Seedling", emoji: "🌱" },
  { minLevel: 3, title: "Sprout", emoji: "🌿" },
  { minLevel: 5, title: "Grower", emoji: "🌾" },
  { minLevel: 8, title: "Cultivator", emoji: "🌻" },
  { minLevel: 12, title: "Green Thumb", emoji: "🪴" },
  { minLevel: 16, title: "Farmhand", emoji: "🧑‍🌾" },
  { minLevel: 20, title: "Harvest Master", emoji: "🌾" },
  { minLevel: 25, title: "Agronomist", emoji: "🔬" },
  { minLevel: 30, title: "Farm Legend", emoji: "🏆" },
];

export function levelTitle(level: number): { title: string; emoji: string } {
  let result = LEVEL_TITLES[0]!;
  for (const entry of LEVEL_TITLES) {
    if (level >= entry.minLevel) result = entry;
  }
  return { title: result.title, emoji: result.emoji };
}

// ── XP Award Definitions ───────────────────────────────────────
/** How much XP each action is worth. */
export const XP_VALUES = {
  /** Each minute a sensor stays in optimal range. */
  sensorOptimalPerMinute: 1,
  /** Responding to an alert (first action after alert). */
  alertResponse: 15,
  /** Starting a logging session. */
  sessionStart: 20,
  /** Completing a logging session (stopping it). */
  sessionComplete: 30,
  /** Daily login (once per day). */
  dailyLogin: 10,
  /** Perfect day — all sensors optimal for 24h. */
  perfectDay: 100,
  /** Streak milestone bonus (multiplicative with streak length). */
  streakBonus: 5,
  /** Pairing a new Rover for the first time. */
  firstPair: 50,
  /** Reading a recommendation. */
  recommendationRead: 5,
} as const;

// ── Achievement Catalog ────────────────────────────────────────
export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Pairing & Onboarding ──
  {
    id: "first_light",
    name: "First Light",
    description: "Pair your first Rover and see live data",
    icon: "💡",
    xpReward: 50,
  },
  {
    id: "first_pair",
    name: "Connected Farmer",
    description: "Successfully pair a Rover device",
    icon: "🔗",
    xpReward: 25,
  },

  // ── Alert Response ──
  {
    id: "alert_responder_5",
    name: "Quick Responder",
    description: "Respond to 5 sensor alerts",
    icon: "⚡",
    xpReward: 30,
  },
  {
    id: "alert_responder_25",
    name: "Alert Veteran",
    description: "Respond to 25 sensor alerts",
    icon: "🎖️",
    xpReward: 75,
  },
  {
    id: "alert_responder_50",
    name: "Guardian Angel",
    description: "Respond to 50 sensor alerts",
    icon: "😇",
    xpReward: 150,
  },

  // ── Streaks ──
  {
    id: "streak_3",
    name: "Getting Consistent",
    description: "Maintain a 3-day login streak",
    icon: "🔥",
    xpReward: 25,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day login streak",
    icon: "🔥",
    xpReward: 50,
  },
  {
    id: "streak_14",
    name: "Unstoppable",
    description: "Maintain a 14-day login streak",
    icon: "💥",
    xpReward: 100,
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintain a 30-day login streak",
    icon: "👑",
    xpReward: 250,
  },

  // ── Perfect Days ──
  {
    id: "perfect_day",
    name: "Perfect Day",
    description: "Keep all sensors in range for a full day",
    icon: "✨",
    xpReward: 50,
  },
  {
    id: "perfect_week",
    name: "Perfect Week",
    description: "7 consecutive perfect days",
    icon: "🌈",
    xpReward: 200,
  },

  // ── Sensor Mastery ──
  {
    id: "sensor_master",
    name: "Sensor Master",
    description: "Keep all 4 sensors in range for 24 hours straight",
    icon: "🎯",
    xpReward: 75,
  },
  {
    id: "water_guardian",
    name: "Water Guardian",
    description: "Never let water level drop below 20% for 7 days",
    icon: "💧",
    xpReward: 60,
  },
  {
    id: "temperature_tamer",
    name: "Temperature Tamer",
    description: "Keep temperature in range for 7 days straight",
    icon: "🌡️",
    xpReward: 60,
  },
  {
    id: "green_thumb",
    name: "Green Thumb",
    description: "Keep soil moisture optimal for 7 days straight",
    icon: "🌿",
    xpReward: 60,
  },

  // ── Data Collection ──
  {
    id: "data_collector_5",
    name: "Data Enthusiast",
    description: "Complete 5 logging sessions",
    icon: "📊",
    xpReward: 40,
  },
  {
    id: "data_collector_25",
    name: "Data Scientist",
    description: "Complete 25 logging sessions",
    icon: "🔬",
    xpReward: 100,
  },

  // ── Time of Day ──
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Check your dashboard between midnight and 5 AM",
    icon: "🦉",
    xpReward: 15,
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Check your dashboard before 6 AM",
    icon: "🐦",
    xpReward: 15,
  },

  // ── Level Milestones ──
  {
    id: "level_5",
    name: "Growing Fast",
    description: "Reach level 5",
    icon: "⬆️",
    xpReward: 50,
  },
  {
    id: "level_10",
    name: "Double Digits",
    description: "Reach level 10",
    icon: "🔟",
    xpReward: 100,
  },
  {
    id: "level_25",
    name: "Quarter Century",
    description: "Reach level 25",
    icon: "🏅",
    xpReward: 250,
  },
];

/** Lookup an achievement definition by ID. */
export function getAchievementDef(id: AchievementId): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Default (empty) gamification data for new users. */
export function defaultGamificationData(): GamificationData {
  return {
    xp: 0,
    level: 1,
    loginStreak: 0,
    optimalStreak: 0,
    lastStreakDate: "",
    achievements: {},
    stats: {
      totalXpEarned: 0,
      alertResponses: 0,
      perfectDays: 0,
      sessionsRun: 0,
      totalUptimeMinutes: 0,
    },
  };
}

/** Get today as an ISO date string (YYYY-MM-DD). */
export function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

/** Check if two date strings are consecutive days. */
export function isConsecutiveDay(prev: string, current: string): boolean {
  if (!prev || !current) return false;
  const d1 = new Date(prev + "T12:00:00Z");
  const d2 = new Date(current + "T12:00:00Z");
  const diffMs = d2.getTime() - d1.getTime();
  return diffMs > 0 && diffMs <= 86400000 * 1.1; // allow slight timezone drift
}

/** Check if two date strings are the same day. */
export function isSameDay(a: string, b: string): boolean {
  return a === b;
}

// ── Shown-Toast Persistence ──────────────────────────────────────
// Tracks which achievement toasts have already been shown to the
// user so they only see each one once, even across page reloads.

const SHOWN_TOASTS_KEY = "farmassist-shown-toasts";

/** Get the set of achievement IDs whose toasts have already been shown. */
export function getShownToasts(): Set<string> {
  try {
    const raw = localStorage.getItem(SHOWN_TOASTS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Mark an achievement toast as shown (persisted in localStorage). */
export function markToastShown(id: string): void {
  try {
    const shown = getShownToasts();
    shown.add(id);
    localStorage.setItem(SHOWN_TOASTS_KEY, JSON.stringify([...shown]));
  } catch {
    // localStorage unavailable — fail silently
  }
}

/** Check if a toast has already been shown. */
export function hasToastBeenShown(id: string): boolean {
  return getShownToasts().has(id);
}
