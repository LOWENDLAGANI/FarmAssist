/**
 * useGamification.ts
 * ─────────────────────────────────────────────────────────────────
 * Central gamification hook — manages XP, levels, streaks,
 * achievements, and syncs state to Firebase RTDB.
 *
 * RTDB path: users/{uid}/gamification
 *
 * Exposes:
 *  • awardXp()        — grant XP and check for level-up / achievement unlocks
 *  • checkStreaks()   — evaluate daily login + optimal-day streaks
 *  • incrementStat()  — bump lifetime stats
 *  • unlockAchievement() — manually unlock an achievement
 *  • GamificationBar  — pre-computed display data for the UI
 * ─────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { onValue, set, update, type Unsubscribe } from "firebase/database";
import { gamificationRef } from "@/lib/firebaseConfig";
import {
  levelFromXp,
  xpProgress,
  levelTitle,
  totalXpForLevel,
  todayStr,
  isConsecutiveDay,
  isSameDay,
  defaultGamificationData,
  getAchievementDef,
  ACHIEVEMENTS,
  hasToastBeenShown,
  markToastShown,
} from "@/lib/gamification";
import type {
  GamificationData,
  AchievementId,
  AchievementToast,
  GamificationStats,
} from "@/types/gamification";
import type {
  DailyChallenges as DailyChallengesData,
  ChallengeAction,
} from "@/types/dailyChallenge";
import {
  getTodayChallenges,
  incrementChallengeProgress,
  getMultiplier,
} from "@/lib/dailyChallenges";

export interface GamificationBarData {
  xp: number;
  level: number;
  levelTitle: string;
  levelEmoji: string;
  xpCurrent: number;
  xpNeeded: number;
  xpRatio: number;
  loginStreak: number;
  optimalStreak: number;
  recentAchievement: AchievementToast | null;
  xpMultiplier: number;
}

export function useGamification(userId: string) {
  const [data, setData] = useState<GamificationData>(defaultGamificationData());
  const [recentAchievement, setRecentAchievement] = useState<AchievementToast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallengesData | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);
  const awardQueueRef = useRef<Array<{ amount: number; reason: string; icon: string }>>([]);
  const processingRef = useRef(false);

  const isGuest = !userId || userId.startsWith("guest-");

  // ── Show achievement toast (only once per achievement ever) ──
  const showToast = useCallback(
    (id: AchievementId, name: string, icon: string, xpReward: number) => {
      if (hasToastBeenShown(id)) return; // already shown before
      markToastShown(id);
      setRecentAchievement({ id, name, icon, xpReward });
      setTimeout(() => setRecentAchievement(null), 5000);
    },
    []
  );

  // ── Subscribe to Firebase gamification data ──
  useEffect(() => {
    if (isGuest) {
      setData(defaultGamificationData());
      setIsLoading(false);
      return;
    }

    try {
      unsubscribeRef.current = onValue(
        gamificationRef(userId),
        (snapshot) => {
          const raw = snapshot.val() as Partial<GamificationData> | null;
          if (raw) {
            setData({
              xp: raw.xp ?? 0,
              level: raw.level ?? 1,
              loginStreak: raw.loginStreak ?? 0,
              optimalStreak: raw.optimalStreak ?? 0,
              lastStreakDate: raw.lastStreakDate ?? "",
              achievements: raw.achievements ?? {},
              stats: {
                totalXpEarned: raw.stats?.totalXpEarned ?? 0,
                alertResponses: raw.stats?.alertResponses ?? 0,
                perfectDays: raw.stats?.perfectDays ?? 0,
                sessionsRun: raw.stats?.sessionsRun ?? 0,
                totalUptimeMinutes: raw.stats?.totalUptimeMinutes ?? 0,
              },
            });

            // Load daily challenges from Firebase or generate fresh ones
            const storedChallenges = raw.challenges as DailyChallengesData | undefined;
            const todayChallenges = getTodayChallenges(storedChallenges);
            setDailyChallenges(todayChallenges);

            // If challenges are new (different date), persist them
            if (!storedChallenges || storedChallenges.date !== todayChallenges.date) {
              update(gamificationRef(userId), {
                challenges: todayChallenges,
              }).catch(console.error);
            }
          } else {
            // First time — seed defaults
            const defaults = defaultGamificationData();
            set(gamificationRef(userId), defaults).catch(console.error);
            setData(defaults);
          }
          setIsLoading(false);
        },
        (err) => {
          console.error("[useGamification] Firebase read error:", err);
          setData(defaultGamificationData());
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("[useGamification] Failed to attach listener:", err);
      setData(defaultGamificationData());
      setIsLoading(false);
    }

    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [userId, isGuest]);

  // ── Award XP (applies streak multiplier automatically) ──
  const awardXp = useCallback(
    async (amount: number, reason: string, icon: string) => {
      if (isGuest || !userId) return;

      // Apply XP multiplier from login streak
      const { multiplier } = getMultiplier(data.loginStreak);
      const finalAmount = Math.round(amount * multiplier);

      const newXp = data.xp + finalAmount;
      const newLevel = levelFromXp(newXp);

      // Check for level-up achievement
      const levelAchievements: AchievementId[] = ["level_5", "level_10", "level_25"];
      const newAchievements: Record<string, unknown> = {};

      for (const id of levelAchievements) {
        if (newLevel >= parseInt(id.split("_")[1]!) && !data.achievements[id]) {
          const def = getAchievementDef(id);
          if (def) {
            newAchievements[`achievements/${id}`] = {
              unlocked: true,
              date: todayStr(),
            };
            // Show toast for level achievement (once only)
            showToast(id, def.name, def.icon, def.xpReward);
          }
        }
      }

      try {
        const updates: Record<string, unknown> = {
          xp: newXp,
          level: newLevel,
          "stats/totalXpEarned": (data.stats.totalXpEarned ?? 0) + finalAmount,
          ...newAchievements,
        };
        await update(gamificationRef(userId), updates);
      } catch (err) {
        console.error("[useGamification] Failed to award XP:", err);
      }
    },
    [userId, isGuest, data.xp, data.achievements, data.stats.totalXpEarned, data.loginStreak]
  );

  // ── Increment a stat counter ──
  const incrementStat = useCallback(
    async (stat: keyof GamificationStats, by = 1) => {
      if (isGuest || !userId) return;
      try {
        await update(gamificationRef(userId), {
          [`stats/${stat}`]: (data.stats[stat] ?? 0) + by,
        });
      } catch (err) {
        console.error("[useGamification] Failed to increment stat:", err);
      }
    },
    [userId, isGuest, data.stats]
  );

  // ── Manually unlock an achievement ──
  const unlockAchievement = useCallback(
    async (id: AchievementId) => {
      if (isGuest || !userId) return;
      if (data.achievements[id]?.unlocked) return; // already unlocked

      const def = getAchievementDef(id);
      if (!def) return;

      try {
        await update(gamificationRef(userId), {
          [`achievements/${id}`]: { unlocked: true, date: todayStr() },
        });
        // Award the XP bonus for the achievement
        await awardXp(def.xpReward, `Achievement: ${def.name}`, def.icon);

        // Show toast (once only)
        showToast(id, def.name, def.icon, def.xpReward);
      } catch (err) {
        console.error("[useGamification] Failed to unlock achievement:", err);
      }
    },
    [userId, isGuest, data.achievements, awardXp]
  );

  // ── Check & update streaks ──
  const checkStreaks = useCallback(
    async (allSensorsOptimal?: boolean) => {
      if (isGuest || !userId) return;

      const today = todayStr();
      const lastDate = data.lastStreakDate;

      // Already processed today
      if (isSameDay(lastDate, today)) return;

      let newLoginStreak = data.loginStreak;
      let newOptimalStreak = data.optimalStreak;

      // Login streak
      if (isConsecutiveDay(lastDate, today)) {
        newLoginStreak = data.loginStreak + 1;
      } else if (lastDate !== today) {
        newLoginStreak = 1; // streak broken or first time
      }

      // Optimal streak (only if all sensors are in range)
      if (allSensorsOptimal) {
        if (isConsecutiveDay(lastDate, today)) {
          newOptimalStreak = data.optimalStreak + 1;
        } else if (lastDate !== today) {
          newOptimalStreak = 1;
        }
      } else {
        newOptimalStreak = 0;
      }

      // Check streak achievement unlocks
      const streakAchievements: Array<{ id: AchievementId; days: number }> = [
        { id: "streak_3", days: 3 },
        { id: "streak_7", days: 7 },
        { id: "streak_14", days: 14 },
        { id: "streak_30", days: 30 },
      ];

      const newAchievements: Record<string, unknown> = {};
      for (const { id, days } of streakAchievements) {
        if (newLoginStreak >= days && !data.achievements[id]) {
          const def = getAchievementDef(id);
          if (def) {
            newAchievements[`achievements/${id}`] = {
              unlocked: true,
              date: today,
            };
            showToast(id, def.name, def.icon, def.xpReward);
          }
        }
      }

      // Check perfect day / perfect week
      if (newOptimalStreak === 1 && !data.achievements["perfect_day"]) {
        const def = getAchievementDef("perfect_day");
        if (def) {
          newAchievements["achievements/perfect_day"] = {
            unlocked: true,
            date: today,
          };
          showToast("perfect_day", def.name, def.icon, def.xpReward);
        }
      }
      if (newOptimalStreak >= 7 && !data.achievements["perfect_week"]) {
        const def = getAchievementDef("perfect_week");
        if (def) {
          newAchievements["achievements/perfect_week"] = {
            unlocked: true,
            date: today,
          };
          showToast("perfect_week", def.name, def.icon, def.xpReward);
        }
      }

      try {
        await update(gamificationRef(userId), {
          loginStreak: newLoginStreak,
          optimalStreak: newOptimalStreak,
          lastStreakDate: today,
          ...newAchievements,
        });
      } catch (err) {
        console.error("[useGamification] Failed to update streaks:", err);
      }
    },
    [userId, isGuest, data]
  );

  // ── Claim a daily challenge reward ──
  const claimChallenge = useCallback(
    async (challengeId: string) => {
      if (isGuest || !userId || !dailyChallenges) return;

      const ch = dailyChallenges.challenges.find((c) => c.challengeId === challengeId);
      if (!ch || !ch.completed || ch.claimed) return;

      const { getChallengeDef } = await import("@/lib/dailyChallenges");
      const def = getChallengeDef(challengeId);
      if (!def) return;

      // Mark as claimed
      const updatedChallenges = {
        ...dailyChallenges,
        challenges: dailyChallenges.challenges.map((c) =>
          c.challengeId === challengeId ? { ...c, claimed: true } : c
        ),
      };
      setDailyChallenges(updatedChallenges);
      await update(gamificationRef(userId), {
        challenges: updatedChallenges,
      }).catch(console.error);

      // Award the XP
      await awardXp(def.xpReward, def.title, def.icon);
    },
    [isGuest, userId, dailyChallenges, awardXp]
  );

  // ── Track challenge progress (called from outside) ──
  const trackChallengeProgress = useCallback(
    async (action: ChallengeAction, sensor?: string, amount = 1) => {
      if (isGuest || !userId || !dailyChallenges) return;

      const { updated, newlyCompleted } = incrementChallengeProgress(
        dailyChallenges,
        action,
        sensor,
        amount
      );

      setDailyChallenges(updated);
      await update(gamificationRef(userId), {
        challenges: updated,
      }).catch(console.error);

      // Show toast for newly completed challenges
      for (const id of newlyCompleted) {
        const { getChallengeDef } = await import("@/lib/dailyChallenges");
        const def = getChallengeDef(id);
        if (def) {
          setRecentAchievement({
            id: id as AchievementId,
            name: def.title,
            icon: def.icon,
            xpReward: def.xpReward,
          });
          setTimeout(() => setRecentAchievement(null), 5000);
        }
      }
    },
    [isGuest, userId, dailyChallenges]
  );

  // ── Auto-check achievements on mount / data change ──
  // Evaluates every stat-based achievement against current data and
  // batch-unlocks any that qualify. Runs once after Firebase data loads.
  const autoCheckedRef = useRef(false);
  useEffect(() => {
    if (isGuest || !userId || isLoading || autoCheckedRef.current) return;
    autoCheckedRef.current = true;

    (async () => {
      const toUnlock: AchievementId[] = [];
      const now = new Date();
      const hour = now.getHours();

      // ── Time-of-day ──
      if (hour >= 0 && hour < 5 && !data.achievements["night_owl"]) {
        toUnlock.push("night_owl");
      }
      if (hour >= 0 && hour < 6 && !data.achievements["early_bird"]) {
        toUnlock.push("early_bird");
      }

      // ── Alert response thresholds ──
      if (data.stats.alertResponses >= 5 && !data.achievements["alert_responder_5"]) {
        toUnlock.push("alert_responder_5");
      }
      if (data.stats.alertResponses >= 25 && !data.achievements["alert_responder_25"]) {
        toUnlock.push("alert_responder_25");
      }
      if (data.stats.alertResponses >= 50 && !data.achievements["alert_responder_50"]) {
        toUnlock.push("alert_responder_50");
      }

      // ── Data collection thresholds ──
      if (data.stats.sessionsRun >= 5 && !data.achievements["data_collector_5"]) {
        toUnlock.push("data_collector_5");
      }
      if (data.stats.sessionsRun >= 25 && !data.achievements["data_collector_25"]) {
        toUnlock.push("data_collector_25");
      }

      // ── Level milestones ──
      if (data.level >= 5 && !data.achievements["level_5"]) {
        toUnlock.push("level_5");
      }
      if (data.level >= 10 && !data.achievements["level_10"]) {
        toUnlock.push("level_10");
      }
      if (data.level >= 25 && !data.achievements["level_25"]) {
        toUnlock.push("level_25");
      }

      // ── Streak milestones ──
      if (data.loginStreak >= 3 && !data.achievements["streak_3"]) {
        toUnlock.push("streak_3");
      }
      if (data.loginStreak >= 7 && !data.achievements["streak_7"]) {
        toUnlock.push("streak_7");
      }
      if (data.loginStreak >= 14 && !data.achievements["streak_14"]) {
        toUnlock.push("streak_14");
      }
      if (data.loginStreak >= 30 && !data.achievements["streak_30"]) {
        toUnlock.push("streak_30");
      }

      // ── Perfect day / week ──
      if (data.optimalStreak >= 1 && !data.achievements["perfect_day"]) {
        toUnlock.push("perfect_day");
      }
      if (data.optimalStreak >= 7 && !data.achievements["perfect_week"]) {
        toUnlock.push("perfect_week");
      }

      if (toUnlock.length === 0) return;

      // Batch-unlock and persist
      const updates: Record<string, unknown> = {};
      let totalXpBonus = 0;
      let lastDef: ReturnType<typeof getAchievementDef> = undefined;

      for (const id of toUnlock) {
        const def = getAchievementDef(id);
        if (!def) continue;
        updates[`achievements/${id}`] = { unlocked: true, date: todayStr() };
        totalXpBonus += def.xpReward;
        lastDef = def;
      }

      // Apply accumulated XP bonus
      const newXp = data.xp + totalXpBonus;
      updates.xp = newXp;
      updates.level = levelFromXp(newXp);
      updates[`stats/totalXpEarned`] = (data.stats.totalXpEarned ?? 0) + totalXpBonus;

      try {
        await update(gamificationRef(userId), updates);
        // Show toast for each newly unlocked achievement (once only)
        for (const id of toUnlock) {
          const def = getAchievementDef(id);
          if (def) showToast(id, def.name, def.icon, def.xpReward);
        }
      } catch (err) {
        console.error("[useGamification] Auto-check failed:", err);
      }
    })();
  }, [userId, isGuest, isLoading, data]);

  // ── Display data (memoized) ──
  const barData: GamificationBarData = useMemo(() => {
    const level = levelFromXp(data.xp);
    const { current, needed, ratio } = xpProgress(data.xp);
    const { title, emoji } = levelTitle(level);
    const { multiplier } = getMultiplier(data.loginStreak);
    return {
      xp: data.xp,
      level,
      levelTitle: title,
      levelEmoji: emoji,
      xpCurrent: current,
      xpNeeded: needed,
      xpRatio: ratio,
      loginStreak: data.loginStreak,
      optimalStreak: data.optimalStreak,
      recentAchievement,
      xpMultiplier: multiplier,
    };
  }, [data.xp, data.loginStreak, data.optimalStreak, recentAchievement]);

  return {
    data,
    barData,
    isLoading,
    awardXp,
    incrementStat,
    unlockAchievement,
    autoCheckAchievements: () => { autoCheckedRef.current = false; },
    checkStreaks,
    recentAchievement,
    dailyChallenges,
    claimChallenge,
    trackChallengeProgress,
  };
}
